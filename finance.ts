



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { SaveNewTransactionServerT } from './defs.js'
import FinanceYnabTransactions from "./finance_ynabtransactions.js"






const payees_to_skip = [
	// not currently being used at all. may pick it back up in future. For now, just manually ignoring in interface and adding to ignored_transactions
]




async function Grab_Em(_db:any, accountids:{[key:string]:string}) {   return new Promise<any>(async (res, _rej)=> {

	//@ts-ignore
    const token = process.env.XEN_YNAB

    let promises:any[] = [

        fetch(`https://api.ynab.com/v1/budgets/${accountids.holdem}/accounts`, { method: 'GET', headers: { "Authorization": `Bearer ${token}` }}),
        fetch(`https://api.ynab.com/v1/budgets/${accountids.family}/accounts`, {method: 'GET',  headers: { "Authorization": `Bearer ${token}` }})
    ]

    let r = await Promise.all(promises)

	/*
    let areas = r[0][0]

    let cats = r[0][1]

    let sources = r[0][2]

    let tags = r[0][3]

    let transactions = r[0][4]

    let previous_static_monthsnapshots = r[0][5]

	*/

    let ynab_holdem_accounts = (await r[0].json()).data.accounts

    let ynab_family_accounts = (await r[1].json()).data.accounts

    let ynab_accounts = [...ynab_holdem_accounts, ...ynab_family_accounts]

	/*
    areas.forEach((m:any)=> {
        const ynab_account = ynab_accounts.find((n:any)=> n.id === m.ynab_savings_id)
        m.ynab_savings = ynab_account.balance / 1000
    })
	*/

    res({ynab_accounts})
})}



async function YNAB_Sync_Categories(db:any, Firestore:any) {   return new Promise<any>(async (res, _rej)=> {

    const cats_with_deleteflag:{id:string, name:string}[] = []

    const ynab_cats_to_skip = ["Credit Card Payments", "Hidden Categories", "Internal Master Category"]

    const batch        = db.batch()

	//@ts-ignore
    const token = process.env.XEN_YNAB

    const r = await Firestore.Retrieve(db, ["areas", "cats"])

    const areas = r[0]
    const cats = r[1]

    const all_ynab_cats:{id:string,parentid:string|null}[] = []

    for(const a of areas) {

		let rjson:any = {}
		try {
			const r = await fetch(`https://api.ynab.com/v1/budgets/${a.id}/categories`, {
				method: 'GET',
				headers: {
					"Authorization": `Bearer ${token}`
				}
			})

			rjson = await r.json()
		}
		catch (err) {
			res(null)
			return
		}

        const ynab_cat_groups = rjson.data.category_groups

        for(const cg of ynab_cat_groups) {

            if (ynab_cats_to_skip.includes(cg.name)) continue

            let cat = cats.find((c:any)=> c.id === cg.id)
            
            if (cg.hidden || cg.deleted) {

                if (cat) {
                    cat.deleteflag = true
                    cat.ts = Math.floor(Date.now() / 1000)
                    batch.update(db.collection('cats').doc(cat.id), cat)

                    cats_with_deleteflag.push({id:cat.id, name:cat.name})
                }

            } else {

                all_ynab_cats.push({id:cg.id, parentid:null})

                if (!cat) {
                    cat = {
                        area: db.collection("areas").doc(a.id),
                        budget: null,
                        name: cg.name,
                        parent: null,
                        tags: null,
                        deleteflag: false,
                        ts: Math.floor(Date.now() / 1000)
                    }

                    const newcatdoc = db.collection('cats').doc(cg.id)
                    batch.set(newcatdoc, cat)

                } else {
                    cat.budget = null
                    cat.name = cg.name
                    cat.parent = null
                    cat.tags = null
                    cat.deleteflag = false
                    cat.ts = Math.floor(Date.now() / 1000)
                    batch.update(db.collection('cats').doc(cat.id), cat)
                }
            }

            for(const ccg of cg.categories) {
                
                let c = cats.find((m:any)=> m.id === ccg.id)
                let hashindex = ccg.name.lastIndexOf("#")
                let cattags = (hashindex > 0) ? ccg.name.slice(hashindex+1,ccg.name.length).split(",").map((c:string)=> parseInt(c)) : []
                let name = (hashindex > 0) ? ccg.name.slice(0,hashindex-1) : ccg.name

                if (ccg.hidden || ccg.deleted || cattags.length === 0) {

                    if (c) {
                        c.deleteflag = true
                        c.ts = Math.floor(Date.now() / 1000)
                        batch.update(db.collection('cats').doc(c.id), c)

                        cats_with_deleteflag.push({id:c.id, name:c.name})
                    }

                } else {

                    all_ynab_cats.push({id:ccg.id, parentid:cg.id})

                    if (!c) {
                        c = {
                            area: null,
                            budget: Math.floor(ccg.goal_target/1000),
                            name: name,
                            parent: db.collection("cats").doc(cg.id),
                            tags: cattags,
                            deleteflag: false,
                            ts: Math.floor(Date.now() / 1000)
                        }

                        const newcatdoc = db.collection('cats').doc(ccg.id)
                        batch.set(newcatdoc, c)

                    } else {
                        c.area = null
                        c.budget = Math.floor(ccg.goal_target/1000)
                        c.name = name
                        c.parent = db.collection("cats").doc(cg.id)
                        c.tags = cattags
                        c.deleteflag = false
                        c.ts = Math.floor(Date.now() / 1000)
                        batch.update(db.collection('cats').doc(c.id), c)
                    }
                }
            }
        }
    }

    for(const c of cats) {
        const has_ynab_corresponding = all_ynab_cats.find((m:any)=> m.id === c.id)

        if (!has_ynab_corresponding) {
            c.deleteflag = true
            c.ts = Math.floor(Date.now() / 1000)
            batch.update(db.collection('cats').doc(c.id), c)

            cats_with_deleteflag.push({id:c.id, name:c.name})
        }
    }

    await batch.commit().catch((err:any)=> console.error(err))

    res({cats_with_deleteflag})
})}




