import { Text, type LayoutChangeEvent } from 'react-native';
import { NameText } from '@/theme/Text';
import { FONT_FILE } from '@/theme/typeScale';
import type { Imprint } from '../feedPage';
import { usePostStyles } from './postStyles';

const HANDLE_FONT = { fontFamily: FONT_FILE.textItalic } as const;

/** Who said it signs the words, under the last line: the name upright, then *@handle* as a note (DESIGN.md §8). */
export function PostImprint({ imprint, onLayout }: { readonly imprint: Imprint | null; readonly onLayout: (event: LayoutChangeEvent) => void }) {
  const styles = usePostStyles();
  if (imprint === null) return null;
  const { author, handle } = imprint;
  return (
    <NameText token="imprint" testID="feed-imprint" numberOfLines={1} style={styles.imprint} onLayout={onLayout}>
      {author}
      {author && handle ? ' ' : null}
      {handle ? <Text style={[HANDLE_FONT, styles.handle]}>{handle}</Text> : null}
    </NameText>
  );
}
