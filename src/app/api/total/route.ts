let totalClicks = 0; // in-memory mock

export async function GET() {
  return Response.json({ total: totalClicks });
}

// helper for other routes in same runtime
export function _increment(n = 1) {
  totalClicks += n;
}
