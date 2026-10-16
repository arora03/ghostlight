/**
 * Represents either a successful computation containing a value of type T,
 * or a failed computation containing an error of type E.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Constructs a successful Result containing the given value.
 *
 * @param value - The value of the successful result.
 * @returns A successful Result object.
 */
export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

/**
 * Constructs a failed Result containing the given error.
 *
 * @param error - The error payload of the failure.
 * @returns A failed Result object.
 */
export function err<E, T = never>(error: E): Result<T, E> {
  return { ok: false, error };
}
