import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionGetResponse,
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
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";

import bs58 from "bs58";
import { getApps, initializeApp, getApp } from "firebase/app";
import { getDoc, doc, getFirestore, setDoc, deleteDoc } from "firebase/firestore";

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

const firestore = getFirestore(app);


export const POST = async (req: Request) => {
    try {

        const url = new URL(req.url);
        const acc = url.searchParams.get("account")!;
        const bet = url.searchParams.get("bet")!;
        const body: ActionPostRequest = await req.json();
        // Validate to confirm the user publickey received is valid before use

        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers, //Must include CORS HEADERS
            });
        }
        let db = await getDoc(doc(firestore, "hosts", acc));
        let amount = 0;
        if (db.exists()) amount = Number(db.data().amount);
        let pool = amount + Number(bet);
        pool = parseFloat(pool.toFixed(6));
          await setDoc(doc(firestore, "hosts", acc), { amount: pool.toString() });        

        // Solana Blockchain Cluster (Set Mainnet "mainnet-beta" or Devnet "devnet")
        // If your RPC not present, it will use default devnet RPC provided to us via web3.js "clusterApiUrl("devnet")"
        // NOTE: "clusterApiUrl("devnet")" is not for mainnet use - for mainnet production launched Blinks, get your own RPC
        // For testing on mainnet - use "mainnet-beta"
        const connection = new Connection(
            clusterApiUrl("devnet")
        );
        const web3 = require("@solana/web3.js");
        const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_HOSTING_SECRET!));

        const transaction = new Transaction().add(
            // note: `createPostResponse` requires at least 1 non-memo instruction
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 1000,
            }),
            new TransactionInstruction({
                programId: new PublicKey(MEMO_PROGRAM_ID),
                data: Buffer.from(
                    `User`,
                    "utf8"
                ),
                keys: [],
            })
        );

        transaction.feePayer = account;

        // Get the latest Block Hash
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                type: "transaction",
                transaction,
                message: `Sucess`,
            },
            // no additional signers are required for this transaction
            signers: [sender],
        });


        return Response.json(payload, {
            headers,
        });
    } catch (err) {
        console.log(err);
        const message = typeof err === "string" ? err : err?.toString() || "An unknown error occurred";
        return new Response(JSON.stringify({ message }), {
            status: 400,
            headers,
        });
    }

};