
 
 import { ServerMainsT } from './defs_server_symlink.js'
 import Finance from "./finance.js"
 import Admin_Firestore from "./admin/admin_firestore.js"
 import Admin_Sanity from './admin/admin_sanity.js'
 import Sheets from "./sheets.js"
 import DownloadTransactionsToCSV  from './download_transactions_to_csv.js'
 import { SearchTransactions } from './search_transactions.js'
 



const SERVER_MAINS:ServerMainsT = { 
	app:{}, 
	db:{}, 
	pg:{},
	appversion:0, 
	sheets:{}, 
	push_subscriptions:{}, 
	firestore: {},
	influxdb:{}, 
	emailing:{},
	utils:{},
	sse:{},
	validate_request: (_req:any) => Promise.resolve(""),
}


function Set_Server_Mains(m:ServerMainsT) {
	SERVER_MAINS.app = m.app 
	SERVER_MAINS.db = m.db
	SERVER_MAINS.pg = m.pg
	SERVER_MAINS.appversion = m.appversion
	SERVER_MAINS.sheets = m.sheets
	SERVER_MAINS.push_subscriptions = m.push_subscriptions
	SERVER_MAINS.firestore = m.firestore
	SERVER_MAINS.influxdb = m.influxdb
	SERVER_MAINS.emailing = m.emailing
	SERVER_MAINS.utils = m.utils
	SERVER_MAINS.sse = m.sse
	SERVER_MAINS.validate_request = m.validate_request
}




function Set_Routes() {

    SERVER_MAINS.app.get(   '/api/xen/finance/download_csv/transactions',					  download_csv_transactions)       

    SERVER_MAINS.app.get(   '/api/xen/finance/sheets/get_balances',						      sheets_get_balances)       
    SERVER_MAINS.app.get(   '/api/xen/finance/sheets/get_transactions',                       sheets_get_transactions)

     SERVER_MAINS.app.post(  '/api/xen/finance/update_merchant_name_in_all_transactions',     update_merchant_name_in_all_transactions)
     SERVER_MAINS.app.post(  '/api/xen/finance/transactions/:transactionid/update_tag',       update_transaction_tag)
     SERVER_MAINS.app.post(  '/api/xen/finance/transactions/search',                          search_transactions)
     SERVER_MAINS.app.post(  '/api/xen/finance/cats/:catid/update_quadrant',                  update_category_quadrant)
     SERVER_MAINS.app.post(  '/api/xen/finance/save_quick_note',                              firestore_save_quick_note)
     SERVER_MAINS.app.get(   '/api/xen/finance/get_cats_for_apple_shortcuts',                 get_cats_for_apple_shortcuts)
     SERVER_MAINS.app.post(  '/api/xen/finance/add_monthsnapshot',                            finance_add_monthsnapshot)
     SERVER_MAINS.app.post(  '/api/xen/finance/set_source_balances',						  set_source_balances)       
     SERVER_MAINS.app.post(  '/api/xen/finance/save_transactions',                            save_transactions)
     SERVER_MAINS.app.post(  '/api/xen/finance/ignore_transaction',                           ignore_transaction)


    SERVER_MAINS.app.get(  '/api/xen/admin/firestore_misc_update',                            admin_firestore_misc_update)
    SERVER_MAINS.app.get(  '/api/xen/admin/firestore_misc_get',                               admin_firestore_misc_get)

    SERVER_MAINS.app.get(  '/api/xen/admin/sanity_run',                                       admin_sanity_run)
}



 
 // -- ROUTE HANDLERS --
 
 
 async function download_csv_transactions(req:any, res:any) {


    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await DownloadTransactionsToCSV.DownloadToCSV(SERVER_MAINS.db)
	if (r === null) { res.status(400).send(); return; }

    res.status(200).send(JSON.stringify(r))
}




async function sheets_get_balances(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Sheets.Get_Balances(SERVER_MAINS.sheets)
	if (r === null) { res.status(400).send(); return; }

    res.status(200).send(JSON.stringify(r))
}




async function sheets_get_transactions(req:any, res:any) {

	const decodedTokenOrNull = await SERVER_MAINS.validate_request(res, req) 
	if (!decodedTokenOrNull) return


    const response = await Sheets.Get_Latest_Transactions(SERVER_MAINS.db, SERVER_MAINS.sheets, req.query.user)
	if (response === null) { res.status(400).send(); return; }
    res.status(200).send(JSON.stringify(response))
}





