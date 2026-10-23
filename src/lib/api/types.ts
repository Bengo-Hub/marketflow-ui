/** The list envelope every paginated marketflow-api endpoint returns (shared pagination module). */
export interface Paginated<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  has_more?: boolean;
}

/** Rows from a list response, whether the endpoint wraps them in {data} or returns a bare array. */
export function rows<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  const data = (body as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/** Total from a list response, falling back to the row count. */
export function totalOf(body: unknown): number {
  const total = (body as { total?: unknown } | null)?.total;
  return typeof total === "number" ? total : rows(body).length;
}
