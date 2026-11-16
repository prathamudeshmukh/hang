import { View } from 'react-native';
import { HeroFace } from '@/hero/HeroFace';
import { Icon } from '@/theme/icons/Icon';
import { ActionText, NameText, NoteText } from '@/theme/Text';
import { postWords, type CardModel, type CardVariant } from './cardModel';
import { CardMediaBox } from './CardMediaBox';
import { useGridStyles } from './gridStyles';

const LINES = { cardTitle: 3, textCardTitle: 5, labelTitle: 4, description: 4, site: 2, byline: 1, post: 8, rawUrl: 2 } as const;

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
      <HeroFace id={card.id} drawnOnLayout style={styles.textCard}>
        <NameText token="titleS" numberOfLines={LINES.textCardTitle}>{card.title ?? card.site}</NameText>
        {card.variant === 'video' ? <Icon name="play" /> : null}
      </HeroFace>
      <Caption card={card} withTitle={false} />
    </>
  );
}

/** No image size known: the site name set large, the title below (failed reads, images without a thumbnail, untitled links). */
function SiteCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <HeroFace id={card.id} drawnOnLayout style={styles.textCard}>
        <NameText token="title" numberOfLines={LINES.site}>{card.site}</NameText>
      </HeroFace>
      <Caption card={card} />
    </>
  );
}

/** An imageless link (#58): its title, then what the page says about itself; the site only in the note below. */
function WallLabelCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  if (!card.title) return <SiteCard card={card} />;
  return (
    <>
      <HeroFace id={card.id} drawnOnLayout style={[styles.textCard, styles.wallLabel]}>
        <NameText token="titleS" numberOfLines={LINES.labelTitle}>{card.title}</NameText>
        {card.description ? <NoteText token="label" color="ink2" numberOfLines={LINES.description}>{card.description}</NoteText> : null}
      </HeroFace>
      <Caption card={card} withTitle={false} />
    </>
  );
}

function withMedia(Fallback: Body, options: { readonly playable?: boolean } = {}): Body {
  return function MediaCard({ card }) {
    if (!card.media) return <Fallback card={card} />;
    return (
      <>
        <HeroFace id={card.id} drawnOnLayout={card.media.uri === null}>
          <CardMediaBox id={card.id} media={card.media} playable={options.playable} />
        </HeroFace>
        <Caption card={card} />
      </>
    );
  };
}

/** Between two rules: who said it, then what they said (#58); a picture-only post has just the name. */
function PostCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  const words = postWords(card);
  return (
    <>
      <HeroFace id={card.id} drawnOnLayout>
        <View style={styles.post}>
          {card.byline ? <NameText token="byline" numberOfLines={LINES.byline}>{card.byline}</NameText> : null}
          {words ? <NameText token="post" numberOfLines={LINES.post}>{words}</NameText> : null}
        </View>
        {card.media ? <View style={styles.postMedia}><CardMediaBox id={card.id} media={card.media} /></View> : null}
      </HeroFace>
      <Caption card={card} withTitle={false} />
    </>
  );
}

function PendingCard({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  return (
    <>
      <HeroFace id={card.id} drawnOnLayout style={styles.pending}>
        <NoteText>{card.note}</NoteText>
      </HeroFace>
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
  link: withMedia(WallLabelCard),
  failed: withMedia(SiteCard),
  pending: PendingCard,
};
