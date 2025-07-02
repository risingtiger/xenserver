

import { bool, str, num } from './defs_server_symlink.js'


/*
export type YnabTransactionT = {
	ynab_id: string,
	preset_area_id: string,
	preset_cat_name: string | null,
	date: number
	amount: number,
	merchant: string,
	notes: string,
	source_id: string,
	tags: string[],
}
*/

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

export type SaveNewTransactionServerT = {
    amount: number,
	cat: string,
	date: number,
    merchant: string,
    notes: string
    source: string,
	tags: string[],
    ynab_id: string|null,
}
