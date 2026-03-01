import type { SupabaseClient } from "@supabase/supabase-js";

export const EDGE_FUNCTION_SESSION_REFRESH_BUFFER_MS = 30_000;

type EdgeFunctionAuthClient = Pick<
  SupabaseClient["auth"],
  "getSession" | "refreshSession"
>;

const isSessionMissingOrStale = (
  session: {
    access_token?: string | null;
    expires_at?: number | null;
  } | null,
  now: number,
) => {
  if (!session?.access_token?.trim()) {
    return true;
  }

  if (session.expires_at == null) {
    return false;
  }

  return (
    session.expires_at * 1000 <= now + EDGE_FUNCTION_SESSION_REFRESH_BUFFER_MS
  );
};

export const getEdgeFunctionAuthorizationHeaders = async (
  auth: EdgeFunctionAuthClient,
  now = () => Date.now(),
) => {
  const {
    data: { session: currentSession },
    error: sessionError,
  } = await auth.getSession();

  if (sessionError) {
    throw new Error("Impossibile verificare la sessione corrente.");
  }

  const nextSession = isSessionMissingOrStale(currentSession, now())
    ? (await auth.refreshSession()).data.session
    : currentSession;

  const accessToken = nextSession?.access_token?.trim();
  if (!accessToken) {
    throw new Error(
      "Sessione scaduta. Ricarica la pagina ed effettua di nuovo l'accesso.",
    );
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
};
