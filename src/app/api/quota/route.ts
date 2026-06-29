import { checkQuota } from "@/lib/rate-limit/server";
import { getClientIp, getOrCreateSessionId } from "@/lib/server/session";

export async function GET(request: Request) {
  const sessionId = await getOrCreateSessionId();
  const identifier = `${getClientIp(request)}:${sessionId}`;
  const quota = await checkQuota(identifier);
  return Response.json(quota);
}
