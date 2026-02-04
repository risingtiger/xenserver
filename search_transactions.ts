//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { TransactionT } from './defs.js'



type fieldnames = 'amount'|'merchant'|'notes'|'source';
type SearchCriteriaT = { field: fieldnames, val: string|number }


export const SearchTransactions = (db:any, firestore:any, search_criterias: SearchCriteriaT[]) => new Promise<TransactionT[]>(async (res, rej)=> {

	let validatedCriteria:any
	let snapshot:any;

	try { validatedCriteria = validateSearchCriteria(search_criterias); }
	catch (err) { rej(err); return; }

	try { snapshot = await db.collection('transactions').limit(10000).get(); }
	catch (err) { rej(err); return; }

	if (!snapshot || !Array.isArray(snapshot.docs)) { res([]); return; }

	const transactions: TransactionT[] = snapshot.docs.map((doc:any) => {

		const transaction = { ...doc.data(), id: doc.id } as TransactionT;
		if (transaction.merchant === undefined || transaction.merchant === null) debugger
		transaction.merchant = transaction.merchant.toLowerCase();
		transaction.notes    = transaction.notes.toLowerCase();
		return transaction;
	});

	if (validatedCriteria.length === 0) { res(transactions); return; }


	const filteredResults = validatedCriteria.reduce((acc:any, criteria:any) => {

		return acc.filter((transaction:any) => {

			if (criteria.field === 'amount') {
				return transaction.amount === criteria.val;
			}

			else if (criteria.field === 'merchant') {
				return transaction.merchant.includes(criteria.val);
			}

			else if (criteria.field === 'notes') {
				return transaction.notes.includes(criteria.val);
			}

			else if (criteria.field === 'source') {
				const source = transaction.source?._path?.segments[1] ?? "";
				return source === criteria.val;
			}

			return false;
		});
	}, transactions).sort((a:any, b:any) => b.date - a.date);

	res(filteredResults.map(( fr:any )=> firestore.ParseDocDataForClient(fr)))
})




const validateSearchCriteria = (search_criterias: SearchCriteriaT[]): Array<{ field: 'amount'|'merchant'|'notes'|'source', val: string|number }> => {

	if (!Array.isArray(search_criterias) || search_criterias.length === 0) throw new Error('search_criterias must contain at least one item');

	const validatedCriteria: Array<{ field: fieldnames, val: string|number }> = [];
	const acceptedFields = new Set<fieldnames>(['amount', 'merchant', 'notes', 'source']);

	for (const criteria of search_criterias) {

		if (!criteria || typeof criteria.field !== 'string') throw new Error('Invalid search criteria');

		const { field, val } = criteria;

		if (!acceptedFields.has(field)) throw new Error(`Unsupported search field: ${field}`);

		if (field === 'amount') {
			if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) throw new Error('Amount must be a finite number');
			validatedCriteria.push({ field: 'amount', val: val });
			continue;
		}

		if (field === 'merchant') {
			if (typeof val !== 'string' || val.length >= 64) throw new Error('Merchant length must be less than 64 characters');
			validatedCriteria.push({ field: 'merchant', val: val.toLowerCase() });
			continue;
		}

		if (field === 'notes') {
			if (typeof val !== 'string' || val.length >= 128) throw new Error('Notes length must be less than 128 characters');
			validatedCriteria.push({ field: 'notes', val: val.toLowerCase() });
			continue;
		}

		if (field === 'source') {
			if (typeof val !== 'string' || val.length < 32) throw new Error('Source ID must be a string');
			validatedCriteria.push({ field: 'source', val });
			continue;
		}
	}

	if (validatedCriteria.length === 0) throw new Error('No valid search criteria provided');

	return validatedCriteria;
}

