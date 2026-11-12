import { useAuth } from '@/auth/useAuth';
import { NoteText } from '@/theme/Text';

/** Shows the last sync's error, if it failed; the lists still show what's on the device. */
export function SyncProblem() {
  const { lastSync } = useAuth();
  if (lastSync.kind !== 'error') return null;
  return <NoteText color="ink2">{`Couldn’t sync: ${lastSync.message}`}</NoteText>;
}
