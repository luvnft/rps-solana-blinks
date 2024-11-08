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
    PublicKey,
    Transaction,
    TransactionInstruction
  } from "@solana/web3.js";
  
  const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });
  export const GET = async (req: Request) => {
    const payload: ActionGetResponse = {
      title: "Rock Paper Scissors",
      icon: new URL(
        "/icon.png",
        new URL(req.url).origin
      ).toString(),
      description:
        "Let's play Rock Paper Scissors! If you win you get DOUBLE your bet amount, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.",
      label: "Rock Paper Scissors",
      "links": {
      "actions": [
        {
          "label": "Sign Up", // button text
          "href": "/api/donate?amount={amount}&choice={choice}",
          "parameters": [
            {
              type: "select",
              name: "amount", // parameter name in the `href` above
              label: "Donation Amount in SOL", // placeholder of the text input
              required: true,
              options: [
                { label: "1", value: "1" },
                { label: "5", value: "5" },
                { label: "10", value: "10" },
              ],
            },
            {
              type: "radio",
              name: "choice", // parameter name in the `href` above
              label: "Do you want to sign up for our newsletter", // placeholder of the text input
              required: true,
              options: [
                { label: "Yes", value: "1" },
                { label: "No", value: "0" },
              ],
            },
          ],
          type: "transaction"
        }
      ]
    }
    };
  
    return Response.json(payload, {
      headers,
    });
  };
  
  export const OPTIONS = GET;
  
  
  export const POST = async (req: Request) => {
    try {
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
            "This is a simple memo message from Arpit.",
            "utf8"
          ),
          keys: [],
        })
      );
  
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
          message: "Post this memo on-chain",
        },
        // no additional signers are required for this transaction
        // signers: [],
      });
  
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      let message = "An unknown error occurred";
      if (typeof err == "string") message = err;
      return new Response(message, {
        status: 400,
        headers, //Must include CORS HEADERS
      });
    }
  };