/**
 * The message to show for a failed API call: the server's own text, else the fallback.
 * marketflow-api's envelope is {error: <message>, code}; some services send {message}.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;
  return fallback;
}
