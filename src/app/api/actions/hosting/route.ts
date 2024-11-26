import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    MEMO_PROGRAM_ID,
  } from "@solana/actions";
  import { getApps, initializeApp, getApp } from "firebase/app";
  import { getAuth } from "firebase/auth";
  import { getFirestore, getDoc, doc } from "firebase/firestore";
  // Firebase _______________________________________________
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  // __________________________________________________________
  
  const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  
  const auth = getAuth(app);
  
  
  const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });
  export const GET = async (req: Request) => {
    const url = new URL(req.url);
    const account = url.searchParams.get("account");
    let payload: ActionGetResponse;
    if (account) {
      const firestore = getFirestore(app);
      let db = await getDoc(doc(firestore, "hosts", account.toString()));
      let amount = 0;
      if (db.exists()) amount = Number(db.data().amount);
      amount = parseFloat(amount.toFixed(4));
      payload = {
        title: `Double or Nothing: Rock Paper Scissors`,
        icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
        description: ``,
        label: "Rock Paper Scissors",
        "links": {
          "actions": [
            {
              "label": "Play!", // button text
              "href": `/api/actions/host?choice={choice}&host=${account}&amount={amount}`,
              type: "transaction",
              parameters: [
                {
                  type: "select",
                  name: "amount", // parameter name in the `href` above
                  label: "Bet Amount in SOL", // placeholder of the text input
                  required: true,
                  options: (amount<0.1)?[
                    { label: `${amount} SOL`, value: `${amount.toString()}` },
                    { label: `${amount/2} SOL`, value: `${(amount/2).toString()}` },
                    { label: `${amount/4} SOL`, value: `${(amount/4).toString()}` },
                  ]:[
                    { label: "0.1 SOL", value: "0.1" },
                    { label: "0.01 SOL", value: "0.01" },
                    { label: "0.005 SOL", value: "0.005" },
                  ],
                },
                {
                  type: "radio",
                  name: "choice", // parameter name in the `href` above
                  label: "Choose your move?", // placeholder of the text input
                  required: true,
                  options: [
                    { label: "Rock", value: "R" },
                    { label: "Paper", value: "P" },
                    { label: "Scissors", value: "S" },
                  ],
                },
              ]
            }
          ]
        }
      };
    }
    else {
      payload = {
        title: "Double or Nothing: Rock Paper Scissors. Host your own bot.",
        icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
        description:
          "",
        label: "Rock Paper Scissors",
        "links": {
          "actions": [
            {
              "label": "Go!", // button text
              "href": `/api/actions/hostingbackend?amount={amount}&choice={choice}`,
              "parameters": [
                {
                  type: "radio",
                  name: "choice", // parameter name in the `href` above
                  label: "What do you want to do?", // placeholder of the text input
                  required: true,
                  options: [
                    { label: "Host bot", value: "H" },
                    { label: "Claim your amount back", value: "C" },
                  ],
                },
                {
                  type: "number",
                  name: "amount", // parameter name in the `href` above
                  label: "Bet Amount in SOL", // placeholder of the text input
                  required: false,
                },
                ],
              type: "transaction"
            }
          ]
        }
      };
    }
  
    return Response.json(payload, {
      headers,
    });
  };
  
  export const OPTIONS = GET;