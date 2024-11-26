import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionPostRequest,
    MEMO_PROGRAM_ID,
} from "@solana/actions";

import {
    clusterApiUrl,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";

import bs58 from "bs58";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { Router, useRouter } from "next/router";
import { parse } from "path";
import { use } from "react";

const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
});
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
export const POST = async (req: Request) => {
    try {
        const url = new URL(req.url);
        const amount = url.searchParams.get("amount")!;
        const body: ActionPostRequest = await req.json();
        if (!amount) {
            return new Response('Amount not found', {
                status: 400,
                headers,
            });
        }
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers, //Must include CORS HEADERS
            });
        }
        let h = await getDoc(doc(firestore, "hosts", account.toString()));
        let moneyPool = 0;
        if (h.exists()) {
            moneyPool = parseFloat(Number(h.data().amount).toFixed(4));
            moneyPool += parseFloat(Number(amount).toFixed(4));
            await setDoc(doc(firestore, "hosts", account.toString()), { amount: moneyPool });
        }
        else {
            await setDoc(doc(firestore, "hosts", account.toString()), { amount: amount });
        }
        const router = useRouter();
        router.push(`/api/actions/hosting?account=${account}`);
    } catch (err) {
        console.log(err);
        const message = typeof err === "string" ? err : err?.toString() || "An unknown error occurred";
        return new Response(JSON.stringify({ message }), {
            status: 400,
            headers,
        });
    }

};