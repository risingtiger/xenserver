



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

	debugger

	let response:any = {}
	
	try   {  response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Transactions!A2:N500' }) } 
	catch {  rej(); return; }
	
	const rows           = response.data.values as any[]
	const transactions   : SheetsTransactionT[] = []
	
	for(let i = 0; i < rows.length; i++) {
		const row = rows[i];
		
		if (!row || row.length < 13) continue;
		

		/*
		export type SheetsTransactionT = {
			transaction_id: string,
			preset_area_id: string | null,
			preset_cat_name: string | null,
			date: number, // Unix timestamp in seconds
			amount: number, // Postive amount in two decimal places
			merchant: string, // Shorter merchant name
			notes: string,
			source_id: string|null,
			tags: string[],
		}

		Header columns: get_sheets_transactions	Date	Description	Category	Amount	Account	Account #	Institution	Currency	Channel	Sheetsync Category	Sheetsync Subcategory	Full Description	Transaction ID
		*/
		
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


