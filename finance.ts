



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { SaveNewTransactionServerT } from './defs.js'


const YNAB_HOLDEM_ACCOUNT_ID = "b0b3f2b2-5067-4f57-a248-15fa97a18cf5"
const YNAB_FAMILY_ACCOUNT_ID = "dbb7396b-413f-40d7-9a3f-7c986e485233"




const payees_to_skip = [
	// not currently being used at all. may pick it back up in future. For now, just manually ignoring in interface and adding to ignored_transactions
]




async function Grab_Em(_db:any, _firestore:any) {   return new Promise<any>(async (res, _rej)=> {

	//@ts-ignore
    const token = process.env.XEN_YNAB

    let promises:any[] = [

        //Firestore.Retrieve(db, ["areas", "cats", "sources", "tags", "transactions", "monthsnapshots"]),

        fetch(`https://api.ynab.com/v1/budgets/${YNAB_HOLDEM_ACCOUNT_ID}/accounts`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        }),

        fetch(`https://api.ynab.com/v1/budgets/${YNAB_FAMILY_ACCOUNT_ID}/accounts`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        })
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

        const r = await fetch(`https://api.ynab.com/v1/budgets/${a.id}/categories`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })

        const rjson = await r.json()
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




async function Get_YNAB_Raw_Transactions(db:any) {   return new Promise<any>(async (res, _rej)=> {

    const promises:any[] = []

	//@ts-ignore
    const token = process.env.XEN_YNAB

    let d = new Date()
    d.setMonth(d.getMonth() - 1)
    let since_date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`

    promises.push(fetch(`https://api.ynab.com/v1/budgets/${YNAB_HOLDEM_ACCOUNT_ID}/transactions?since_date=${since_date}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }))

    promises.push(fetch(`https://api.ynab.com/v1/budgets/${YNAB_FAMILY_ACCOUNT_ID}/transactions?since_date=${since_date}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }))

	promises.push(db.collection("ignored_transactions").orderBy("ts", "desc").limit(100).get())

    promises.push(db.collection("transactions").orderBy("ts", "desc").limit(200).get())

    let r = await Promise.all(promises)

	const ignored_transactions  = r[2].docs.map((m: any) => m.data().ynab_id)
    const existing_transactions = r[3].docs.map((m: any) => ({ id: m.id, ...m.data() }));

    const ynab_t_holdem =               await r[0].json()
    const ynab_t_family =               await r[1].json()

    ynab_t_holdem.data.transactions.forEach((m:any)=> m.preset_area_id = null)
    ynab_t_family.data.transactions.forEach((m:any)=> m.preset_area_id = YNAB_FAMILY_ACCOUNT_ID)

    const combined_ynab_t = [...ynab_t_holdem.data.transactions, ...ynab_t_family.data.transactions]

    const ynab_raw_transactions:any[] = []

    for(const nt of combined_ynab_t) {

		if (ignored_transactions.includes(nt.id)) continue
        if (is_transaction_irrelevant(nt))        continue

        const d = new Date()
        d.setUTCFullYear(nt.date.slice(0,4))
        d.setUTCMonth( Number(nt.date.slice(5,7)) - 1)
        d.setUTCDate(nt.date.slice(8,10))
        d.setUTCHours(10)
        d.setUTCMinutes(0)
        d.setUTCSeconds(0)

        if (nt.amount < 0) {

            if (nt.subtransactions.length) {

                for(const st of nt.subtransactions) {

                    if (existing_transactions.find((t:any)=> t.ynab_id === st.id)) continue

                    const raw_transaction = {
                        ynab_id: st.id,
                        preset_area_id: nt.preset_area_id,
                        preset_cat_name: st.category_name || null,
                        amount: Math.abs(st.amount) / 1000,
                        merchant: nt.payee_name,
                        notes: nt.memo || "",
                        source_id: nt.account_id,
                        tags: nt.flag_name ? [nt.flag_name] : [],
                        ts: Math.floor(d.getTime() / 1000)
                    }

                    ynab_raw_transactions.push(raw_transaction)
                }

            } else {

                if (existing_transactions.find((t:any)=> t.ynab_id === nt.id)) continue

                const raw_transaction = {
                    ynab_id: nt.id,
                    preset_area_id: nt.preset_area_id,
                    preset_cat_name: nt.category_name || null,
                    amount: Math.abs(nt.amount) / 1000,
                    merchant: nt.payee_name,
                    notes: nt.memo || "",
                    source_id: nt.account_id,
                    tags: nt.flag_name ? [nt.flag_name] : [],
                    ts: Math.floor(d.getTime() / 1000)
                }

                ynab_raw_transactions.push(raw_transaction)
            }
        }
    }

    res({ok:true, raw_transactions: ynab_raw_transactions})
})}

function is_transaction_irrelevant(t:any) {

    const x = payees_to_skip.find((m:string)=> {
        const p = t.import_payee_name_original || t.payee_name
        return p.includes(m)
    })
    return x ? true : false
}




async function Save_Transaction(db:any, nt:SaveNewTransactionServerT) {   return new Promise<any>(async (res, rej)=> {
	debugger

	nt.cat = db.collection("cats").doc(nt.cat)
	nt.source = db.collection("sources").doc(nt.source)
	nt.tags = nt.tags.map((m:string)=> db.collection("tags").doc(m))
	nt.ts = Math.floor(Date.now() / 1000)

	const docref = db.collection('transactions').doc()
	await docref.set(nt).catch((err:any) => {
		console.error("Error saving transaction:", err)
		rej(err)
		return
	})

	// Retrieve the complete document and return it
	const savedDoc = await docref.get().catch((err:any) => {
		console.error("Error retrieving saved transaction:", err)
		rej(err)
		return
	})
	
	const completeTransaction = { id: docref.id, ...savedDoc.data() }
    res({ok:true, id: docref.id, transaction: completeTransaction})
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

	await batch.commit().catch((er:any)=> console.error(er))

    res({ok:true})
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

	await batch.commit().catch((er:any)=> console.error(er))

	res({return_str:"Done Updating Merchant Name"})
})}




const Save_Quick_Note = (db:any, amount:number, note:string) => new Promise<string>(async (res, _rej)=> {

	const docRef = db.collection('quick_notes').doc();

	await docRef.set({
		amount: amount,
		note: note,
		ts: Math.floor(Date.now() / 1000)
	});

	res("ok");
})




async function Add_MonthSnapshot(db:any, monthSnapshot:any) {   return new Promise<any>(async (res, rej)=> {

    monthSnapshot.area = db.collection("areas").doc(monthSnapshot.area.id)
    monthSnapshot.issaved = true
    monthSnapshot.ts = Math.floor(Date.now() / 1000)

    const docRef = db.collection('monthsnapshots').doc()
    await docRef.set(monthSnapshot).catch((err:any)=> { rej(err); return })

    res({ok:true})
})}




const Finance = { Grab_Em, YNAB_Sync_Categories, Get_YNAB_Raw_Transactions, Save_Transaction, Patch_Transaction, Patch_Buckets, Update_Merchant_Name, Save_Quick_Note, Add_MonthSnapshot };

export default Finance;


