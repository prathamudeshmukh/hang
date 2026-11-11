import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

/**
 * Reads now and again after local writes (share sheet, sync, this screen), since they all use one
 * connection. The listener fires once per changed row, so a pull of hundreds of rows is folded into
 * one read on the next tick. `key` names what is read, so a new route param re-reads straight away.
 */
export function useLiveQuery<T>(read: () => T, key: string): T {
  const [value, setValue] = useState(read);
  const latestRead = useRef(read);

  useEffect(() => {
    latestRead.current = read;
  });

  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const reread = () => {
      pending = null;
      setValue(latestRead.current());
    };
    reread();
    const subscription = addDatabaseChangeListener(() => {
      pending ??= setTimeout(reread, 0);
    });
    return () => {
      subscription.remove();
      if (pending) clearTimeout(pending);
    };
  }, [key]);

  return value;
}
