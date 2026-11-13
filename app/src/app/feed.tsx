import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { readFeedSession } from '@/feed/appFeed';
import { FeedScreen } from '@/feed/FeedScreen';

const asText = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '');

export default function FeedRoute() {
  const params = useLocalSearchParams<{ session: string; start: string }>();
  const token = asText(params.session);
  const [session] = useState(() => readFeedSession(token, asText(params.start)));
  return <FeedScreen session={session} sessionKey={`feed:${token}`} />;
}
