



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import {  } from './defs.js'
import { str } from './defs_server_symlink.js'
//@ts-ignore


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




const Ai = { 
	ChatAboutTransactions
};

export default Ai;


