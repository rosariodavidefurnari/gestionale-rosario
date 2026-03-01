import { describe, expect, it, vi } from "vitest";

import {
  EDGE_FUNCTION_SESSION_REFRESH_BUFFER_MS,
  getEdgeFunctionAuthorizationHeaders,
} from "./edgeFunctions";

describe("getEdgeFunctionAuthorizationHeaders", () => {
  it("reuses the current session when the access token is still valid", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "current-token",
          expires_at: Math.floor((Date.now() + 120_000) / 1000),
        },
      },
      error: null,
    });
    const refreshSession = vi.fn();

    const headers = await getEdgeFunctionAuthorizationHeaders(
      { getSession, refreshSession },
      () => Date.now(),
    );

    expect(headers).toEqual({
      Authorization: "Bearer current-token",
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes the session when the token is missing or about to expire", async () => {
    const now = Date.now();
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "stale-token",
          expires_at: Math.floor(
            (now + EDGE_FUNCTION_SESSION_REFRESH_BUFFER_MS - 5_000) / 1000,
          ),
        },
      },
      error: null,
    });
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "fresh-token",
          expires_at: Math.floor((now + 120_000) / 1000),
        },
      },
      error: null,
    });

    const headers = await getEdgeFunctionAuthorizationHeaders(
      { getSession, refreshSession },
      () => now,
    );

    expect(headers).toEqual({
      Authorization: "Bearer fresh-token",
    });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("throws a clear re-login error when no access token can be resolved", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: new Error("refresh failed"),
    });

    await expect(
      getEdgeFunctionAuthorizationHeaders({ getSession, refreshSession }),
    ).rejects.toThrow(
      "Sessione scaduta. Ricarica la pagina ed effettua di nuovo l'accesso.",
    );
  });
});
