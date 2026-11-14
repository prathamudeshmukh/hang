import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { CardMediaBox } from '@/grid/CardMediaBox';
import { HeroFace } from '@/hero/HeroFace';
import { sameCard, type CardModel } from '@/grid/cardModel';
import { TextArrival } from '@/rewards/TextArrival';
import { ActionText, NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import type { RecentPrint } from './homeLists';
import { HOME_SIZE, useHomeStyles } from './homeStyles';

const STRIP_RATIO = HOME_SIZE.stripHeight / HOME_SIZE.stripWidth;
const LINES = { inPrint: 5, site: 1, caption: 2 } as const;
/** A host never breaks mid-word in a 76dp print: one line that shrinks (two lines let Android split the word). */
const SITE_MIN_SCALE = 0.5;
const IN_INBOX = 'in Inbox';

/** Every kind at one crop: the thumbnail, else the post text or site name on `raised` (DESIGN.md §8 fallbacks, strip-sized). */
function Face({ card }: { readonly card: CardModel }) {
  const styles = useHomeStyles();
  if (card.variant === 'pending') {
    return (
      <View style={styles.stripPending}>
        <NoteText>{card.note}</NoteText>
      </View>
    );
  }
  if (card.media) {
    return (
      <View style={styles.stripFrame}>
        <CardMediaBox id={card.id} media={{ ...card.media, ratio: STRIP_RATIO }} playable={card.variant === 'video'} />
      </View>
    );
  }
  if (card.postText) {
    return (
      <View style={[styles.stripFrame, styles.stripText]}>
        <NameText token="post" numberOfLines={LINES.inPrint}>{card.postText}</NameText>
      </View>
    );
  }
  // Like the grid's link card: the site set large, so the caption's title isn't said twice.
  return (
    <View style={[styles.stripFrame, styles.stripText]}>
      <NameText token="titleS" numberOfLines={LINES.site} adjustsFontSizeToFit minimumFontScale={SITE_MIN_SCALE}>{card.site}</NameText>
    </View>
  );
}

/** Under the print: the title; the raw link while it fetches; what went wrong if it failed. */
function Caption({ card }: { readonly card: CardModel }) {
  const styles = useHomeStyles();
  if (card.variant === 'pending') {
    return <NoteText numberOfLines={LINES.caption} style={[styles.stripCaption, styles.faded]}>{card.url}</NoteText>;
  }
  if (card.variant === 'failed') return <NoteText numberOfLines={LINES.caption} style={styles.stripCaption}>{card.note}</NoteText>;
  return <ActionText token="card" numberOfLines={LINES.caption} style={styles.stripCaption}>{card.title ?? card.site}</ActionText>;
}

interface StripPrintProps {
  readonly print: RecentPrint;
  /** Opens the feed through the strip; must keep its identity, since redraws only follow the print. */
  readonly onOpen: (card: CardModel) => void;
}

export const StripPrint = memo(function StripPrint({ print, onOpen }: StripPrintProps) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  const { card, inInbox } = print;
  return (
    <Pressable
      testID={`item:${card.url}`}
      accessibilityRole="link"
      accessibilityLabel={inInbox ? `${card.accessibilityLabel}, ${IN_INBOX}` : card.accessibilityLabel}
      android_ripple={{ color: color.ripple, foreground: true }}
      onPress={() => onOpen(card)}
      style={styles.stripPrint}
    >
      <TextArrival card={card}>
        <HeroFace id={card.id} drawnOnLayout={card.variant === 'pending' || !card.media?.uri}>
          <Face card={card} />
        </HeroFace>
        {inInbox ? <View style={[styles.inboxDot, styles.printDot]} /> : null}
        <Caption card={card} />
      </TextArrival>
    </Pressable>
  );
}, (previous, next) => previous.print.inInbox === next.print.inInbox && sameCard(previous.print.card, next.print.card));
