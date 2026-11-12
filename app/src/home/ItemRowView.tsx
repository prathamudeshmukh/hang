import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import type { ItemRow } from './itemRow';
import { useListStyles } from './listStyles';
import { openLink } from './openLink';

const INBOX_MARK = 'Inbox';

/** `markInbox`: on Home's Recently saved, say which items are still unsorted. */
export function ItemRowView({ row, markInbox = false }: { readonly row: ItemRow; readonly markInbox?: boolean }) {
  const styles = useListStyles();
  const { color } = useTheme();
  const meta = [row.host, markInbox && row.inInbox ? INBOX_MARK : null, row.note].filter(Boolean).join(' · ');
  return (
    <Pressable testID={`item:${row.url}`} accessibilityRole="link" android_ripple={{ color: color.ripple }} onPress={() => void openLink(row.url)} style={styles.row}>
      {row.thumbUri ? <Image source={{ uri: row.thumbUri }} style={styles.thumb} contentFit="cover" accessible={false} /> : null}
      <View style={styles.rowText}>
        <NameText token="titleS" numberOfLines={2}>{row.title}</NameText>
        <NoteText numberOfLines={1}>{meta}</NoteText>
      </View>
    </Pressable>
  );
}
