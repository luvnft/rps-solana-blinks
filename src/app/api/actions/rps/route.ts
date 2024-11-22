import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    MEMO_PROGRAM_ID,
  } from "@solana/actions";
import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, getDoc, doc } from "firebase/firestore";

  const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });
  export const GET = async (req: Request) => {
    const url = new URL(req.url);
    const amount = url.searchParams.get("amount");
    const player1 = url.searchParams.get("player");
    const host = url.searchParams.get("host");
    let payload: ActionGetResponse;
    if(player1 && host==="F") {
      payload= {
        title: `Player 1 (${player1}) has made a bet of ${amount} SOL. Waiting for Player 2 to make a choice.`,
        icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
        description:`Player 1 has made a bet and is waiting for Player 2 to make a choice and match their bet of ${amount} SOL! Both bet amounts will be pooled together, and the winner will take it all, but in case of a tie, both players will get their bet amount back, after deducting a 10% fee.`,
        label: "Rock Paper Scissors",
        "links": {
        "actions":[
                    {
                    "label": "Play!", // button text
                    "href": `/api/actions/friend?choice={choice}&player=${player1}`,
                    type: "transaction",
                    parameters: [
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
                      ]
                    }
                  ]
      }
      };
    }
    else if(player1 && host==="H") {
      payload= {
        title: `Player 1 (${player1}) has made a bet of ${amount} SOL. Waiting for Player 2 to make a choice.`,
        icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
        description:`Player 1 has made a bet and is waiting for Player 2 to make a choice and match their bet of ${amount} SOL! You can make a bet of lower amount as well and the same amount will be matched by the host as possible and the winner takes the amount and in case of a tie, it will be sent back equally, after deducting a 10% fee.`,
        label: "Rock Paper Scissors",
        "links": {
        "actions":[
                    {
                    "label": "Play!", // button text
                    "href": `/api/actions/friend?choice={choice}&player=${player1}`,
                    type: "transaction",
                    parameters: [
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
                      ]
                    }
                  ]
      }
      };
    }
    else{
    payload = {
      title: "Rock Paper Scissors",
      icon: "https://raw.githubusercontent.com/The-x-35/rps-solana-blinks/refs/heads/main/public/icon.gif",
      description:
        "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.",
      label: "Rock Paper Scissors",
      "links": {
      "actions": [
        {
          "label": "Play!", // button text
          "href": "/api/actions/backend?amount={amount}&choice={choice}&player={player}",
          "parameters": [
            {
              type: "select",
              name: "amount", // parameter name in the `href` above
              label: "Bet Amount in SOL", // placeholder of the text input
              required: true,
              options: [
                { label: "1 SOL", value: "1" },
                { label: "0.1 SOL", value: "0.1" },
                { label: "0.01 SOL", value: "0.01" },
              ],
            },
            {
              type: "radio",
              name: "choice", // parameter name in the `href` above
              label: "Choose your move?", // placeholder of the text input
              required: false,
              options: [
                { label: "Rock", value: "R" },
                { label: "Paper", value: "P" },
                { label: "Scissors", value: "S" },
              ],
            },
            {
              type: "radio",
              name: "player", // parameter name in the `href` above
              label: "Who would you like to play against?", // placeholder of the text input
              required: true,
              options: [
                { label: "Our bot (Instant prize, no fees)", value: "B" },
                { label: "Friend (10% fees cut of total value)", value: "F" },
                { label: "Host your own bot and ask others to play (10% fees cut of total value)", value: "H" },
              ],
            },
          ],
          type: "transaction"
        }
      ]
    }
    };}
  
    return Response.json(payload, {
      headers,
    });
  };
  
  export const OPTIONS = GET;