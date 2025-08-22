

//type str = string; //type int = number; type bool = boolean;

import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";




const Run = async (db: any) => new Promise<any>(async (res, _rej)=> {

	const ts = Math.floor(Date.now()/1000)

	const collection = db.collection("payments")
	const snapshot = await collection.get()
	//const catRef = db.doc('cats/72dda9c4-27f9-4459-853c-a00631795909')
	//const snapshot = await collection.where('cat', '==', catRef).get()
	const items = snapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

	for (const t of items) {
		const updateobj = {
			ts,
			payments_budget: FieldValue.delete(),
		}
	}

	res({return_str:"Done Sanity Run"})
})

const Admin_Sanity = { Run };

export default Admin_Sanity;