async function Save_Transactions(db:any, new_transactions:( SaveNewTransactionServerT & {ts:number} )[]) {   return new Promise<number|null>(async (res, _rej)=> {
    
    const batch = db.batch();
    const now = Math.floor(Date.now() / 1000);
    const savedTransactions:{[key:string]:any}[] = [];

	for (const transaction of new_transactions) {
		transaction.cat = db.collection("cats").doc(transaction.cat);
		transaction.source = db.collection("sources").doc(transaction.source);
		transaction.tags = transaction.tags.map((m:string) => db.collection("tags").doc(m));
		transaction.ts = now;

		const docref = db.collection('transactions').doc();
		batch.set(docref, transaction);
		
		savedTransactions.push({ id: docref.id, ...transaction });
	}

	const r = await batch.commit().catch(()=> null)
	res(r)
})}




async function Ignore_Transaction(db:any, sheets_id:string) {   return new Promise<any>(async (res, rej)=> {

	const ts = Math.floor(Date.now() / 1000)

	try {
		await db.collection('ignored_transactions').add({ts, sheets_id})
	}
	catch {
		rej(null)
		return
	}

    res(1)
})}




async function Patch_Transaction(db:any, id:string, changed:any) {   return new Promise<any>(async (res, _rej)=> {

	const now = Math.floor(Date.now() / 1000)
	const d:any = {}

	if (changed.cat_id) {
		d.cat = db.collection("cats").doc(changed.cat_id)
	}
	if (changed.merchant) {
		d.merchant = changed.merchant
	}
	if (changed.notes) {
		d.notes = changed.notes
	}
	if (changed.tag_id) {
		d.tags = [db.collection("tags").doc(changed.tag_id)]
	}
	if (changed.amount) {
		d.amount = changed.amount
	}
	if (changed.date) {
		d.date = changed.date
	}

	d.ts = now

	const docref = db.collection('transactions').doc(id)
	await docref.set(d, {merge:true}).catch((_err:any)=> { res(null); return })

	const r = await docref.get().catch((_err:any)=> { res(null); return })
	const data = { id: r.id, ...r.data() }

    res(data)
})}




