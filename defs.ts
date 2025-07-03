

import { bool, str, num } from './defs_server_symlink.js'



export type SheetsTransactionT = {
	id: string,
	date: number, // Unix timestamp in seconds
	amount: number, // Postive amount in two decimal places
	merchant: string, // Shorter merchant name
	merchant_long: string, // Shorter merchant name
	notes: string,
	source_id: string|null,
	tags: string[],
}

export type SaveNewTransactionServerT = {
    amount: number,
	cat: string,
	date: number,
    merchant: string,
    notes: string
    source: string,
	tags: string[],
    sheets_id: string|null,
}
