import { makeMutable } from 'react-native-reanimated';

/**
 * The feed screen's opacity, owned by the hero: it is pushed hidden and shown once a flight lands
 * under the backdrop, or cross-faded in and out when nothing flies (#32).
 */
export const feedOpacity = makeMutable(1);

/** The feed's words, counter and pills: they leave sooner than the feed itself on the way back (#33). */
export const feedTextOpacity = makeMutable(1);

/** A post page's imprint and pills: on the way in they arrive 120ms behind the words (#59). */
export const feedTrailOpacity = makeMutable(1);
