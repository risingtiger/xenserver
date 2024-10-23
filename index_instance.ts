

import { SSE_TriggersE, ServerMainsT, str, INSTANCE_T  } from '../defs_server.js'
import Finance from "./finance.js"
import Admin_Firestore from "./admin/admin_firestore.js"


const SERVER_MAINS:ServerMainsT = { app:{}, db:{}, appversion:0, sheets:{}, notifications:{}, firestore: {}, influxdb:{}, validate_request: (_req:any) => Promise.resolve("") }


function Set_Server_Mains(m:ServerMainsT) {
	SERVER_MAINS.app = m.app 
	SERVER_MAINS.db = m.db
	SERVER_MAINS.appversion = m.appversion
	SERVER_MAINS.sheets = m.sheets
	SERVER_MAINS.notifications = m.notifications
	SERVER_MAINS.firestore = m.firestore
	SERVER_MAINS.influxdb = m.influxdb
	SERVER_MAINS.validate_request = m.validate_request
}




function Set_Routes() {

    SERVER_MAINS.app.get(  '/api/xen/finance/grab_em',                                        grab_em)       
    SERVER_MAINS.app.get(  '/api/xen/finance/ynab_sync_categories',                           finance_ynab_sync_categories)       
    SERVER_MAINS.app.get(  '/api/xen/finance/get_ynab_raw_transactions',                      get_ynab_raw_transactions)
    SERVER_MAINS.app.post(  '/api/xen/finance/save_transactions_and_delete_ynab_records',     finance_save_transactions_and_delete_ynab_records)
    SERVER_MAINS.app.post(  '/api/xen/finance/save_month_snapshots',                          finance_save_month_snapshots)

    SERVER_MAINS.app.get(  '/api/xen/admin/firestore_misc_update',                            admin_firestore_misc_update)
}




// -- ROUTE HANDLERS --

async function grab_em(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Grab_Em(SERVER_MAINS.db, SERVER_MAINS.firestore)

    res.status(200).send(JSON.stringify(r))
}




async function finance_ynab_sync_categories(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const categories = await Finance.YNAB_Sync_Categories(SERVER_MAINS.db, SERVER_MAINS.firestore)
    res.status(200).send(JSON.stringify(categories))
}




async function get_ynab_raw_transactions(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const response = await Finance.Get_YNAB_Raw_Transactions(SERVER_MAINS.db)
    res.status(200).send(JSON.stringify(response))
}




async function finance_save_transactions_and_delete_ynab_records(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Save_Transactions_And_Delete_YNAB_Records(SERVER_MAINS.db, req.body)

    res.status(200).send(JSON.stringify(r))
}




async function finance_save_month_snapshots(req:any, res:any) {

    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const r = await Finance.Save_Month_Snapshots(SERVER_MAINS.db, req.body)

    res.status(200).send(JSON.stringify(r))
}




async function admin_firestore_misc_update(req:any, res:any) {
    
    if (! await SERVER_MAINS.validate_request(res, req)) return 

    const results = await Admin_Firestore.Misc_Update(SERVER_MAINS.db)
    res.status(200).send(JSON.stringify(results))
}












const INSTANCEID = "xen"
const PROJECTID   = "xenition"
const KEYJSONFILE = "/Users/dave/.ssh/xenition_local.json"
const SHEETS_KEYJSONFILE = "/Users/dave/.ssh/xenition-sheets-244e0733ca64.json"
const IDENTITY_PLATFORM_API = "AIzaSyDfXcwqyiRGGO6pMBsG8CvNEtDIhdspKRI"

export default { INSTANCEID, PROJECTID, KEYJSONFILE, IDENTITY_PLATFORM_API, SHEETS_KEYJSONFILE, Set_Server_Mains, Set_Routes};


