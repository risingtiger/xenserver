

export type MoveTxnParamsT = { from_cat_id: string; to_cat_id: string }




export async function Move_Transactions(db:any, params:MoveTxnParamsT) { return new Promise<any>(async (res,_rej)=> {

    const from_cat_id = params.from_cat_id
    const to_cat_id   = params.to_cat_id
    const from_ref    = build_cat_ref(db, from_cat_id)
    const to_ref      = build_cat_ref(db, to_cat_id)
    let   moved       = 0
    const page_sz     = 480
    const coll        = db.collection('transactions')

    let last_doc:any = null

    while (true) {
        let snap:any = null
        try { 
            const base = last_doc
                ? coll.where('cat','==', from_ref).startAfter(last_doc.id).limit(page_sz)
                : coll.where('cat','==', from_ref).limit(page_sz)
            snap = await base.get()
        }
        catch { res({ok:false, moved, reason:'query_failed'}); return }

        if (!snap || snap.empty) break

        const batch = db.batch()
        for (const doc of snap.docs) {
            batch.update(doc.ref, { cat: to_ref, ts: Math.floor(Date.now()/1000) })
        }

        try { await batch.commit() }
        catch { res({ok:false, moved, reason:'batch_commit_failed'}); return }

        moved += snap.size
        last_doc = snap.docs[snap.docs.length - 1]
        if (snap.size < page_sz) break
    }

    res({ok:true, moved})
})}




const build_cat_ref = (db:any, cat_id:string) => db.collection('cats').doc(cat_id)
