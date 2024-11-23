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

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const firestore = getFirestore(app);
// __________________________________________________________

const headers = createActionHeaders({
  chainId: "devnet", // or chainId: "devnet"
  actionVersion: "2.2.1", // the desired spec version
});


function formatChoice(choice: string): string {
  switch (choice) {
    case "R":
      return "rock";
    case "S":
      return "scissors";
    case "P":
      return "paper";
    default:
      return choice;
  }
}

let title = "Rock Paper Scissors";
let image: string = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif";

export const POST = async (req: Request) => {
  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url);
    const choice = url.searchParams.get("choice")!;
    const player1 = url.searchParams.get("player")!;

    let db = await getDoc(doc(firestore, "players", player1?.toString()));
    let amount = 0;
    let P1choice = "";
    if (db.exists()) amount = Number(db.data().amount);
    if (db.exists()) P1choice = db.data().choice;

    // Ensure the required parameters are present
    if (!amount) {
      return new Response('Bet not found.', {
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

    let winner = "";
    if (P1choice === choice) winner = "Tie";
    else if (P1choice === "R" && choice === "S") winner = "player1";
    else if (P1choice === "S" && choice === "P") winner = "player1";
    else if (P1choice === "P" && choice === "R") winner = "player1";
    else winner = "player2";

    if (winner === "Tie") title = "It's a tie!";
    else if (winner === "player1") title = `Player 1(${player1}) wins!`;
    else title = `Player 2(${account.toString()}) wins!`;

    if (choice === "R" && P1choice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RW.png";
    else if (choice === "S" && P1choice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SW.png";
    else if (choice === "P" && P1choice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PW.png";
    else if (choice === "S" && P1choice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SL.png";
    else if (choice === "P" && P1choice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PL.png";
    else if (choice === "R" && P1choice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RL.png";
    else if (choice === "R" && P1choice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RD.png";
    else if (choice === "S" && P1choice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SD.png";
    else if (choice === "P" && P1choice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PD.png";
    // Solana Blockchain Cluster (Set Mainnet "mainnet-beta" or Devnet "devnet")
    // If your RPC not present, it will use default devnet RPC provided to us via web3.js "clusterApiUrl("devnet")"
    // NOTE: "clusterApiUrl("devnet")" is not for mainnet use - for mainnet production launched Blinks, get your own RPC
    // For testing on mainnet - use "mainnet-beta"
    const connection = new Connection(
      clusterApiUrl("devnet")
    );
    const web3 = require("@solana/web3.js");
    const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));

    const transaction = new Transaction().add(
      // note: `createPostResponse` requires at least 1 non-memo instruction
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `User won ${amount} SOL`,
          "utf8"
        ),
        keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
      })
    );
    transaction.add(web3.SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: sender.publicKey,
      lamports: Number(amount) * LAMPORTS_PER_SOL,
    }));
    // set the end user as the fee payer
    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    await deleteDoc(doc(firestore, "players", player1?.toString()));
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
        message: `Your choice was ${formatChoice(choice)} with a bet of ${amount} SOL.`,
        links: {
          next: {
            type: "inline",
            action: {
              type: "action",
              title: `${title}`,
              icon: new URL(`${image}`, new URL(req.url).origin).toString(),
              description: `Claim your prize below!`,
              label: "Rock Paper Scissors",
              "links": {
                "actions": [
                  {
                    "label": "Claim Prize", // button text
                    "href": `/api/actions/fresult?amount=${amount}&winner=${winner}&player1=${player1}&player2=${account.toString()}`,
                    type: "transaction"
                  }
                ]
              }
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