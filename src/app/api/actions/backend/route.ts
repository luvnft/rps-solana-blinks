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

const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });
  
export const POST = async (req: Request) => {
  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url);
    const amount = url.searchParams.get("amount");
    const choice = url.searchParams.get("choice");

    // Ensure the required parameters are present
    if (!amount || !choice) {
      return new Response('Missing "amount" or "choice" in request', {
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

    // Solana Blockchain Cluster (Set Mainnet "mainnet-beta" or Devnet "devnet")
    // If your RPC not present, it will use default devnet RPC provided to us via web3.js "clusterApiUrl("devnet")"
    // NOTE: "clusterApiUrl("devnet")" is not for mainnet use - for mainnet production launched Blinks, get your own RPC
    // For testing on mainnet - use "mainnet-beta"
    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet")
    );

    const transaction = new Transaction().add(
      // note: `createPostResponse` requires at least 1 non-memo instruction
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `User chose ${choice} with bet ${amount} SOL`,
          "utf8"
        ),
        keys: [],
      })
    );


    let solAmount = 0;
    if (choice === "R") solAmount = 0.0001;
    else if (choice === "P") solAmount = 0.01;
    else solAmount = 0.1;

        const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));
        transaction.add(
            new TransactionInstruction({
                programId: new PublicKey(MEMO_PROGRAM_ID),
                data: Buffer.from( `User chose ${choice} with bet ${amount} SOL, sending ${solAmount}.`, "utf8"),
                keys: [],
        }));
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 1000
            }),);
        transaction.feePayer = sender.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const transferInstruction = SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: account,
            lamports: solAmount * LAMPORTS_PER_SOL,
        });
        transaction.add(transferInstruction);
        transaction.sign(sender);


    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Your choice was ${choice} with a bet of ${amount} SOL, sending ${solAmount} SOL.`,
      },
      // no additional signers are required for this transaction
      // signers: [],
    });

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    // let message = "An unknown error occurred";
    let message = err?.toString();
    // if (typeof err == "string") message = err;
    const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));
    return new Response(JSON.stringify({message: sender.publicKey}), {
      status: 400,
      headers, //Must include CORS HEADERS
    });
  }
};