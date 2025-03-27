

import { ServerMainsT, SSETriggersE } from './defs_server_symlink.js'
import Finance from "./finance.js"
import FinanceYnabTransactions from "./finance_ynabtransactions.js"
import Admin_Firestore from "./admin/admin_firestore.js"


const ynab_account_ids = {
	holdem: "b0b3f2b2-5067-4f57-a248-15fa97a18cf5",
	family: "dbb7396b-413f-40d7-9a3f-7c986e485233"
}


const SERVER_MAINS:ServerMainsT = { 
	app:{}, 
	db:{}, 
	appversion:0, 
	sheets:{}, 
	notifications:{}, 
	firestore: {},
	influxdb:{}, 
	emailing:{},
	sse:{},
	validate_request: (_req:any) => Promise.resolve("") 
}


function Set_Server_Mains(m:ServerMainsT) {
	SERVER_MAINS.app = m.app 
	SERVER_MAINS.db = m.db
	SERVER_MAINS.appversion = m.appversion
	SERVER_MAINS.sheets = m.sheets
	SERVER_MAINS.notifications = m.notifications
	SERVER_MAINS.firestore = m.firestore
	SERVER_MAINS.influxdb = m.influxdb
	SERVER_MAINS.emailing = m.emailing
	SERVER_MAINS.sse = m.sse
	SERVER_MAINS.validate_request = m.validate_request
}




function Set_Routes() {

    SERVER_MAINS.app.get(  '/api/xen/finance/grab_em',                                        grab_em)       
    SERVER_MAINS.app.get(  '/api/xen/finance/ynab_sync_categories',                           finance_ynab_sync_categories)       
    SERVER_MAINS.app.get(  '/api/xen/finance/get_ynab_transactions',                          get_ynab_transactions)
    SERVER_MAINS.app.post(  '/api/xen/finance/save_transaction',                              finance_save_transaction)
    SERVER_MAINS.app.post(  '/api/xen/finance/ignore_transaction',                            finance_ignore_transaction)
    SERVER_MAINS.app.patch(  '/api/xen/finance/patch_transaction',                            finance_patch_transaction)
    SERVER_MAINS.app.post(  '/api/xen/finance/update_transaction_tag',                        finance_update_transaction_tag)
    SERVER_MAINS.app.patch(  '/api/xen/finance/patch_buckets',                                finance_patch_buckets)
    SERVER_MAINS.app.post(  '/api/xen/finance/update_merchant_name',                          finance_update_merchant_name)
    SERVER_MAINS.app.post(  '/api/xen/finance/save_quick_note',                               firestore_save_quick_note)
    SERVER_MAINS.app.post(  '/api/xen/finance/add_monthsnapshot',                             finance_add_monthsnapshot)

    SERVER_MAINS.app.get(  '/api/xen/admin/firestore_misc_update',                            admin_firestore_misc_update)
    SERVER_MAINS.app.get(  '/api/xen/admin/firestore_misc_get',                               admin_firestore_misc_get)
}




// -- ROUTE HANDLERS --

async function grab_em(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Grab_Em(SERVER_MAINS.db, ynab_account_ids)
	if (r === null) { res.status(200).send(JSON.stringify({ok:false})); return; }

    res.status(200).send(JSON.stringify(r))
}




async function finance_ynab_sync_categories(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const categories = await Finance.YNAB_Sync_Categories(SERVER_MAINS.db, SERVER_MAINS.firestore)
    res.status(200).send(JSON.stringify(categories))
}




async function get_ynab_transactions(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const response = await FinanceYnabTransactions.Get(SERVER_MAINS.db, ynab_account_ids)
    res.status(200).send(JSON.stringify(response))
}




async function finance_save_transaction(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Save_Transactions(SERVER_MAINS.db, req.body)
	if (r === null) { res.status(200).send(JSON.stringify({ok:false})); return; }

    SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_COLLECTION, { paths:["transactions"] } )

    res.status(200).send(JSON.stringify({ok:true}))
}




async function finance_ignore_transaction(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    await Finance.Ignore_Transaction(SERVER_MAINS.db, req.body.ynab_id)

    res.status(200).send(JSON.stringify({ok:true}))
}




async function finance_patch_transaction(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Patch_Transaction(SERVER_MAINS.db, req.body.id, req.body.changed)

	SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_DOC_PATCH, {path: "transactions/"+req.body.id, data: r})

    res.status(200).send(JSON.stringify(r))
}




async function finance_update_transaction_tag(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Update_Transaction_Tag(SERVER_MAINS.db, req.body.id, req.body.tag_id)

	SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_DOC_PATCH, {path: "transactions/"+req.body.id, data: r})

    res.status(200).send(JSON.stringify(r))
}




async function finance_patch_buckets(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Patch_Buckets(SERVER_MAINS.db, req.body.catupdates, req.body.area_id, req.body.area_buckets_changed)

	SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_COLLECTION, {paths: ["cats","areas"]})

    res.status(200).send(JSON.stringify(r))
}




async function finance_update_merchant_name(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Update_Merchant_Name(SERVER_MAINS.db, req.body.newname, req.body.oldname)

	SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_COLLECTION, {paths: ["transactions"]})

    res.status(200).send(JSON.stringify(r))
}




async function firestore_save_quick_note(req:any, res:any) {
	console.log("firestore_save_quick_note")
	console.log(req.body)
    await Finance.Save_Quick_Note(SERVER_MAINS.db, Number(req.body.amount), req.body.note)
    res.status(200).send("ok")
}




async function finance_add_monthsnapshot(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Add_MonthSnapshot(SERVER_MAINS.db, req.body.monthSnapshot)

	SERVER_MAINS.sse.TriggerEvent(SSETriggersE.FIRESTORE_COLLECTION, {paths: ["monthsnapshots"]})

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












const INSTANCEID = "xen"
const PROJECTID   = "xenition"
const KEYJSONFILE = "/Users/dave/.ssh/xenition_local.json"
const SHEETS_KEYJSONFILE = "/Users/dave/.ssh/xenition-sheets-244e0733ca64.json"
const IDENTITY_PLATFORM_API = "AIzaSyDfXcwqyiRGGO6pMBsG8CvNEtDIhdspKRI"

export default { INSTANCEID, PROJECTID, KEYJSONFILE, IDENTITY_PLATFORM_API, SHEETS_KEYJSONFILE, Set_Server_Mains, Set_Routes};


