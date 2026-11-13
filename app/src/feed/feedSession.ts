/** What the feed swipes through: a snapshot of ids in the order the opener showed them (#31). */
export interface FeedSession {
  readonly ids: readonly string[];
  readonly start: string;
}

interface StoredSession {
  readonly token: string;
  readonly session: FeedSession;
}

const alone = (start: string): FeedSession => ({ ids: [start], start });

/**
 * Hands a list to the feed route without putting hundreds of ids in its URL. Only one feed is open at a
 * time, so only the latest session is kept; a route restored after a restart gets its start item alone.
 */
export function createFeedSessions(newToken: () => string) {
  let latest: StoredSession | null = null;
  return {
    begin(session: FeedSession): string {
      const token = newToken();
      latest = { token, session: session.ids.includes(session.start) ? session : alone(session.start) };
      return token;
    },
    read(token: string, start: string): FeedSession {
      return latest?.token === token ? latest.session : alone(start);
    },
  };
}

export function startIndex(session: FeedSession): number {
  return session.ids.indexOf(session.start);
}
