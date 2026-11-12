import { View } from 'react-native';
import { Icon } from '@/theme/icons/Icon';
import { ActionText, NameText, NoteText } from '@/theme/Text';
import type { CardModel, CardVariant } from './cardModel';
import { CardMediaBox } from './CardMediaBox';
import { useGridStyles } from './gridStyles';

const LINES = { cardTitle: 3, textCardTitle: 5, site: 2, post: 8, rawUrl: 2 } as const;

type Body = (props: { readonly card: CardModel }) => React.JSX.Element;

function Caption({ card, withTitle = true }: { readonly card: CardModel; readonly withTitle?: boolean }) {
  const styles = useGridStyles();
  return (
    <View style={styles.caption}>
      {withTitle && card.title ? <ActionText token="card" numberOfLines={LINES.cardTitle}>{card.title}</ActionText> : null}
      <NoteText numberOfLines={1}>{card.note}</NoteText>
    </View>
  );
}

/** No image: the title set in Newsreader on `raised` (articles, and videos without a poster). */
function TitleCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <View style={styles.textCard}>
        <NameText token="titleS" numberOfLines={LINES.textCardTitle}>{card.title ?? card.site}</NameText>
        {card.variant === 'video' ? <Icon name="play" /> : null}
      </View>
      <Caption card={card} withTitle={false} />
    </>
  );
}

/** No image size known: the site name set large, the title below (links, failed reads, images without a thumbnail). */
function SiteCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <View style={styles.textCard}>
        <NameText token="title" numberOfLines={LINES.site}>{card.site}</NameText>
      </View>
      <Caption card={card} />
    </>
  );
}

function withMedia(Fallback: Body, options: { readonly playable?: boolean } = {}): Body {
  return function MediaCard({ card }) {
    if (!card.media) return <Fallback card={card} />;
    return (
      <>
        <CardMediaBox id={card.id} media={card.media} playable={options.playable} />
        <Caption card={card} />
      </>
    );
  };
}

function PostCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <View style={styles.post}>
        <NameText token="post" numberOfLines={LINES.post}>{card.postText ?? card.title ?? card.site}</NameText>
      </View>
      {card.media ? <View style={styles.postMedia}><CardMediaBox id={card.id} media={card.media} /></View> : null}
      <Caption card={card} withTitle={false} />
    </>
  );
}

function PendingCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <View style={styles.pending}>
        <NoteText>{card.note}</NoteText>
      </View>
      <View style={[styles.caption, styles.faded]}>
        <NoteText numberOfLines={LINES.rawUrl}>{card.url}</NoteText>
      </View>
    </>
  );
}

/** DESIGN.md §8, one anatomy per variant. */
export const CARD_BODIES: Readonly<Record<CardVariant, Body>> = {
  article: withMedia(TitleCard),
  video: withMedia(TitleCard, { playable: true }),
  post: PostCard,
  image: withMedia(SiteCard),
  link: withMedia(SiteCard),
  failed: withMedia(SiteCard),
  pending: PendingCard,
};
