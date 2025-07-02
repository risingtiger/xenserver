
import { str, num } from "./defs_server_symlink.js"
import { YnabTransactionT } from "./defs.js"




/*
const payees_to_skip = [
	// not currently being used at all. may pick it back up in future. For now, just manually ignoring in interface and adding to ignored_transactions
]
*/




async function Get(db:any, accountids:{[key:str]:str}) {   return new Promise<any>(async (res, _rej)=> {

	let ynab_transactions:{[key:str]:any}[] = []
	let ignored_transaction_ynab_ids:str[] = []
	let existing_transactions:{[key:str]:str}[] = []
	let quick_notes:{[key:str]:str}[] = []

	{
		const promises:any[] = []

		const token = process.env.XEN_YNAB || ""

		let d = new Date()
		d.setMonth(d.getMonth() - 1)
		let since_date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`


		promises.push( getynabtransactions(accountids.holdem, token, since_date) )
		promises.push( getynabtransactions(accountids.family, token, since_date) )

		promises.push(db.collection("ignored_transactions").orderBy("ts", "desc").limit(100).get())
		promises.push(db.collection("transactions").orderBy("ts", "desc").limit(200).get())
		promises.push(db.collection("quick_notes").orderBy("ts", "desc").limit(200).get())

		let r:any = {}
		try {
			r = await Promise.all(promises)
		}
		catch {
			res(null);
			return;
		}


		const ynab_t_holdem  = r[0]
		const ynab_t_family  = r[1]

		ignored_transaction_ynab_ids  = r[2].docs.map((m: any) => m.data().ynab_id)
		existing_transactions         = r[3].docs.map((m: any) => ({ id: m.id, ...m.data() }));
		quick_notes                   = r[4].docs.map((m: any) => ({ id: m.id, ...m.data() }));
		

		ynab_t_holdem.data.transactions.forEach((m:any)=> m.preset_area_id = null)
		ynab_t_family.data.transactions.forEach((m:any)=> m.preset_area_id = accountids.family)

		ynab_transactions = [...ynab_t_holdem.data.transactions, ...ynab_t_family.data.transactions]
	}

    const ynab_relavant_transactions:YnabTransactionT[] = []

    for(const nt of ynab_transactions) {

        if (is_transaction_irrelevant(nt)) continue

        const d = new Date()
        d.setUTCFullYear(nt.date.slice(0,4))
        d.setUTCMonth( Number(nt.date.slice(5,7)) - 1)
        d.setUTCDate(nt.date.slice(8,10))
        d.setUTCHours(10)
        d.setUTCMinutes(0)
        d.setUTCSeconds(0)
		const ts = Math.floor(d.getTime() / 1000)

		if (nt.subtransactions.length) {
			for(const st of nt.subtransactions) {
				if (existing_transactions.find((t:any)=> t.ynab_id === st.id))   continue

				handle_quick_notes(st, quick_notes)
				ynab_relavant_transactions.push(assign(st, ts))
			}

		} else {
			if (existing_transactions.find((t:any)=> t.ynab_id === nt.id))  continue

			handle_quick_notes(nt, quick_notes)
			ynab_relavant_transactions.push(assign(nt, ts))
		}
    }

    res(ynab_relavant_transactions)




	function handle_quick_notes(ynab_t:any, quick_notes:{[key:str]:any}[]) {

		quick_notes.forEach(qn=> {
			let fourdays = 518400 // 6 days in seconds
			if ((qn.ts > ynab_t.ts - fourdays && qn.ts < ynab_t.ts + fourdays) && (qn.amount === ynab_t.amount)) {
				ynab_t.notes = qn.notes
			}
		})
	}




	function is_transaction_irrelevant(ynab_t:any) {

		if (ignored_transaction_ynab_ids.includes(ynab_t.id))  return true
		if (ynab_t.amount > 0)								   return true

		return false
	}




	function getynabtransactions(accountid:str, token:str, since_date:str) {
		return new Promise<any>(async (res, _rej)=> {
			const x = await fetch(`https://api.ynab.com/v1/budgets/${accountid}/transactions?since_date=${since_date}`, {
				method: 'GET', headers: { "Authorization": `Bearer ${token}` }
			})
			const r = await x.json()
			res(r)
		})
	}




	function assign(nt:{[key:str]:any}, date_ts:num) : YnabTransactionT {

		const cat_name = nt.category_id ? nt.category_name.split("#")[0].trim() : null

		return {
			ynab_id: nt.id,
			preset_area_id: nt.preset_area_id,
			preset_cat_name: cat_name,
			date: date_ts,
			amount: Math.abs(nt.amount) / 1000,
			merchant: nt.payee_name,
			notes: nt.memo || '',
			source_id: nt.account_id,
			tags: nt.flag_name ? [nt.flag_name] : [],
		}
	}
})}





const FinanceYnabTransactions = { Get };
export default FinanceYnabTransactions;


