import { getHostedSession, toPublicSession } from "@/lib/hosted/auth";
import { isHostedModeEnabled } from "@/lib/hosted/env";
import { noStoreJson } from "@/lib/hosted/responses";

export const runtime = "nodejs";

export async function GET() {
  if (!isHostedModeEnabled()) {
    return noStoreJson({
      enabled: false,
      session: null
    });
  }

  const session = await getHostedSession();
  return noStoreJson({
    enabled: true,
    session: session
      ? toPublicSession({
          user: session.user,
          workspaces: session.workspaces
        })
      : null
  });
}
