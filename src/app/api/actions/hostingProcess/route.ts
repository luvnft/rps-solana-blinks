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
import { parse } from "path";

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
        const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_HOSTING_SECRET!));
        // Validate to confirm the user publickey received is valid before use
        const transaction = new Transaction();

        const connection = new Connection(
            clusterApiUrl("devnet")
        );
        transaction.add(
            // note: `createPostResponse` requires at least 1 non-memo instruction
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 1000,
              }),
            new TransactionInstruction({
                programId: new PublicKey(MEMO_PROGRAM_ID),
                data: Buffer.from(
                    `${amount} saved to db for account ${account}`,
                    "utf8"
                ),
                keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
            })
        );
        // transaction.add(SystemProgram.transfer({
        //     fromPubkey: account,
        //     toPubkey: sender.publicKey,
        //     lamports: Number(amount) * LAMPORTS_PER_SOL,
        // }));

        // set the end user as the fee payer
        transaction.feePayer = account;

        // Get the latest Block Hash
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;

        const payload: ActionPostResponse = await createPostResponse({
              fields: {
                type: "transaction",
                transaction,
                message: `Placed with a bet of ${amount} SOL.`,
                links: {
                  next: {
                    type: "inline",
                    action: {
                      type: "action",
                      title: `Successfully submitted your bet of ${amount} SOL to host your own bot.`,
                      icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
                      description: `Congratulations! Your bot is now live on our platform. Share the unique link below to invite others to play against your bot.
                                    https://dial.to/?action=solana-action%3Ahttps%3A%2F%2Frps.sendarcade.fun%2Fapi%2Factions%2Fhosting%3Faccount%3D${account.toString}&cluster=devnet 
                                    `,
                      label: "Rock Paper Scissors",
                      "links": {
                        "actions": []
                      },
                    },
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