async function save_transactions(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Save_Transactions(SERVER_MAINS.db, req.body)
	if (r === null) { res.status(400).send(); return; }

    SERVER_MAINS.sse.TriggerEvent("datasync_collection", { paths:["transactions"] } )

    res.status(200).send(JSON.stringify({ok:true}))
}




async function ignore_transaction(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    let r = await Finance.Ignore_Transaction(SERVER_MAINS.db, req.body.sheets_id).catch(()=> null)
	if (r === null) { res.status(400).send(); return; }

    res.status(200).send(JSON.stringify({ok:true}))
}




async function update_merchant_name_in_all_transactions(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Update_Merchant_Name_In_All_Transactions(SERVER_MAINS.db, req.body.newname, req.body.oldname)
	if (r === null) { res.status(400).send(); return; }

	// we are updating all of transactions because merchant name change could span across multiple transactions
	SERVER_MAINS.sse.TriggerEvent("datasync_collection", {paths: ["transactions"]})

    res.status(200).send(JSON.stringify(r))
}




async function update_transaction_tag(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Update_Transaction_Tag(SERVER_MAINS.db, req.params.transactionid, req.body.tagid)
	if (!r) { res.status(400).send(); return; }

	SERVER_MAINS.sse.TriggerEvent("datasync_doc_patch", {path: "transactions/" + req.body.docid, data: r})

    res.status(200).send(JSON.stringify(r))
}




async function search_transactions(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

	const search_criterias = req.body.search_criterias as any[]

    const r = await SearchTransactions(SERVER_MAINS.db, search_criterias)
	if (!r) { res.status(400).send(); return; }

    res.status(200).send(JSON.stringify(r))
}




async function update_category_quadrant(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const catid = req.params.catid
    const quadrant = req.body.quadrant

    if (!catid || !quadrant) {
        res.status(400).send(); 
        return;
    }

    if (![1, 2, 3, 4].includes(Number(quadrant))) {
        res.status(400).send(); 
        return;
    }

    const r = await Finance.Update_Category_Quadrant(SERVER_MAINS.db, catid, Number(quadrant))
    if (!r) { res.status(400).send(); return; }

    SERVER_MAINS.sse.TriggerEvent("datasync_doc_patch", {path: "cats/" + catid, data: r} ) 

    res.status(200).send(JSON.stringify(r))
}




async function firestore_save_quick_note(req:any, res:any) {

	 debugger
    const r = await Finance.Save_Quick_Note(SERVER_MAINS.db, Number(req.body.amount), req.body.note, req.body.cat, req.body.user )
	if (r === null) { res.status(400).send(); return; }

    res.status(200).send("ok")
}




async function get_cats_for_apple_shortcuts(req:any, res:any) {

    const r = await Finance.GetCatsForAppleShortcuts(SERVER_MAINS.db, req.query.areaname)
	if (r === null) { res.status(400).send(); return; }

    res.status(200).send(r)
}




async function finance_add_monthsnapshot(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Add_MonthSnapshot(SERVER_MAINS.db, req.body.monthSnapshot)
	if (r === null) { res.status(400).send(); return; }

	SERVER_MAINS.sse.TriggerEvent("datasync_collection", {paths: ["monthsnapshots"]})

    res.status(200).send(JSON.stringify(r))
}




async function set_source_balances(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

	const accounts = req.body
    const r = await Finance.Set_Account_Balances(SERVER_MAINS.db, accounts)
	if (r === null) { res.status(400).send(); return; }

	SERVER_MAINS.sse.TriggerEvent("datasync_collection", {paths: ["sources"]})

    res.status(200).send(JSON.stringify(r))
}




async function admin_firestore_misc_update(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const results = await Admin_Firestore.Misc_Update(SERVER_MAINS.db)
    res.status(200).send(JSON.stringify(results))
}




async function admin_firestore_misc_get(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const results = await Admin_Firestore.Misc_Get(SERVER_MAINS.db)
    res.status(200).send(JSON.stringify(results))
}




async function admin_sanity_run(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const results = await Admin_Sanity.Run(SERVER_MAINS.db)
    res.status(200).send(JSON.stringify(results))
}












const INSTANCEID            = "xen"
const PROJECTID             = "xenition"
const KEYJSONFILE           = "/Users/dave/.ssh/xenition-webapp-key.json"
const IDENTITY_PLATFORM_API = "AIzaSyDfXcwqyiRGGO6pMBsG8CvNEtDIhdspKRI"

export default { INSTANCEID, PROJECTID, KEYJSONFILE, IDENTITY_PLATFORM_API, Set_Server_Mains, Set_Routes};


