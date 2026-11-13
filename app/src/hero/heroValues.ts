import { makeMutable } from 'react-native-reanimated';

/**
 * The feed screen's opacity, owned by the hero: it is pushed hidden and shown once a flight lands
 * under the backdrop, or cross-faded in and out when nothing flies (#32).
 */
export const feedOpacity = makeMutable(1);
