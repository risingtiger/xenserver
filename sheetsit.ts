



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { SheetsTransactionT } from './defs.js'

// Mapping of spreadsheet account names to display names
const ACCOUNT_ID_MAP: {[key: string]: string[]} = {
    "CHECKING PERSONA": [ "91bee654-700c-4694-a2b1-2498ef734397" ], // checkpers
    "MAIN BUCKET SAV": [ "0f4533f9-8e34-4303-b0ac-d94584db2241" ], // savebucket
    "VISA FAMILY": [ "47c009d5-31e2-44eb-b077-04858635299e" ], // visafam
	"CHASE CREDIT CARD": [ "be68e35d-b273-43c4-98ba-ebe572e7da8e" ], // chasecc
};

const spreadsheetId = '1YHRpv9RczYKqKuvT9zsbq7zIDkozjRpYDDEHxvmQAjw';




const Get_Latest_Transactions = (db:any, sheets:any) => new Promise<any[] | null>(async (res, rej)=> {

	let ignored_transaction_sheets_ids: string[] = []
	let existing_transactions_sheets_ids: any[] = []
	let quick_notes: any[] = []
	let sheet_transactions:any[] = []

	try {
		const ignored_transactions_promise  = db.collection("ignored_transactions").orderBy("ts", "desc").limit(100).get()
		const existing_transactions_promise = db.collection("transactions").orderBy("date", "desc").limit(300).get()
		const quick_notes_promise           = db.collection("quick_notes").orderBy("ts", "desc").limit(200).get()
		const sheet_transactions_promise	= sheets.spreadsheets.values.get({ spreadsheetId, range: 'Transactions!A2:N300' })
		
		const [ignored_transactions_snap, existing_transactions_snap, quick_notes_snap, sheet_transactions_snap] = await Promise.all([
			ignored_transactions_promise, 
			existing_transactions_promise, 
			quick_notes_promise,
			sheet_transactions_promise
		]);
		
		ignored_transaction_sheets_ids   = ignored_transactions_snap.docs.map((m: any) => m.data().sheets_id);
		existing_transactions_sheets_ids = existing_transactions_snap.docs.map((m: any) => m.data().sheets_id || '');
		quick_notes						 = quick_notes_snap.docs.map((m: any) => ({ id: m.id, ...m.data() }));
		sheet_transactions               = sheet_transactions_snap.data.values || [];

	} catch {
		rej(); return;
	}

	const transactions   : SheetsTransactionT[] = []
	
	for(let i = 0; i < sheet_transactions.length; i++) {
		const t = sheet_transactions[i];
		
		if (!t || t.length < 14 || !t[13]) continue;
		
		const sheets_id = t[13];

		if (existing_transactions_sheets_ids.includes(sheets_id) || ignored_transaction_sheets_ids.includes(sheets_id)) {
			continue;
		}
		
		const date_str        = t[1] || '';
		const [month, day, year] = date_str.split('/').map(Number);
		const d				  = new Date(year+"-"+month+day)
		// const date_timestamp  = new Date(year+"-"+month+day) / 1000;
		
		const amount_str      = t[4] || '0';
		const amount          = Math.abs(parseFloat(amount_str.replace(/[$,]/g, '')));
		
		const account_name    = t[5] || '';
		const account_mapping = ACCOUNT_ID_MAP[account_name];
		const source_id       = account_mapping ? account_mapping[0] : null;

		if (!source_id) { console.log(sheets_id + "skipped because no source id");   continue;   }
		
		const transaction: SheetsTransactionT = {
			id: sheets_id,
			date: date_timestamp,
			amount: amount,
			merchant: t[2] || '', 
			merchant_long: t[12] || '', 
			notes: '', 
			source_id: source_id,
		};

		handle_quick_notes(transaction, quick_notes);
		
		transactions.push(transaction);
	}

	function handle_quick_notes(sheets_t: SheetsTransactionT, quick_notes: any[]) {
		quick_notes.forEach(qn => {
			const six_days = 518400; // 6 days in seconds
			if ((qn.ts > sheets_t.date - six_days && qn.ts < sheets_t.date + six_days) && (qn.amount === sheets_t.amount)) {
				sheets_t.notes = qn.notes;
			}
		});
	}

	res(transactions);
})




const Get_Balances = (sheets:any) => new Promise<any[] | null>(async (res, _rej)=> {

	const spreadsheetId = '1YHRpv9RczYKqKuvT9zsbq7zIDkozjRpYDDEHxvmQAjw';
	let response:any = {}
	
	try {
		response = await sheets.spreadsheets.values.get({
			spreadsheetId,
			range: 'Balance History!A2:G20',
		})
	} 
	catch {
		res(null);
		return;
	}
	
	const rows = response.data.values as any[]

	let datestr = ""
	const balances:any[] = []
	
	for(let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (datestr === "") datestr = row[1]

		if (row[1] !== datestr)   break; 

		const auxinfo = ACCOUNT_ID_MAP[row[2]]

		if (!auxinfo) break;

		const x = {
			source_id: auxinfo[0],  
			balance: parseFloat( row[4].slice(1) ) 
		}

		balances.push(x)
	}

	res(balances);
})







const SheetsIt = { 
    Get_Latest_Transactions, Get_Balances
};

export default SheetsIt;


