import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

function msUntilNextMidnight(now: Date): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Now, refreshed when the app comes back to the front and at local midnight, so the greeting,
 * the date and Rediscover's day never go stale on a Home left open.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setToday(new Date()), msUntilNextMidnight(today));
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}
