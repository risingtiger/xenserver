



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import { SheetsTransactionT } from './defs.js'


const apple_csv_str = `
Date,Description,Daily Cash,Amount
05/31/2025,HILDALE CITY 320 E NEWEL AVE 435-874-232384784 UT USA,"1% $1.24","$123.73"
05/31/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"2% $0.08","$4.00"
05/31/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.13 2%","$6.51"
05/31/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.74 2%","$36.91"
05/31/2025,CHEVRON 0383914 1075 S CENTRAL ST COLORADO CITY86021 AZ USA,"$1.03 2%","$51.67"
06/01/2025,GOOGLE GSUITE_risingt1600 AMPHITHEATRE PKWY 650-253-0000 94043 CA USA,"$0.18 1%","$17.88"
06/01/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/01/2025,Google CLOUD MQwv6w 1600 Amphitheatre Parkway Mountain View94043 CA USA,"1% $0.23","$23.41"
06/01/2025,Amazon web services 440 Terry Ave N aws.amazon.co98109 WA USA,"1% $0.01","$1.11"
06/01/2025,INFLUXDATA 548 Market St PMB 77953 SAN FRANCISCO94104 CA USA,"1% $0.01","$0.07"
06/02/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/02/2025,TST RED BRICK 385 W TOWNSHIP AVE COLORADO CITY86021 AZ USA,"$0.22 2%","$10.86"
06/02/2025,Subway 60893 625 N State St Hildale 84784 UT USA,"$0.38 2%","$18.95"
06/02/2025,THE BORDER STORE 625 N STATE ST HURRICANE 84737 UT USA,"2% $0.07","$3.29"
06/03/2025,SQ *SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/03/2025,DOLLAR GENERAL #16457 1060 S CENTRAL ST COLORADO CITY86021 AZ USA,"$0.12 2%","$5.86"
06/04/2025,GARKANE ENERGY COOPERA120 W 300 S LOA 84747 UT USA,"$1.40 1%","$139.98"
06/04/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/04/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.26 2%","$13.00"
06/04/2025,eBay 0*02-13173-35574 2535 North First Street San Jose 95131 CA USA,"\$0.17 2%","$8.59"
06/04/2025,eBay 0*09-13164-12542 2535 North First Street San Jose 95131 CA USA,"2% $0.60","$29.80"
06/04/2025,WALMART.COM 702 SW 8TH ST 800-925-6278 72716 AR USA,"1% $0.58","$58.29"
06/04/2025,HOMEDEPOT.COM 2455 PACES FERRY ROAD 800-430-3376 303390000 GA USA,"$0.53 2%","$26.58"
06/05/2025,eBay 0*12-13117-41722 2535 North First Street San Jose 95131 CA USA (RETURN),"-2%","$26.61"
06/05/2025,Daily Cash Adjustment,,"$0.53"
06/05/2025,SQ *SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/05/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$1.77 2%","$88.37"
06/05/2025,eBay 0 02-13178-60196 2535 North First Street San Jose 95131 CA USA,"$3.19 2%","$159.66"
06/06/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/07/2025,EXPRESSO CREEK 1085 WEST FIELD AVE HILDALE 84784 UT USA,"$0.23 2%","$11.59"
06/07/2025,WALMART.COM 702 SW 8TH STREET MS100 WALMART.COM 72716 AR USA,"1% $0.24","$24.04"
06/07/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/07/2025,HARBOR FREIGHT TOOLS 5953 W RED CLIFFS DR WASHINGTON 84780 UT USA,"1% $0.75","$74.70"
06/08/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/08/2025,BEES MARKETPLACE 1045SOUTH CENTRAL COLORADO CITY86021 AZ USA,"$0.45 2%","$22.61"
06/09/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/09/2025,TST RED BRICK 385 W TOWNSHIP AVE COLORADO CITY86021 AZ USA,"$0.25 2%","$12.49"
06/09/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.05 2%","$2.49"
06/10/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/10/2025,APPLE.COM/BILL ONE APPLE PARK WAY 866-712-7753 95014 CA USA,"$0.62 3%","$20.61"
06/10/2025,TST RED BRICK 385 W TOWNSHIP AVE COLORADO CITY86021 AZ USA,"$0.22 2%","$10.86"
06/13/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/13/2025,BEES MARKETPLACE 1045SOUTH CENTRAL COLORADO CITY86021 AZ USA,"2% $0.14","$7.10"
06/13/2025,SQ WATER CANYON WINER1050 W Field Ave HILDALE 84784 UT USA,"2% $1.17","$58.44"
06/13/2025,TST THE WINERY CAFE 1050 W Fld Ave Hildale 84784 UT USA,"1% $1.40","$140.37"
06/14/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/14/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.05 2%","$2.60"
06/14/2025,TST RED BRICK 385 W TOWNSHIP AVE COLORADO CITY86021 AZ USA,"$0.22 2%","$10.86"
06/15/2025,TST ESSENTIAL COFFEE 885 W ARIZONA AVE COLORADO CITY86021 AZ USA,"$0.15 2%","$7.25"
06/15/2025,BEES MARKETPLACE 1045SOUTH CENTRAL COLORADO CITY86021 AZ USA,"$0.92 2%","$45.77"
06/16/2025,SOUTHCENTRALUTAHTELEPH45 NORTH 100 WEST ESCALANTE 84726 UT USA,"\$1.35 1%","$134.99"
06/16/2025,Disney Plus 500 South Buena Vista 8889057888 91521 CA USA,"\$0.03 1%","$3.24"
06/17/2025,GITHUB, INC. 88 Colin P Kelly Jr. Street SAN FRANCISCO94107 CA USA,"\$0.15 1%","$15.20"
06/17/2025,APPLE.COM/BILL ONE APPLE PARK WAY 866-712-7753 95014 CA USA,"\$0.36 3%","$11.94"
06/17/2025,YOU NEED A BUDGET LLC 770 E Main St. #236 LEHI 84043 UT USA,"1% $0.16","$16.13"
06/17/2025,GOOGLE YouTube Premium1600 AMPHITHEATRE PKWY 650-253-0000 94043 CA USA,"\$0.25 1%","$24.97"
06/18/2025,THE BORDER STORE 625 N STATE ST HURRICANE 84737 UT USA,"2% $0.74","$37.02"
06/19/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"2% $0.12","$6.00"
06/20/2025,GEICO AUTO One GEICO Plaza 800-841-3000 20076 DC USA,"1% $0.79","$79.02"
06/20/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/20/2025,CHEVRON 0383914 1075 S CENTRAL ST COLORADO CITY86021 AZ USA,"$1.02 2%","$51.07"
06/20/2025,SPOTIFY 4 WORLD TRACE CENTER, 62 8777781161 10007 NY USA,"\$0.13 1%","$13.02"
06/21/2025,BEES MARKETPLACE 1045SOUTH CENTRAL COLORADO CITY86021 AZ USA,"$0.39 2%","$19.56"
06/21/2025,DOLLAR GENERAL #16457 1060 S CENTRAL ST COLORADO CITY86021 AZ USA,"$0.52 2%","$26.00"
06/21/2025,SPOTIFY 4 WORLD TRACE CENTER, 62 8777781161 10007 NY USA (DISPUTE CREDIT),,"-\$13.02"
06/22/2025,APPLE.COM/BILL ONE APPLE PARK WAY 866-712-7753 95014 CA USA,"3% $0.03","$1.08"
06/22/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"2% $0.08","$4.00"
06/22/2025,BEES MARKETPLACE 1045SOUTH CENTRAL COLORADO CITY86021 AZ USA,"2% $0.30","$15.12"
06/23/2025,IN ""LANDMARK TESTING &795 E FACTORY DR 435-9860566 84790 UT USA,"\$1.25 1%","$125.00"
06/23/2025,SQ *SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"\$0.08 2%","$4.00"
06/23/2025,DOLLAR GENERAL #16457 1060 S CENTRAL ST COLORADO CITY86021 AZ USA,"\$0.30 2%","$15.20"
06/24/2025,NETFLIX.COM 121 Albright Way NETFLIX.COM 95032 CA USA,"1% $0.09","$8.68"
06/24/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/24/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.06 2%","$3.00"
06/24/2025,SQ COMMON GROUNDS THR45 W Johnson Ave Colorado City86021 AZ USA,"$0.16 2%","$8.00"
06/25/2025,QLT Habitat for Humani39 S Main Hurricane 84737 UT USA,"2% $0.20","$10.00"
06/25/2025,ALBERTOS MEXICAN FOOD 705 N BLUFF ST SAINT GEORGE 84770 UT USA,"2% $0.30","$15.07"
06/25/2025,HURST ACE HARDWARE 259160 NORTH BLUFF STREET SAINT GEORGE 84770 UT USA,"3% $0.15","$7.46"
06/25/2025,Daily Cash at Ace Hardware,"$0.07 2% 1%",""
06/25/2025,SQ FREEDOM TOWING 625 North State Street Hildale 84784 UT USA,"$3.25 1%","$325.00"
06/26/2025,QLT Habitat for Humani39 S Main Hurricane 84737 UT USA,"$0.90 %2","$45.00"
06/26/2025,Perks Coffee Hurricane 1065 State Street St George 84737 UT USA,"$0.27 2%","$13.63"
06/26/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.22 2%","$10.82"
06/27/2025,SQ SWEET SAGE COFFEE 15 N Central St Ste A Colorado City86021 AZ USA,"$0.08 2%","$4.00"
06/27/2025,CHEVRON 0383914 1075 S CENTRAL ST COLORADO CITY86021 AZ USA,"$1.79 2%","$89.72"
06/28/2025,TST ESSENTIAL COFFEE 885 W ARIZONA AVE COLORADO CITY86021 AZ USA,"$0.19 2%","$9.50"
06/28/2025,BASIC AMERICAN SUPPLY 30 N CENTRAL ST COLORADO CITY86021 AZ USA,"$0.74 2%","$36.84"
06/29/2025,TST RIVER ROCK ROASTIN510 N Main St La Verkin 84745 UT USA,"2 $0.06 %","$3.02"
`



