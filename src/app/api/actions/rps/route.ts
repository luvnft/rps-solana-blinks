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
    
    const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();
    
    const auth = getAuth(app);
    const firestore = getFirestore(app);
  // __________________________________________________________
  let db = await getDoc(doc(firestore, "rps", "moneyPool"));
  let moneyPool = 0;
  if(db.exists()) moneyPool = Number(db.data().value);

  const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });
  export const GET = async (req: Request) => {
    const payload: ActionGetResponse = {
      title: `${moneyPool}`,
      icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
      description:
        "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.",
      label: "Rock Paper Scissors",
      "links": {
      "actions": [
        {
          "label": "Play!", // button text
          "href": "/api/actions/backend?amount={amount}&choice={choice}&player={player}",
          "parameters": [
            {
              type: "select",
              name: "amount", // parameter name in the `href` above
              label: "Bet Amount in SOL", // placeholder of the text input
              required: true,
              options: [
                { label: "1 SOL", value: "1" },
                { label: "0.1 SOL", value: "0.1" },
                { label: "0.01 SOL", value: "0.01" },
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
            {
              type: "radio",
              name: "player", // parameter name in the `href` above
              label: "Who would you like to play against?", // placeholder of the text input
              required: true,
              options: [
                { label: "Our bot (Instant prize)", value: "B" },
                { label: "Friend", value: "F" },
              ],
            },
          ],
          type: "transaction"
        }
      ]
    }
    };
  
    return Response.json(payload, {
      headers,
    });
  };
  
  export const OPTIONS = GET;