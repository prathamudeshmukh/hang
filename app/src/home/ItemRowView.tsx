import { Pressable, Text } from 'react-native';
import type { ItemRow } from './itemRow';
import { listStyles, RIPPLE } from './listStyles';
import { openLink } from './openLink';

const INBOX_MARK = 'Inbox';

/** `markInbox`: on Home's Recently saved, say which items are still unsorted. */
export function ItemRowView({ row, markInbox = false }: { readonly row: ItemRow; readonly markInbox?: boolean }) {
  const meta = [row.host, markInbox && row.inInbox ? INBOX_MARK : null, row.note].filter(Boolean).join(' · ');
  return (
    <Pressable testID={`item:${row.url}`} accessibilityRole="link" android_ripple={RIPPLE} onPress={() => void openLink(row.url)} style={listStyles.row}>
      <Text style={listStyles.rowTitle} numberOfLines={2}>{row.title}</Text>
      <Text style={listStyles.note} numberOfLines={1}>{meta}</Text>
    </Pressable>
  );
}
