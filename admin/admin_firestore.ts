

//type str = string; //type int = number; type bool = boolean;

import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";




const Misc_Update = async (db: any) => {

    return new Promise<any>(async (res, _rej)=> {

		debugger

		const ts = Math.floor(Date.now()/1000)

		const collection = db.collection("cats")
        const snapshot = await collection.get()
        //const catRef = db.doc('cats/72dda9c4-27f9-4459-853c-a00631795909')
        //const snapshot = await collection.where('cat', '==', catRef).get()
        const items = snapshot.docs.map((m: any) => ({ actual_id: m.id, ...m.data() }));

        let batch        = db.batch()

        for (const t of items) {
			const updateobj = {
				ts,
				payments_budget: FieldValue.delete(),
			}
			batch.update(collection.doc(t.actual_id), updateobj);
        }

        await batch.commit().catch((er:any)=> console.error(er))

        res({return_str:"Done Misc Update"})
  })

}




const Misc_Get = async (db: any) => {

    return new Promise<any>(async (res, _rej)=> {
        
        const items_collection = db.collection("cats")

        const items_snapshot = await items_collection.get()

        const items = items_snapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

        let objarray:any[] = []

        for(const item of items){

            if (item.date === undefined) {
                objarray.push(item)
            }
        }

        //console.log(JSON.stringify(items, null, 2))
		console.log(objarray.length)

        res(objarray)
    })
}




const Admin_Firestore = { Misc_Update, Misc_Get };

export default Admin_Firestore;
