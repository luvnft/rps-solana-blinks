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
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction,
  } from "@solana/web3.js";
  
  import bs58 from "bs58";
  
  const headers = createActionHeaders({
    chainId: "devnet",
    actionVersion: "2.2.1",
  });
  
  export const POST = async (req: Request) => {
    try {
      const url = new URL(req.url);
      const amount = url.searchParams.get("amount");
      const choice = url.searchParams.get("choice");
  
      if (!amount || !choice) {
        return new Response('Missing "amount" or "choice" in request', {
          status: 400,
          headers,
        });
      }
  
      const body: ActionPostRequest = await req.json();
      let account: PublicKey;
  
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC || clusterApiUrl("devnet")
      );
  
      const transaction = new Transaction();
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(`User chose ${choice} with bet ${amount} SOL`, "utf8"),
          keys: [],
        })
      );
  
      const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));
  
      let solAmount = choice === "R" ? 0.0001 : choice === "P" ? 0.01 : 0.1;
  
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: account,
          lamports: solAmount * LAMPORTS_PER_SOL,
        })
      );
  
      transaction.feePayer = sender.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      await sendAndConfirmTransaction(connection, transaction, [sender]);
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Your choice was ${choice} with a bet of ${amount} SOL, sending ${solAmount} SOL.`,
        },
      });
  
      return new Response(JSON.stringify(payload), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ message: err?.toString() }), {
        status: 400,
        headers,
      });
    }
  };
  