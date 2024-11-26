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
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";


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

const headers = createActionHeaders({
  chainId: "mainnet", // or chainId: "devnet"
  actionVersion: "2.2.1", // the desired spec version
});

export const POST = async (req: Request) => {
  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url);
    const winner = url.searchParams.get("winner");
    let bet = 0;
    let player1 = "";
    const player2 = url.searchParams.get("account")!;
    // Ensure the required parameters are present
    if (!player2) {
      return new Response('Missing arguments in request', {
        status: 400,
        headers,
      });
    }
    let db = await getDoc(doc(firestore, "hplayers", player2?.toString()));
    let pool = 0;
    if (db.exists()) {
      player1 = db.data().host;
      bet = parseFloat(Number(db.data().amount).toFixed(4));
    }
    else {
      return new Response('Bet not found', {
        status: 400,
        headers,
      });
    }
    let h = await getDoc(doc(firestore, "hosts", player1));
    if (h.exists()) {
      pool = Number(h.data().amount);
    }
    else {
      return new Response('Host not found', {
        status: 400,
        headers,
      });
    }
    pool = pool - bet
    let prizePool = 2 * bet;
    prizePool = parseFloat(prizePool.toFixed(4));


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

    const P1PubKey = new PublicKey(player1);
    const P2PubKey = new PublicKey(player2);
    prizePool = parseFloat(prizePool.toFixed(4));

    if (winner === "player2") {
      transaction.add(web3.SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: P2PubKey,
        lamports: prizePool * LAMPORTS_PER_SOL,
      }));
    }
    else {
      pool = pool + prizePool / 2;
      transaction.add(web3.SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: P2PubKey,
        lamports: (prizePool / 2) * LAMPORTS_PER_SOL,
      }));
    }
    // set the end user as the fee payer

    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    pool = parseFloat(pool.toFixed(4));
    await setDoc(doc(firestore, "hosts", player1), { amount: pool.toString() });
    await deleteDoc(doc(firestore, "hplayers", player2));

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
        message: (winner === "Tie") ? `${prizePool / 2} sent to each player, Play again!` : `${prizePool} SOL sent to the winner, Play again!`
        ,
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