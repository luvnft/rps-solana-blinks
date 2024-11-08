import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    MEMO_PROGRAM_ID,
  } from "@solana/actions";
  
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
        "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.",
      label: "Rock Paper Scissors",
      "links": {
      "actions": [
        {
          "label": "Play!", // button text
          "href": "/api/actions/backend?amount={amount}&choice={choice}",
          "parameters": [
            {
              type: "number",
              name: "amount", // parameter name in the `href` above
              label: "Bet Amount in SOL", // placeholder of the text input
              required: true,
            },
            {
              type: "radio",
              name: "choice", // parameter name in the `href` above
              label: "Choose your move?", // placeholder of the text input
              required: true,
              options: [
                { label: "Rock", value: "R" },
                { label: "Paper", value: "P" },
                { label: "Scissors", value: "S" },
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