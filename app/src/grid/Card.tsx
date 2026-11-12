import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { openLink } from '@/home/openLink';
import { useTheme } from '@/theme/theme';
import { CARD_BODIES } from './cardBodies';
import { sameCard, type CardModel } from './cardModel';
import { useGridStyles } from './gridStyles';

/** Opens the link until the swipe feed (#31) takes over the tap. */
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
        onPress={() => void openLink(card.url)}
        style={styles.pressable}
      >
        <Body card={card} />
      </Pressable>
    </View>
  );
}, (previous, next) => sameCard(previous.card, next.card));
