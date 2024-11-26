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
    chainId: "mainnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
});

export const POST = async (req: Request) => {
    try {
        const url = new URL(req.url);
        const choice = url.searchParams.get("choice")!;
        const amount = url.searchParams.get("amount")!;
        const body: ActionPostRequest = await req.json();
        if (!choice) {
            return new Response('Choice not found', {
                status: 400,
                headers,
            });
        }
        if (choice === "H" && !amount && Number(amount)<0) {
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
        const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_HOSTING_SECRET!));
        // Validate to confirm the user publickey received is valid before use
        const transaction = new Transaction();
        if (choice === "H") {     
            const connection = new Connection(
                clusterApiUrl("devnet")
            );
            transaction.add(
                // note: `createPostResponse` requires at least 1 non-memo instruction
                //   ComputeBudgetProgram.setComputeUnitPrice({
                //     microLamports: 1000,
                //   }),
                new TransactionInstruction({
                    programId: new PublicKey(MEMO_PROGRAM_ID),
                    data: Buffer.from(
                        `User chose ${choice} with bet ${amount} SOL`,
                        "utf8"
                    ),
                    keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
                })
            );
            transaction.add(SystemProgram.transfer({
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
        }
        else {
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
                        `User wants wager amount back.`,
                        "utf8"
                    ),
                    keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
                })
            );
            // set the end user as the fee payer
            transaction.feePayer = account;

            // Get the latest Block Hash
            transaction.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash;
        }
        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                type: "transaction",
                transaction,
                message: `Processed Successfully`,
                links: {
                    next: {
                        type: "post",
                        href: (choice==="H")?`/api/actions/hostingProcess?choice=${choice}&amount=${amount}`:`/api/actions/hostback?account=${account}`,
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