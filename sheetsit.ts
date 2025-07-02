



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




const Get_Latest_Transactions = (sheets:any) => new Promise<any[] | null>(async (res, rej)=> {

	let response:any = {}
	
	try   {  response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Transactions!A2:N500' }) } 
	catch {  rej(); return; }
	
	const rows           = response.data.values as any[]
	const transactions   : SheetsTransactionT[] = []
	
	for(let i = 0; i < rows.length; i++) {
		const row = rows[i];
		
		if (!row || row.length < 13) continue;
		
		const date_str = row[1] || '';
		const date_obj = new Date(date_str);
		const date_timestamp = Math.floor(date_obj.getTime() / 1000);
		
		const amount_str = row[4] || '0';
		const amount = Math.abs(parseFloat(amount_str.replace(/[$,]/g, '')));
		
		const account_name = row[5] || '';
		const account_mapping = ACCOUNT_ID_MAP[account_name];
		const source_id = account_mapping ? account_mapping[0] : null;

		if (!source_id) {   continue;   }
		
		const transaction: SheetsTransactionT = {
			sheets_id: row[13],
			preset_cat_name: row[3] || null, 
			date: date_timestamp,
			amount: amount,
			merchant: row[2] || '', 
			merchant_long: row[12] || '', 
			notes: '', 
			source_id: source_id,
		};
		
		transactions.push(transaction);
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


