



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import {  } from './defs.js'
import { str } from './defs_server_symlink.js'
//@ts-ignore




type ParseAppleReturnT = { amount:number, date: number, merchant: string }
const ParseApple = (db:any, gemini:any, apple_data:string) => new Promise<ParseAppleReturnT[]|null>(async (res, _rej)=> {

	const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toISOString().split('T')[1].substring(0, 8)

	const instructions = `
		## Instructions
		- The following is text of Apple Card transactions. 
		- Parse each one. Retrieve the date, merchant name, amount. Ignore any text that is not a transaction 
		- Date is in either date format of M/D/YY or relative to ${now} UTC, e.g. Friday, Yesterday, 12 hours ago.
		- Convert the date to ISO 8601 format, e.g. 2025-09-12, drop the time part, just keep the date. 
		- All time is in UTC
		- now is ${now} UTC
		- Return the parsed data in CSV format with the following columns: date, merchant, amount
		- ONLY return the CSV data, nothing else.
	`;

	const r = await gemini.models.generateContent({
		model: 'gemini-2.5-flash',
		contents: instructions + "\n\n\n" + apple_data,
	})

	if (!r.text.startsWith('date')) {
		const pos = r.text.indexOf('date')
		if (pos > -1) {
			r.text = r.text.substring(pos)
		} else {
			r.text = 'date,merchant,amount\n' + r.text
		}
	}


	if (r.ok && !r.ok)          { res([]); return; }
	if (r.text.length < 24) { res([]); return; }

	const csvlines = r.text.trim().split('\n');

	if (csvlines.length < 2)    { res([]); return; }

	const newtransactions:any[] = [];
	
	for (let i = 1; i < csvlines.length; i++) { // skip header
		const line = csvlines[i].trim();
		if (!line) continue;
		
		const parts = line.split(',');
		if (parts.length !== 3) continue;

		const datestr = parts[0];
		const merchant = parts[1];
		const amount = parseFloat(parts[2]);

		if (isNaN(amount)) continue;
		if (amount < 0) continue; // Skip negative amounts
		if ( !( datestr.includes('2025') || datestr.includes('2026') || datestr.includes('2027') || datestr.includes('2028') || datestr.includes('2029') ) ) continue; // Skip dates not in the future
		if (!datestr.includes('-')) continue; // Skip dates not in the format YYYY-MM-DD
		
		const dateObj = new Date(datestr);
		const timestamp = Math.floor(dateObj.getTime() / 1000);
		
		const transaction:any = {
			amount: amount,
			date: timestamp,
			merchant: merchant,
		}
		
		newtransactions.push(transaction);
	}

	if (newtransactions.length === 0) { res([]); return; }

	const thirtydaysago = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
	const collection = db.collection("transactions");
	const snapshot = await collection.where("ts", ">=", thirtydaysago).get();
	const existingtransactions = snapshot.docs.map((doc: any) => doc.data());

	const filteredtransactions = newtransactions.filter(newTx => {
		return !existingtransactions.some(( existingTx:any ) => {
			const amountMatches = Math.abs(existingTx.amount - newTx.amount) < 0.01;
			const dateMatches = existingTx.date === newTx.date;
			return amountMatches && dateMatches;
		});
	}).sort((a:any, b:any) => { 
		if (a.date < b.date) return -1;
		if (a.date > b.date) return 1;
		return 0;
	});

	res(filteredtransactions) 
})




const ChatAboutTransactions = (db:any, gemini:any, userQuery:string) => new Promise<any>(async (res, _rej)=> {

	const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);

	const [catsSnapshot, areasSnapshot, transactionsSnapshot] = await Promise.all([
		db.collection("cats").get(),
		db.collection("areas").get(),
		db.collection("transactions").where("ts", ">=", oneYearAgo).get()
	])

	const cats  = catsSnapshot.docs.map((t:any)  => ({ id: t.id, ...t.data()}))
	const areas = areasSnapshot.docs.map((t:any) => ({ id: t.id, ...t.data()}))

	const transactions = transactionsSnapshot.docs.map((doc: any) => {
		const data = doc.data()

		const category_id = data.cat._path.segments[1]
		const cat = cats.find((c:any) => c.id === category_id)

		const parent_category_id = cat.parent._path.segments[1]
		const parentcat = cats.find((c:any) => c.id === parent_category_id)

		const area_id = parentcat.area.__path[1]
		const area = areas.find((a:any) => a.id === area_id)
		
		return {
			id: doc.id,
			date: new Date(data.date * 1000).toISOString().split('T')[0],
			merchant: data.merchant || "Unknown",
			amount: data.amount || 0,
			notes: data.notes || "",
			parent_category: parentcat.name,
			category: cat.name,
			area: area.name,
		};
	})

	transactions.sort((a:any, b:any) => {
		if (a.date < b.date) return 1;
		if (a.date > b.date) return -1;
		return 0;
	});
	
	let   transactionsContext = `ID,Date,Merchant,Amount,ParentCategory,Category,Area,Notes\n`
	const data = transactions.map((t:any) => 
		`${t.id},${t.date},${t.merchant},${t.amount.toFixed(2)},${t.parent_category},${t.category},${t.area},${t.notes}`
	).join('\n');
	
	const instructions = `
		## Instructions
		- You are a financial assistant analyzing transaction data.
		- Below is a list of recent transactions from the user's financial accounts.
		- The user is asking a question about their transactions.
		- Provide a helpful, concise response based on the transaction data.
		- You can analyze spending patterns, identify top merchants, calculate category totals, area totals, etc.
		- If the user asks about specific merchants, categories, subcategories, or areas, focus on those.
		- Format currency values as $XX.XX
		- Be conversational but precise with numbers and dates.
		- Areas represent areas of life: 'fam' is family, 'pers' is personal, 'rtm' is a home business
		- transaction data is passed in as CSV. First row is header
		
		## Question:
		${userQuery}
	`;
	
	// Get response from Gemini
	const r = await gemini.models.generateContent({
		model: 'gemini-2.0-flash-001',
		contents: instructions + "\n\n### Transactions CSV:\n" + transactionsContext + data,
	});
	
	if (!r || !r.text) {
		res({ answer: "Sorry, I couldn't analyze your transactions at this time." });
		return;
	}
	
	res({ 
		answer: r.text.trim(),
		transactionCount: transactions.length
	});
})




