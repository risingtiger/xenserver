



//import {FieldValue} from "@google-cloud/firestore"
//import fs from "fs";
import {  } from './defs.js'
//@ts-ignore
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';


const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': (process.env.PLAID_ENV === 'sandbox') ? process.env.PLAID_SECRET_SANDBOX : process.env.PLAID_SECRET_PRODUCTION
    },
  },
});


const plaidClient = new PlaidApi(configuration);




const PlaidCreateLinkToken = () => new Promise<any>(async (res, _rej)=> {

    const request = {
		user: {
			client_user_id: 'unique_user_id_' + Date.now(), 
		},
		client_name: 'Xen Finance',
		products: ['auth', 'transactions'], 
		language: 'en',
		country_codes: ['US'],
    };

    try {
        const response = await plaidClient.linkTokenCreate(request);
        // Check if the response itself indicates an API-level error, though typically the client throws for transport/auth errors.
        // This check might be redundant depending on the client library's behavior for API errors vs. network/auth errors.
        // @ts-ignore - Plaid client types might not explicitly show 'error' on success response, but checking defensively.
        if (response.error) { 
            console.error("Plaid API Error:", response.error);
            _rej(new Error('Plaid API returned an error.')); // Reject the promise
            return; 
        }
        res({ link_token: response.data.link_token });
    } catch (error) {
        console.error("Error creating Plaid link token:", error);
        _rej(error); // Reject the promise with the caught error
    }
})




const PlaidExchangePublicToken = (db:any, public_token:string) => new Promise<any>(async (res, _rej)=> {

	const r = await plaidClient.itemPublicTokenExchange({ public_token }).catch((error:any) => {error} )
	if (r.error) throw new Error(r.error);


	const accessToken = r.data.access_token;
	const itemId = r.data.item_id;

	const userEmail = 'accounts@risingtiger.com';
	const userRef = db.collection('users').doc(userEmail);
	const plaidData = {
		access_token: accessToken,
		item_id: itemId,
		ts: Math.floor(Date.now() / 1000)
	};

	await userRef.collection('plaid').doc(itemId).set(plaidData);

	res({ success: true, item_id: itemId });
})




const PlaidGetBalances = (_db:any, access_token:string) => new Promise<any>(async (res, _rej)=> {

	const r = await plaidClient.accountsBalanceGet({access_token}).catch((error:any) => {error} )
	if (r.error) throw new Error(r.error);

	res(r)
})




const LinkInstitute = { 
    PlaidCreateLinkToken, 
    PlaidExchangePublicToken,
	PlaidGetBalances
};

export default LinkInstitute;


