/** The part of a NetInfo state that decides whether a sync could reach the server. */
export interface ConnectionState {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null | undefined;
}

/** Reachability is often unknown for a moment after connecting; that counts as online, a known `false` doesn't. */
export function isOnline({ isConnected, isInternetReachable }: ConnectionState): boolean {
  return isConnected === true && isInternetReachable !== false;
}
