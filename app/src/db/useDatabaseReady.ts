import { useEffect, useState } from 'react';
import { ensureMigrated } from './client';

export type DatabaseState = { readonly status: 'migrating' } | { readonly status: 'ready' } | { readonly status: 'failed'; readonly error: Error };

export function useDatabaseReady(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ status: 'migrating' });
  useEffect(() => {
    let active = true;
    ensureMigrated().then(
      () => active && setState({ status: 'ready' }),
      (error: unknown) => active && setState({ status: 'failed', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}