/*
const _ChatAboutTransactions = (db:any, gemini:any, userQuery:string) => new Promise<any>(async (res, _rej)=> {

	debugger
	
	const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
	
	// Fetch all data concurrently using Promise.all
	const [catsSnapshot, areasSnapshot, transactionsSnapshot] = await Promise.all([
		db.collection("cats").get(),
		db.collection("areas").get(),
		db.collection("transactions").where("ts", ">=", oneYearAgo).get()
	]);
	
	// Create maps for quick lookups
	const catsMap = new Map();
	const areasMap = new Map();
	const catToAreaMap = new Map();
	const parentCatsMap = new Map();
	const subCatToParentMap = new Map();
	
	// First pass: Process all categories
	catsSnapshot.forEach((doc: any) => {
		const catData = doc.data();
		const catId = doc.id;
		const catName = catData.name || "Unknown Category";
		
		catsMap.set(catId, catName);
		
		// Store parent categories and their areas
		if (!catData.parent) {
			// This is a parent category
			if (catData.area && typeof catData.area.path === 'string') {
				const areaId = catData.area.path.split('/').pop();
				catToAreaMap.set(catId, areaId);
			}
		} else {
			// This is a subcategory, store its parent reference
			if (typeof catData.parent.path === 'string') {
				const parentId = catData.parent.path.split('/').pop();
				subCatToParentMap.set(catId, parentId);
			}
		}
	});
	
	// Second pass: Map subcategories to their parent's area
	subCatToParentMap.forEach((parentId, subCatId) => {
		const areaId = catToAreaMap.get(parentId);
		if (areaId) {
			catToAreaMap.set(subCatId, areaId);
		}
	});
	
	// Process areas
	areasSnapshot.forEach((doc: any) => {
		const areaData = doc.data();
		areasMap.set(doc.id, areaData.name || "Unknown Area");
	});
	
	if (transactionsSnapshot.empty) {
		res({ answer: "No transactions found in the last year." });
		return;
	}
	
	const transactions = transactionsSnapshot.docs.map((doc: any) => {
		const data = doc.data();
		const date = new Date(data.date * 1000).toISOString().split('T')[0];
		
		// Get category ID and name (subcategory)
			// Get parent category
			const parentId = subCatToParentMap.get(subCategoryId);
			if (parentId) {
				categoryName = catsMap.get(parentId) || "Unknown Category";
				
				// Get the area for this parent category
				const parentcat = 
				const areaId = catToAreaMap.get(parentId);
				if (areaId) {
					areaName = areasMap.get(areaId) || "Unknown Area";
				}
			}
		}
		
		let sourceName = "Unknown";
		if (data.source && typeof data.source.path === 'string') {
			sourceName = data.source.path.split('/').pop();
		}
		
		return {
			id: doc.id,
			date: date,
			merchant: data.merchant || "Unknown",
			amount: data.amount || 0,
			category: categoryName,
			subCategory: subCategoryName,
			area: areaName,
		};
	});
	
	// Sort transactions by date (newest first)
	transactions.sort((a:any, b:any) => {
		if (a.date < b.date) return 1;
		if (a.date > b.date) return -1;
		return 0;
	});
	
	let   transactionsContext = `Date,Merchant,Amount,Category,SubCategory,Area,Source\n`
	const data = transactions.map((t:any) => 
		`${t.date},${t.merchant},${t.amount.toFixed(2)},${t.category},${t.subCategory},${t.area},${t.source}`
	).join('\n');
	
	const instructions = `
		## Instructions
		- You are a financial assistant analyzing transaction data.
		- Below is a list of recent transactions from the user's financial accounts.
		- The user is asking a question about their transactions.
		- Provide a helpful, concise response based on the transaction data.
		- You can analyze spending patterns, identify top merchants, calculate category totals, area totals, etc.
		- If the user asks about specific merchants, categories, subcategories, or areas, focus on those.
		- Format currency values as $XX.XX
		- Be conversational but precise with numbers and dates.
		- Areas represent areas of life: 'fam' is family, 'pers' is personal, 'rtm' is a home business
		- Categories are parent categories (e.g., "Food", "Housing")
		- SubCategories are more specific (e.g., "Groceries", "Restaurants", "Rent")
		- All transactions are associated with a SubCategory, which belongs to a parent Category
		- transaction data is passed in as CSV. First row is header
		
		## Question:
		${userQuery}
	`;
	
	// Get response from Gemini
	const r = await gemini.models.generateContent({
		model: 'gemini-2.5-pro',
		contents: instructions + "\n\n### Transactions CSV:\n" + transactionsContext + data,
	});
	
	if (!r || !r.text) {
		res({ answer: "Sorry, I couldn't analyze your transactions at this time." });
		return;
	}
	
	res({ 
		answer: r.text.trim(),
		transactionCount: transactions.length
	});
})
*/






const Ai = { 
	ParseApple, ChatAboutTransactions
};

export default Ai;


