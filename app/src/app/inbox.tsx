import { PlaceScreen } from '@/home/PlaceScreen';

const INBOX = { kind: 'inbox' } as const;

export default function Inbox() {
  return <PlaceScreen place={INBOX} />;
}
