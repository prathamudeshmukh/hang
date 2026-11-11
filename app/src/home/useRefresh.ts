import { useCallback, useState } from 'react';
import { syncTriggers } from '@/sync/syncWiring';

/** Pull-to-refresh: skips the backoff wait and spins until that sync settles (it never throws). */
export function useRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncTriggers.refresh();
    } finally {
      setRefreshing(false);
    }
  }, []);
  return { refreshing, onRefresh };
}
