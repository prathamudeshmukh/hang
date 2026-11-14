import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { CardMediaBox } from '@/grid/CardMediaBox';
import { Develop } from '@/rewards/Develop';
import { rediscoverEntry } from '@/rewards/rediscoverEntry';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { hero } from '@/hero/appHero';
import { HeroFace, HeroScope } from '@/hero/HeroFace';
import { HOME_SCOPE } from '@/hero/origins';
import { useScrollersOrigin } from '@/hero/useOrigins';
import { stampRediscovered } from './appItemActions';
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

/** Key it by the pick and the day: it remembers whether the pick was stamped when this Home first drew it. */
export function RediscoverSection({ pick, day }: { readonly pick: RediscoverPick; readonly day: string }) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  const reduceMotion = useReducedMotion();
  const [stampedWhenFirstShown] = useState(pick.stampedToday);
  const { card } = pick;
  useStampOnFirstShow(pick, day);
  useScrollersOrigin(HOME_SCOPE.rediscover, [card.id], null);
  return (
    <HeroScope scope={HOME_SCOPE.rediscover}>
      <View style={styles.sectionLabel}>
        <NameText token="titleS">Rediscover</NameText>
        {pick.savedNote ? <NoteText>{pick.savedNote}</NoteText> : null}
      </View>
      <Pressable
        testID={`rediscover:${card.url}`}
        accessibilityRole="link"
        accessibilityLabel={`Rediscover: ${card.accessibilityLabel}`}
        android_ripple={{ color: color.ripple }}
        // One thing a day: the feed holds only this pick (#31).
        onPress={() => hero.open({ ids: [card.id], card, scope: HOME_SCOPE.rediscover })}
        style={styles.rediscover}
      >
        <Develop entry={rediscoverEntry({ stampedWhenFirstShown, reduceMotion })}>
          <HeroFace id={card.id} drawnOnLayout={!card.media?.uri} style={styles.rediscoverFrame}>
            {card.media ? <CardMediaBox id={card.id} media={{ ...card.media, ratio: SQUARE }} /> : null}
          </HeroFace>
        </Develop>
        <View style={styles.rowText}>
          <NameText token="titleS" numberOfLines={TITLE_LINES}>{card.title ?? card.site}</NameText>
          <NoteText numberOfLines={1}>{card.note}</NoteText>
        </View>
      </Pressable>
    </HeroScope>
  );
}
