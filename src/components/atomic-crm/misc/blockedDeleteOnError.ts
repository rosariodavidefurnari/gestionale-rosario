import type { useNotify } from "ra-core";

type NotifyFn = ReturnType<typeof useNotify>;

/** Postgres SQLSTATE for foreign_key_violation (surfaced by PostgREST). */
const FK_VIOLATION = "23503";

/**
 * Builds an `onError` handler for a pessimistic `DeleteButton` on records
 * protected by an `ON DELETE NO ACTION/RESTRICT` foreign key (clients,
 * projects). When the server rejects the delete with a blocking FK
 * (Postgres SQLSTATE 23503), it shows a clear Italian message instead of the
 * raw PostgREST error.
 *
 * Note: PostgREST exposes the SQLSTATE on `error.body.code`, NOT `error.code`
 * (ra-core wraps it in an HttpError with `{ message, status, body }`).
 */
export const blockedDeleteOnError =
  (notify: NotifyFn, blockedMessage: string) =>
  (error: unknown): void => {
    const code = (error as { body?: { code?: string } })?.body?.code;
    notify(
      code === FK_VIOLATION
        ? blockedMessage
        : ((error as { message?: string })?.message ??
            "ra.notification.http_error"),
      { type: "error" },
    );
  };
