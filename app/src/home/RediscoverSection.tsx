import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { CardMediaBox } from '@/grid/CardMediaBox';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { openItem, stampRediscovered } from './appItemActions';
import type { RediscoverPick } from './homeLists';
import { useHomeStyles } from './homeStyles';

const SQUARE = 1;
const TITLE_LINES = 3;

/** The day's pick is stamped the first time it's on screen, so it holds until tomorrow (SPEC §5). */
function useStampOnFirstShow(pick: RediscoverPick, day: string) {
  const { id } = pick.card;
  const { stampedToday } = pick;
  useEffect(() => {
    if (!stampedToday) stampRediscovered(id, day);
  }, [id, stampedToday, day]);
}

export function RediscoverSection({ pick, day }: { readonly pick: RediscoverPick; readonly day: string }) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  const { card } = pick;
  useStampOnFirstShow(pick, day);
  return (
    <>
      <View style={styles.sectionLabel}>
        <NameText token="titleS">Rediscover</NameText>
        {pick.savedNote ? <NoteText>{pick.savedNote}</NoteText> : null}
      </View>
      <Pressable
        testID={`rediscover:${card.url}`}
        accessibilityRole="link"
        accessibilityLabel={`Rediscover: ${card.accessibilityLabel}`}
        android_ripple={{ color: color.ripple }}
        onPress={() => void openItem(card)}
        style={styles.rediscover}
      >
        <View style={styles.rediscoverFrame}>
          {card.media ? <CardMediaBox id={card.id} media={{ ...card.media, ratio: SQUARE }} /> : null}
        </View>
        <View style={styles.rowText}>
          <NameText token="titleS" numberOfLines={TITLE_LINES}>{card.title ?? card.site}</NameText>
          <NoteText numberOfLines={1}>{card.note}</NoteText>
        </View>
      </Pressable>
    </>
  );
}