async function Update_Merchant_Name(db:any, newname:string, oldname:string) {   return new Promise<any>(async (res, _rej)=> {

	const now = Math.floor(Date.now() / 1000)

	const collection   = db.collection("transactions")
	const snapshot     = await collection.where("merchant", "==", oldname).get()
	const transactions = snapshot.docs.map((m: any) => ({ id: m.id, ...m.data() }));

	let batch        = db.batch()

	for (const t of transactions) {

		const updateobj = {
			merchant: newname,
			ts: now
		}
		batch.update(collection.doc(t.id), updateobj);
	}

	try {
		await batch.commit().catch((er:any)=> console.error(er))
	}
	catch {
		res(null)
		return
	}

	res({return_str:"Done Updating Merchant Name"})
})}




async function Update_Transaction_Tag(db:any, docid:string, tagid:string) {   return new Promise<any>(async (res, _rej)=> {

	const now = Math.floor(Date.now() / 1000)

	const tg  = tagid === 'none' ? [] : [db.collection("tags").doc(tagid)]
	const d:any = { tags: tg, ts: now }

	const docref = db.collection('transactions').doc(docid)
	let   r = await docref.set(d, {merge:true}).catch((_err:any)=>null )
	if (!r) { res(null); return }

	r = await docref.get().catch((_err:any)=>null)
	if (!r) { res(null); return; }

	const da = { id: r.id, ...r.data() }

	da.cat    = {__path: da.cat._path.segments    }
	da.source = {__path: da.source._path.segments }

    res(da)
})}




async function Patch_Buckets(db:any, catupdates:{id:string,bucket:number}[], area_id:string|null, area_buckets_changed:any|null) {   return new Promise<any>(async (res, _rej)=> {

	const now = Math.floor(Date.now() / 1000)
	let batch        = db.batch()

	for(const update of catupdates) {
		const d:any = { ts: now, bucket: update.bucket }
		const docref = db.collection('cats').doc(update.id)
		batch.update(docref, d)
	}

	if (area_id && area_buckets_changed) {
		const docref = db.collection('areas').doc(area_id)

		const d:any = { ts: now }

		if (area_buckets_changed.bucketquad3) {
			d.bucketquad3 = area_buckets_changed.bucketquad3
			d.bucketquad3_ref_ts = now
		}

		if (area_buckets_changed.bucketquad4) {
			d.bucketquad4 = area_buckets_changed.bucketquad4
			d.bucketquad4_ref_ts = now
		}

		docref.set(d, {merge:true}).catch((err:any)=> { console.error(err); return })
	}

	try {
		await batch.commit().catch((er:any)=> console.error(er))
	}
	catch {
		res(null)
		return
	}

    res(1)
})}




const Save_Quick_Note = (db:any, amount:number, note:string) => new Promise<any|null>(async (res, _rej)=> {

	const docRef = db.collection('quick_notes').doc();

	try {
		await docRef.set({
			amount: amount,
			note: note,
			ts: Math.floor(Date.now() / 1000)
		});
	}
	catch {
		res(null);
		return;
	}
	res(1);
})




async function Add_MonthSnapshot(db:any, monthSnapshot:any) {   return new Promise<any>(async (res, _rej)=> {

    monthSnapshot.area = db.collection("areas").doc(monthSnapshot.area.id)
    monthSnapshot.issaved = true
    monthSnapshot.ts = Math.floor(Date.now() / 1000)

    const docRef = db.collection('monthsnapshots').doc()
	try {
		await docRef.set(monthSnapshot)
	}
	catch {
		res(null)
		return
	}

    res(1)
})}




async function Set_Account_Balances(db:any, accounts:{source_id:string, balance:number}[]) {   return new Promise<any>(async (res, rej)=> {
    
    const batch = db.batch();
    const now   = Math.floor(Date.now() / 1000);
    
    for (const account of accounts) {
        const docRef = db.collection('sources').doc(account.source_id);
        batch.update(docRef, {
            balance: account.balance,
            ts: now
        });
    }
    
	try {
		await batch.commit() 
	} 
	catch {
		res(null);
		return;
	}

    res(1);
})}









const Finance = { Grab_Em, YNAB_Sync_Categories, Save_Transactions, Ignore_Transaction, Patch_Transaction, Update_Transaction_Tag, Patch_Buckets, Update_Merchant_Name, Save_Quick_Note, Add_MonthSnapshot, Set_Account_Balances };

export default Finance;