const ParseAppleMonthCSV = (db:any) => new Promise<any[] | null>(async (res, rej)=> {

	let ignored_transaction_sheets_ids: string[] = []
	let existing_transactions: any[] = []
	let quick_notes: any[] = []

	try {
		const ignored_transactions_promise  = db.collection("ignored_transactions").orderBy("ts", "desc").limit(100).get()
		const existing_transactions_promise = db.collection("transactions").orderBy("date", "desc").limit(300).get()
		const quick_notes_promise           = db.collection("quick_notes").orderBy("ts", "desc").limit(200).get()
		
		const [ignored_transactions_snap, existing_transactions_snap, quick_notes_snap] = await Promise.all([
			ignored_transactions_promise, 
			existing_transactions_promise, 
			quick_notes_promise
		]);
		
		ignored_transaction_sheets_ids = ignored_transactions_snap.docs.map((m: any) => m.data().sheets_id);
		existing_transactions = existing_transactions_snap.docs.map((m: any) => ({ id: m.id, ...m.data() }));
		quick_notes = quick_notes_snap.docs.map((m: any) => ({ id: m.id, ...m.data() }));

	} catch {
		rej(); return;
	}

	const transactions: SheetsTransactionT[] = []
	const source_id = '7688adbc-13ef-469f-81d7-1e02098d2d06'
	
	// Parse CSV string
	const csv_lines = apple_csv_str.trim().split('\n')
	
	// Skip header row
	for(let i = 1; i < csv_lines.length; i++) {
		const line = csv_lines[i]
		if (!line.trim()) continue
		
		// Parse CSV line - handle quoted fields with commas
		const fields = parse_csv_line(line)
		if (fields.length < 4) continue
		
		const date_str = fields[0]
		const description = fields[1]
		const daily_cash = fields[2]
		const amount_str = fields[3]
		
		// Skip returns and adjustments
		if (description.includes('(RETURN)') || description.includes('Daily Cash Adjustment')) continue
		
		// Parse date
		const [month, day, year] = date_str.split('/').map(Number)
		const date_timestamp = Date.UTC(year, month - 1, day, 12) / 1000
		
		// Parse amount
		const amount = Math.abs(parseFloat(amount_str.replace(/[$,]/g, '')))
		if (amount === 0) continue
		
		// Create unique ID from date and amount and description
		const sheets_id = `apple_${date_str.replace(/\//g, '')}_${amount}_${description.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`
		
		// Check if already exists or ignored
		if (ignored_transaction_sheets_ids.includes(sheets_id)) continue
		if (is_transaction_duplicate(date_timestamp, amount, existing_transactions)) continue
		
		// Extract merchant name from description
		const merchant = extract_merchant_name(description)
		
		const transaction: SheetsTransactionT = {
			id: sheets_id,
			date: date_timestamp,
			amount: amount,
			merchant: merchant,
			merchant_long: description,
			notes: '',
			source_id: source_id,
		}

		handle_quick_notes(transaction, quick_notes)
		transactions.push(transaction)
	}

	function parse_csv_line(line: string): string[] {
		const fields: string[] = []
		let current_field = ''
		let in_quotes = false
		
		for (let i = 0; i < line.length; i++) {
			const char = line[i]
			
			if (char === '"') {
				in_quotes = !in_quotes
			} else if (char === ',' && !in_quotes) {
				fields.push(current_field.trim())
				current_field = ''
			} else {
				current_field += char
			}
		}
		
		fields.push(current_field.trim())
		return fields
	}

	function extract_merchant_name(description: string): string {
		// Extract merchant name from Apple Card transaction description
		const parts = description.split(' ')
		if (parts.length === 0) return description
		
		// Remove common prefixes
		let merchant_parts = parts.filter(part => 
			!part.match(/^\d+$/) && // Remove numbers
			!part.includes('@') && // Remove email-like parts
			!part.match(/^\d{5}$/) && // Remove zip codes
			!part.match(/^[A-Z]{2}$/) && // Remove state codes
			part !== 'USA' &&
			part !== 'SQ' &&
			part !== 'TST'
		)
		
		// Take first few meaningful words
		return merchant_parts.slice(0, 3).join(' ').trim() || description.split(' ')[0]
	}

	function is_transaction_duplicate(date: number, amount: number, existing_transactions: any[]): boolean {
		const three_days_as_seconds = 3 * 24 * 60 * 60
		return existing_transactions.some((existing_tx: any) => {
			const amount_matches = existing_tx.amount === amount
			const date_matches = existing_tx.date > date - three_days_as_seconds && existing_tx.date < date + three_days_as_seconds
			return amount_matches && date_matches
		})
	}

	function handle_quick_notes(apple_t: SheetsTransactionT, quick_notes: any[]) {
		quick_notes.forEach(qn => {
			const six_days = 518400 // 6 days in seconds
			if ((qn.ts > apple_t.date - six_days && qn.ts < apple_t.date + six_days) && (qn.amount === apple_t.amount)) {
				apple_t.notes = qn.notes
			}
		})
	}

	res(transactions)
})




const Get_Balances = (sheets:any) => new Promise<any[] | null>(async (res, _rej)=> {

	const spreadsheetId = '1YHRpv9RczYKqKuvT9zsbq7zIDkozjRpYDDEHxvmQAjw';
	let response:any = {}
	
	try {
		response = await sheets.spreadsheets.values.get({
			spreadsheetId,
			range: 'Balance History!A2:G20',
		})
	} 
	catch {
		res(null);
		return;
	}
	
	const rows = response.data.values as any[]

	let datestr = ""
	const balances:any[] = []
	
	for(let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (datestr === "") datestr = row[1]

		if (row[1] !== datestr)   break; 

		const auxinfo = ACCOUNT_ID_MAP[row[2]]

		if (!auxinfo) break;

		const x = {
			source_id: auxinfo[0],  
			balance: parseFloat( row[4].slice(1) ) 
		}

		balances.push(x)
	}

	res(balances);
})







const AppleCSV = { 
    ParseAppleMonthCSV
};

export default AppleCSV;


