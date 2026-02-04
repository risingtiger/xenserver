

import { bool, str, num } from './defs_server_symlink.js'



export type AreaT = {
    id: string,
	unfixedcosts: number,
	bucketquad3: number,
	bucketquad3_ref_ts: number,
	bucketquad4: number,
	bucketquad4_ref_ts: number,
    name: string,
    longname: string,
    ts: number
}

export type CatT = {
    id: string,
    arearef: AreaT|null,
    bucket: number|null,
    costs: number|null,
	costs_from_payments:number|null,
	costs_total:number|null,
	goal:number|null,
    name: string,
    parentref: CatT|null,
    subsref: CatT[]|null,
    tags: number[],
    ts: number,
    transfer_state: 0|1|2
}

export type SourceT = {
    id: string,
    ts: number,
	longname:string,
    name: string
	balance: number|null
	description:string,
	type: string,
    arearef: AreaT,
}

export type TagT = {
	arearef: AreaT,
    id: string,
    name: string,
	sort: number,
    ts: number,
}


export type TransactionT = {
    id: string,
    amount: number,
    catref: CatT,
    merchant: string,
    ts: number,
    date: number,
    notes: string,
    sourceref: SourceT,
    tagsref: TagT[]
}

export type CatCalcsT = {
    catref:  CatT,
    subsref: CatCalcsT[]|null,
    sums: Array<number>,
    costs: number,
    goal: number,
    med:  number,
    avg:  number,
}
export type CatCalcsTotalsT = {
    sums: Array<number>,
    allotment: number,
	allotment_left: number,
    med: number,
    avg: number,
}

export type MonthSnapShotT = {
    arearef: AreaT,
    month: string,
	issaved:bool,
	quad1_costs: number,
	quad2_costs: number,
	quad3_costs: number,
	quad4_costs: number,
	quad1_spent: number,
	quad2_spent: number,
	quad3_spent: number,
	quad4_spent: number
}

export type SnapShotsT = {
	monthsref: MonthSnapShotT[],
	avgsref: AvgsSnapShotT[],
}

export type AvgsSnapShotT = {
    arearef: AreaT,
	quad1_spent: number,
	quad2_spent: number,
	quad3_spent: number,
	quad4_spent: number
}

export type FilterT = {
	arearef: AreaT|null,
    parentcatref: CatT|null,
    catref: CatT|null,
    cattags: number[],
    sourceref: SourceT|null,
    tagsref: TagT[]|null,
    daterange: [Date, Date]|null,
    merchant: string|null,
    note: string|null,
    amountrange: [number, number]|null,
}

export type PaymentT = {
    id: string,
    payee: string,
    type: "carloan"|"creditcard"|"cylecredit"|"debtaccount"|"insurance"|"rent"|"subcription"|"utilities",
    catref: CatT|null,
    recurence: "yearly"|"monthly"|"weekly"|"daily"|"once",
    day: number,
    amount: number,
    varies: boolean,
    is_auto: boolean,
    sourceref: SourceT|null,
    breakdown: Array<string>,
    notes: string
}


export type CatBucketsInfoT = {
	catref: CatT,
	spent: number,
	remainder: number
}


export type AreaQuadBucketTotalsT = {
	spent: number,
	remainder: number,
	assigned: number,
	unassigned: number
}


export type SheetsTransactionT = {
	id: string,
	date: number, // Unix timestamp in seconds
	amount: number, // Postive amount in two decimal places
	merchant: string, // Shorter merchant name
	merchant_long: string, // Shorter merchant name
	notes: string,
	source_id: string|null,
	tags: string[],
}


export type SaveNewTransactionServerT = {
    amount: number,
	cat: string,
	date: number,
    merchant: string,
    notes: string
    source: string,
	tags: string[],
    sheets_id: string|null,
}




export type QuickNoteT = {
    amount: number
    note: string,
	parentcatname: string,
	childcatname: string,
	user: string,
    ts: number,
}



