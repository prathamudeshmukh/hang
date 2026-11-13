import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { openItem } from '@/home/appItemActions';
import { useTheme } from '@/theme/theme';
import { CARD_BODIES } from './cardBodies';
import { sameCard, type CardModel } from './cardModel';
import { useGridStyles } from './gridStyles';

/** Taps go through the shared `openItem`, which the swipe feed (#31) takes over. */
export const Card = memo(function Card({ card }: { readonly card: CardModel }) {
  const styles = useGridStyles();
  const { color } = useTheme();
  const Body = CARD_BODIES[card.variant];
  return (
    <View style={styles.cell}>
      <Pressable
        testID={`item:${card.url}`}
        accessibilityRole="link"
        accessibilityLabel={card.accessibilityLabel}
        android_ripple={{ color: color.ripple, foreground: true }}
        onPress={() => void openItem(card)}
        style={styles.pressable}
      >
        <Body card={card} />
      </Pressable>
    </View>
  );
}, (previous, next) => sameCard(previous.card, next.card));
