import { _increment } from "../total/route";

export async function POST() {
  _increment(1);
  return Response.json({ ok: true });
}
