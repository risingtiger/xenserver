

//type str = string; //type int = number; type bool = boolean;

//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";




const Misc_Update = async (db: any) => {

    return new Promise<any>(async (res, _rej)=> {

        const collection = db.collection("cats")
        const catRef = db.doc('cats/f80ffd84-23ab-4d20-a711-bc75a9d4faa7')
        const snapshot = await collection.where('cat', '==', catRef).get()
        const items = snapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

        let batch        = db.batch()

		debugger
        for (const t of items) {
			const updateobj = {
				bucket: 0
			}
			batch.update(collection.doc(t.id), updateobj);
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
