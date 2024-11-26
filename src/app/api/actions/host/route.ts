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
import { getFirestore, getDoc, doc, deleteDoc, setDoc } from "firebase/firestore";

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
let description: string = "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.";

export const POST = async (req: Request) => {
  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url);
    const choice = url.searchParams.get("choice")!;
    const host = url.searchParams.get("host")!;
    const bet = Number(url.searchParams.get("amount"))!;
    let hostchoice = "";
    let db = await getDoc(doc(firestore, "hosts", host?.toString()));
    let amount = 0;
    if (db.exists()) {
      amount = Number(db.data().amount);
      amount = parseFloat(amount.toFixed(4));
    }
    else {
      return new Response('Bet not found.', {
        status: 400,
        headers,
      });
    }

    // Ensure the required parameters are present
    if (!amount || !choice || !host || !bet) {
      return new Response('Bet not found.', {
        status: 400,
        headers,
      });
    }
    if (bet > amount) {
      return new Response('Bet not not valid.', {
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
    // Determine game outcome based on 70% lose, 20% draw, 10% win
    const random = Math.floor(Math.random() * 10); // Generates 0 to 9
    if (random < 7) winner = "player1";
    else if (random < 9) winner = "Tie";
    else winner = "player2";


    if (winner === "player2") {
      hostchoice = choice === "R" ? "S" : choice === "P" ? "R" : "P"; // Win scenario
    }
    if (winner === "player1") {
      hostchoice = choice === "R" ? "P" : choice === "P" ? "S" : "R"; // Lose scenario
    } else {
      hostchoice = choice; // Draw scenario
      await setDoc(doc(firestore, "players", account.toString()), { amount: Number(amount) });
    }


    if (winner === "Tie") {
      title = "It's a tie!";
      description = `It's a draw! You chose ${formatChoice(choice)} and player1 chose ${formatChoice(hostchoice)}. You both get your bet SOL back. Play again!`;
    }
    else if (winner === "player1") {
      title = `Host(${host}) wins!`;
      description = `Unlucky! You chose ${formatChoice(choice)} and player1 chose ${formatChoice(hostchoice)}. Try your luck again!`;
    }
    else {
      title = `Player 2(${account.toString()}) wins!`;
      description = `Congratulations! You chose ${formatChoice(choice)} and player1 chose ${formatChoice(hostchoice)}. You won double your bet SOL! Claim your prize by clicking the button below now.`;
    }

    if (choice === "R" && hostchoice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RW.png";
    else if (choice === "S" && hostchoice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SW.png";
    else if (choice === "P" && hostchoice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PW.png";
    else if (choice === "S" && hostchoice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SL.png";
    else if (choice === "P" && hostchoice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PL.png";
    else if (choice === "R" && hostchoice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RL.png";
    else if (choice === "R" && hostchoice === "R") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/RD.png";
    else if (choice === "S" && hostchoice === "S") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/SD.png";
    else if (choice === "P" && hostchoice === "P") image = "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/PD.png";
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
          `${winner} won SOL`,
          "utf8"
        ),
        keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
      })
    );
    transaction.add(web3.SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: sender.publicKey,
      lamports: Number(bet) * LAMPORTS_PER_SOL,
    }));
    // set the end user as the fee payer
    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    await setDoc(doc(firestore, "hplayers", account.toString()), { amount: bet.toString(), host: host });

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Unlucky,You lost! Play again.`,
        links: {
          next: (winner != "player1") ? {
            type: "inline",
            action: {
              type: "action",
              title: `${title}`,
              icon: new URL(`${image}`, new URL(req.url).origin).toString(),
              description: `${description}`,
              label: "Rock Paper Scissors",
              "links": {
                "actions": [
                  {
                    "label": "Claim Prize", // button text
                    "href": `/api/actions/hresult?account=${account.toString()}&winner=${winner}`,
                    type: "transaction"
                  }
                ]
              }
            },
          } : {
            type: "post",
            href: `/api/actions/hostWin/?account=${host.toString()}&bet=${bet}`,
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