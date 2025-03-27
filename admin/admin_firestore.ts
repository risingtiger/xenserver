

//type str = string; //type int = number; type bool = boolean;

//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";




const Misc_Update = async (db: any) => {

    return new Promise<any>(async (res, _rej)=> {

        const collection = db.collection("transactions")
        //const catRef = db.doc('cats/72dda9c4-27f9-4459-853c-a00631795909')
        //const snapshot = await collection.where('cat', '==', catRef).get()
        const snapshot = await collection.get()
        const items = snapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

        let batch        = db.batch()

        for (const t of items) {
			if (!t.transacted_ts) {
				const updateobj = {
					cat: db.doc('cats/deecbb5f-403a-4277-a06b-223ac38623d2')
				}
				batch.update(collection.doc(t.id), updateobj);
			}
			
			//batch.update(collection.doc(t.id), updateobj);
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
