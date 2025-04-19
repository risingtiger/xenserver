



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
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});


const plaidClient = new PlaidApi(configuration);




const PlaidCreateLinkToken = () => new Promise<any>(async (res, _rej)=> {

    const request = {
		user: {
			client_user_id: 'unique_user_id_' + Date.now(), 
		},
		client_name: 'My Plaid App',
		products: ['auth', 'transactions'], 
		language: 'en',
		country_codes: ['US'],
    };

    const r   = await plaidClient.linkTokenCreate(request).catch((error:any) => {error} )
	if (r.error)    throw new Error(r.error);


    res({ link_token:r.data.link_token })
})




const PlaidExchangePublicToken = (db:any, public_token:string) => new Promise<any>(async (res, _rej)=> {
    try {
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // Store in Firestore for the hardcoded user
        const userEmail = 'accounts@risingtiger.com';
        const userRef = db.collection('users').doc(userEmail);
        const plaidData = {
            access_token: accessToken,
            item_id: itemId,
            created_at: Math.floor(Date.now() / 1000)
        };

        // Store in a subcollection for the user
        await userRef.collection('plaid_accounts').doc(itemId).set(plaidData);

        // Return success response
        res({ success: true, item_id: itemId });
    } catch (error: any) {
        console.error("Error in PlaidExchangePublicToken:", error);
        res({ success: false, error: error.message });
    }
})




const LinkInstitute = { 
    PlaidCreateLinkToken, 
    PlaidExchangePublicToken 
};

export default LinkInstitute;


