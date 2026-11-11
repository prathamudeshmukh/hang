import { useLocalSearchParams } from 'expo-router';
import { PlaceScreen } from '@/home/PlaceScreen';

export default function CollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaceScreen place={{ kind: 'collection', id: typeof id === 'string' ? id : '' }} />;
}
