import {
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
const headers = createActionHeaders({
  chainId: "devnet", // or chainId: "devnet"
  actionVersion: "2.2.1", // the desired spec version
});
export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Actions Example - Simple On-chain Memo by Arpit",
    icon: 'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/',
    description: "Send a message on-chain using a Memo",
    label: "Send Memo",
  };

  return Response.json(payload, {
    headers,
  });
}
