



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import {  } from './defs.js'
import { str } from './defs_server_symlink.js'
//@ts-ignore



const DownloadToCSV = (db:any) => new Promise<any>(async (res, _rej)=> {

	const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);

	let allr:any[] = []
	try {
		allr = await Promise.all([
			db.collection("cats").get(),
			db.collection("areas").get(),
			db.collection("transactions").where("ts", ">=", oneYearAgo).get()
		])
	}
	catch {
		res(null);
		return;
	}

	const [catsSnapshot, areasSnapshot, transactionsSnapshot] = allr

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
	
	let   header = `ID,Date,Merchant,Amount,ParentCategory,Category,Area,Notes\n`
	const data = transactions.map((t:any) => 
		`${t.id},${t.date},${t.merchant},${t.amount.toFixed(2)},${t.parent_category},${t.category},${t.area},${t.notes}`
	).join('\n');
	
	const csv = header + data;
	res(csv);
})





const DownloadTransactionsToCSV = { 
	DownloadToCSV
};

export default DownloadTransactionsToCSV;


