import { Text } from 'react-native';
import { useAuth } from '@/auth/useAuth';
import { listStyles } from './listStyles';

/** Shows the last sync's error, if it failed; the lists still show what's on the device. */
export function SyncProblem() {
  const { lastSync } = useAuth();
  if (lastSync.kind !== 'error') return null;
  return <Text style={listStyles.error}>{`Couldn’t sync: ${lastSync.message}`}</Text>;
}
