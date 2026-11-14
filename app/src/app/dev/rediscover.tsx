import { router } from 'expo-router';
import { useEffect } from 'react';
import { db } from '@/db/client';
import { DEV_TOOLS_ON } from '@/dev/devTools';
import { backdateForRediscover } from '@/dev/rediscoverBackdate';

/** `hang://dev/rediscover` (#34): gives Rediscover a pick in a young library, then goes Home to watch it develop. */
export default function DevRediscover() {
  useEffect(() => {
    if (DEV_TOOLS_ON) backdateForRediscover(db, new Date());
    // Back to the Home already in the stack: a second, freshly mounted Home cut italic notes short on the S23.
    router.dismissTo('/');
  }, []);
  return null;
}
