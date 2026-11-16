import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '@/theme/Pill';
import { NoteText, PostFitText } from '@/theme/Text';
import type { FeedPageViewProps } from '../FeedPageView';
import type { PostMedia } from '../feedPage';
import { PAGE_ACTIONS, stepOf } from '../pageA11y';
import { useFeedTextFade, useFeedTrailFade, useHiddenUnderFlyer } from '../useFeedHero';
import { PostImprint } from './PostImprint';
import { PostMeasure } from './PostMeasure';
import { PostPicture } from './PostPicture';
import { isMostlyCjk } from './postFit';
import { POST_NOTE_TOP } from './postLayout';
import { usePostStyles } from './postStyles';
import { usePostFit, type PostFit } from './usePostFit';

interface WordsProps {
  readonly id: string;
  readonly post: PostMedia;
  readonly fit: PostFit;
}

/** The words at their fitted step, or, for a picture-only post, the picture in their place (#59 decision 6). */
function Words({ id, post, fit }: WordsProps) {
  if (post.words && fit.step) {
    return (
      <PostFitText step={fit.step} cjk={isMostlyCjk(post.words)} testID="feed-post-words" numberOfLines={fit.maxLines ?? undefined} ellipsizeMode="tail">
        {post.words}
      </PostFitText>
    );
  }
  return !post.words && post.picture && fit.picture ? <PostPicture id={id} media={post.picture} box={fit.picture} /> : null;
}

function Answer({ id, post, fit }: WordsProps) {
  const styles = usePostStyles();
  if (!post.words || !post.picture || !fit.picture) return null;
  return (
    <>
      <View style={styles.seam} />
      <PostPicture id={id} media={post.picture} box={fit.picture} />
    </>
  );
}

/** A post page set as a broadside (DESIGN.md §8): note, words sized to own the page, imprint, picture, pills. */
export function PostPageView({ page, post, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps & { readonly post: PostMedia }) {
  const styles = usePostStyles();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const textFade = useFeedTextFade();
  const trailFade = useFeedTrailFade();
  const { id } = page.card;
  const hidden = useHiddenUnderFlyer(id);
  const { fit, onBodyLayout, onImprintLayout, onMeasured, measureKey } = usePostFit({
    words: post.words,
    signed: post.imprint !== null,
    picture: post.picture,
    pageHeight: height,
    fontScale,
  });
  useEffect(() => {
    if (fit.ready) onMediaDrawn(id);
  }, [fit.ready, id, onMediaDrawn]);

  return (
    <View style={[styles.page, { height, paddingTop: insets.top + POST_NOTE_TOP, paddingBottom: bottomInset }]}>
      <View
        style={styles.content}
        accessible
        accessibilityLabel={page.accessibilityLabel}
        accessibilityActions={PAGE_ACTIONS}
        onAccessibilityAction={(event) => {
          const step = stepOf(event);
          if (step) onStep(step);
        }}
      >
        <Animated.View style={textFade}>
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
        </Animated.View>
        <View style={styles.body} onLayout={onBodyLayout}>
          {fit.measuring && post.words ? <PostMeasure key={measureKey} words={post.words} onMeasured={onMeasured} /> : null}
          <View style={[!fit.ready && styles.unsettled, hidden && styles.hidden]}>
            <Words id={id} post={post} fit={fit} />
          </View>
          <View style={!fit.ready && styles.unsettled}>
            <Animated.View style={trailFade}>
              <PostImprint imprint={post.imprint} onLayout={onImprintLayout} />
            </Animated.View>
          </View>
          <View style={!fit.ready && styles.unsettled}>
            <Answer id={id} post={post} fit={fit} />
          </View>
        </View>
      </View>
      <Animated.View style={[styles.pills, trailFade]}>
        <Pill kind="filled" label="Move" testID="feed-move" onPress={() => onMove(page)} />
        <Pill label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
      </Animated.View>
    </View>
  );
}
