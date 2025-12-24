

//type str = string; //type int = number; type bool = boolean;

//@ts-ignore
//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";




const Run = async (db: any) => new Promise<any>(async (res, _rej)=> {

	const [paymentsSnapshot, catsSnapshot] = await Promise.all([
		db.collection("payments").get(),
		db.collection("cats").get()
	])

	let return_str = ""

	const payments = paymentsSnapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));
	const cats = catsSnapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

	for (const p of payments) {
		if (!p.cat) continue;

		const cat = cats.find((c:any) => c.id === p.cat._path.segments[1])
		if (!cat) {
			return_str += p.payee + " payment is attached to a cat that does not exist" + '\n'
			continue
		}

		if (cat.tags[0] !== 1) {
			return_str += p.payee + " payment is attached to a cat that is not type fixed" + '\n'
		}
	}

	for (const c of cats) {

		if (!c.tags) continue; // is parent cat
		if (c.tags[0] !== 1) continue;

		const matched_payments = payments.filter((p:any)=> p.cat && p.cat._path.segments[1] === c.id)
		
		if (!c.costs && !matched_payments.length) {
			return_str += c.name + " is fixed but has no recorded costs or payments" + '\n'
		}
	}

	return_str += "done"
	res({return_str})
})

const Admin_Sanity = { Run };

export default Admin_Sanity;
