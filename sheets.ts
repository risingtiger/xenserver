



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { SheetsTransactionT, QuickNoteT } from './defs.js'

// Mapping of spreadsheet account names to display names
const ACCOUNT_ID_MAP: {[key: string]: string[]} = {
    "CHECKING PERSONA": [ "91bee654-700c-4694-a2b1-2498ef734397" ], // checkpers
    "MAIN BUCKET SAV": [ "0f4533f9-8e34-4303-b0ac-d94584db2241" ], // savebucket
    "VISA FAMILY": [ "47c009d5-31e2-44eb-b077-04858635299e" ], // visafam
	"CHASE": [ "be68e35d-b273-43c4-98ba-ebe572e7da8e" ], // chasecc
};

const spreadsheetId = '1JtnmJL642Vuu8ajPLMyyqMbHP7FtddtmxHExsUAekEA';




const Get_Latest_Transactions = (db:any, sheets:any, user_email:string) => new Promise<any[] | null>(async (res, rej)=> {

	debugger

	let ignored_transaction_sheets_ids: string[] = []
	let existing_transactions_sheets_ids: any[]  = []
	let quick_notes: QuickNoteT[]                = []
	let cats:any[]                               = []
	let sheetspullinfo:any                       = {}
	let sheet_transactions:any[]                 = []

	const three_months_ago = Math.floor(Date.now() / 1000) - (3 * 30 * 24 * 60 * 60); // 3 months in seconds
	const five_months_ago = Math.floor(Date.now() / 1000) - (5 * 30 * 24 * 60 * 60);

	try {
		const ignored_transactions_promise  = db.collection("ignored_transactions").where("ts", ">=", three_months_ago).orderBy("ts", "desc").get()
		//const existing_transactions_promise = db.collection("transactions").where("date", ">=", three_months_ago).orderBy("date", "desc").get()
		const existing_transactions_promise = db.collection("transactions").where("date", ">=", five_months_ago).orderBy("date", "desc").get()
		const quick_notes_promise           = db.collection("quick_notes").where("ts", ">=", three_months_ago).orderBy("ts", "desc").get()
		const cats_promise                  = db.collection("cats").get()
		const sheetspullinfo_promise        = db.collection("generaldata").doc('sheetspull').get()
		
		const [ignored_transactions_snap, existing_transactions_snap, quick_notes_snap, cats_snap, sheetspullinfo_snap] = await Promise.all([
			ignored_transactions_promise, 
			existing_transactions_promise, 
			quick_notes_promise,
			cats_promise,
			sheetspullinfo_promise
		]);
		
		ignored_transaction_sheets_ids   = ignored_transactions_snap.docs.map((m: any) => m.data().sheets_id);
		existing_transactions_sheets_ids = existing_transactions_snap.docs.map((m: any) => m.data().sheets_id || '');
		quick_notes                      = quick_notes_snap.docs.map((m: any) => ({ id: m.id, ...m.data() })) as QuickNoteT[];
		cats                             = cats_snap.docs.map((m: any) => ({ id: m.id, ...m.data() }));
		sheetspullinfo                   = sheetspullinfo_snap.data() || {};

	} catch (e) {
		rej(); return;
	}

	try { 
		const sheet_transactions_r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `BSA_Transactions!A${sheetspullinfo.rowstart}:F100000` });
		sheet_transactions         = sheet_transactions_r.data.values || [];
	}
	catch (e) { rej(); return; }

	const transactions: SheetsTransactionT[] = []
	
	for(let i = 0; i < sheet_transactions.length; i++) {

		const t = sheet_transactions[i];
		
		if (!t || t.length !== 6) continue;
		
		const sheets_id = t[4];

		if (existing_transactions_sheets_ids.includes(sheets_id) || ignored_transaction_sheets_ids.includes(sheets_id)) {
			continue;
		}
		
		const date_str           = t[0] || '';
		const [year, month, day] = date_str.split('-').map(Number);
		const date_timestamp     = Date.UTC(year, month - 1, day, 12) / 1000; // make sure its going to show same day whether in UTC or local
		
		const amount_str         = t[1] || '0';
		if (!amount_str.includes('(')) continue; // skip anything except debits

		const amount             = Math.abs(parseFloat(amount_str.replace(/[$\(\)]/g, '')));
		
		const account_name       = t[5] || '';
		const account_mapping    = ACCOUNT_ID_MAP[account_name];
		const source_id          = account_mapping ? account_mapping[0] : null;

		if (!source_id) { console.log(sheets_id + "skipped because no source id");   continue;   }

		const quicknote_result = handle_quick_notes(user_email, date_timestamp, amount, quick_notes);
		
		const transaction: SheetsTransactionT = {
			id: sheets_id,
			date: date_timestamp,
			amount: amount,
			merchant: t[2] || '', 
			merchant_long: t[2] || '', 
			notes: quicknote_result || '',
			source_id: source_id,
			tags: []
		};
		
		transactions.push(transaction);
	}

	res(transactions);
})








const Get_Balances = (sheets:any) => new Promise<any[] | null>(async (res, _rej)=> {

	const spreadsheetId = '1UnFSxy2S6y4fkH35vNg4ASx2hugDpCyoMf2m7pPloUA';
	let response:any = {}
	
	try {
		response = await sheets.spreadsheets.values.get({
			spreadsheetId,
			range: 'BSA_Balances!A2:I20',
		})
	} 
	catch {
		res(null);
		return;
	}
	
	const rows = response.data.values as any[]

	const balances:Map<string, {id:string, balance:number}> = new Map();
	
	for(let i = 0; i < rows.length; i++) {
		const row     = rows[i];
		const account = ACCOUNT_ID_MAP[row[6]]

		if (!account) continue;

		const x = {
			id: account[0],  
			balance: parseFloat( row[1].replace(/[$\(\),]/g, ''))
		}

		balances.set(row[6], x);
	}

	const returnbalances:any[] = [];
	for (const [_key, value] of balances) {
		returnbalances.push(value);
	}
	res(returnbalances);
})




function handle_quick_notes(user:string, date: number, amount:number, quick_notes: QuickNoteT[]) : string {

	// quick notes currently does have the OPTION of childcatname and parentcatname, but we aren't using it. probably will delete that from QuickNoteT type

	let note = ''

	quick_notes.forEach(qn => {

		if (!qn.user) qn.user = 'hammonlaura@gmail.com' // temporary. will remove after a bit

		if (user !== 'rfs@risingtiger.com' && qn.user === 'rfs@risingtiger.com') return '';

		const three_days_in_seconds = 4 * 24 * 60 * 60;
		const one_day_in_seconds    = 1 * 24 * 60 * 60;
		if (( date > qn.ts - one_day_in_seconds && date < qn.ts + three_days_in_seconds) && (qn.amount == amount)) {
			note = qn.note;
		}
	});

	return note;
}






const Sheets = { 
    Get_Latest_Transactions, Get_Balances
};

export default Sheets;


