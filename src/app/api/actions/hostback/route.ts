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
import { getAuth } from "firebase/auth";
import { getFirestore, getDoc, doc, deleteDoc } from "firebase/firestore";
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
    chainId: "mainnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
});

export const POST = async (req: Request) => {
    try {
        // Extract the query parameters from the URL
        const url = new URL(req.url);
        const acc = url.searchParams.get("account");

        // Ensure the required parameters are present
        if (!acc) {
            return new Response('Missing "account" in request', {
                status: 400,
                headers,
            });
        }

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
        if (account.toString() != acc) {
            return new Response('Account  mismatch.', {
                status: 400,
                headers, //Must include CORS HEADERS
            });
        }
        let db = await getDoc(doc(firestore, "hosts", account?.toString()));
        let amount = 0;
        let profit = 0;
        if (db.exists()) {
            amount = Number(db.data().amount);
            amount = amount*0.95;
            amount = parseFloat(amount.toFixed(6));
            profit = amount*0.05;
            profit = parseFloat(profit.toFixed(6));
        }
        else{
            return new Response('Account not found in DB.', {
                status: 400,
                headers, //Must include CORS HEADERS
            });
        }

        // Solana Blockchain Cluster (Set Mainnet "mainnet-beta" or Devnet "devnet")
        // If your RPC not present, it will use default devnet RPC provided to us via web3.js "clusterApiUrl("devnet")"
        // NOTE: "clusterApiUrl("devnet")" is not for mainnet use - for mainnet production launched Blinks, get your own RPC
        // For testing on mainnet - use "mainnet-beta"
        const connection = new Connection(
            clusterApiUrl("mainnet-beta")
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
                    `Winner will get money.`,
                    "utf8"
                ),
                keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
            })
        );
        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: account,
            lamports: amount * LAMPORTS_PER_SOL,
        }));
        const P = new PublicKey("HBQwJcDCqEHr8b7LGzww1t8NxAaM9rQjA7QHSuWL7jnD");
        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: P,
            lamports: profit * LAMPORTS_PER_SOL,
        }));

        // set the end user as the fee payer

        transaction.feePayer = account;

        // Get the latest Block Hash
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;
      

        // const nacl = require("tweetnacl");
        // let transaction = new web3.Transaction();
        // transaction.add(
        //     web3.SystemProgram.transfer({
        //       fromPubkey: sender.publickey,
        //       toPubkey: account,
        //       lamports: 1*LAMPORTS_PER_SOL,
        //     }),
        //   );
        //   await web3.sendAndConfirmTransaction(connection, transaction, [sender]);
        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                type: "transaction",
                transaction,
                message: `${amount} SOL sent to your account, Host again!`,
                links: {
                    next: {
                      type: "post",
                      href: `/api/actions/hostbackSuccess`,
                      
                    },
                  },
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
