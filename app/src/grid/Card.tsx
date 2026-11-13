import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { CARD_BODIES } from './cardBodies';
import { sameCard, type CardModel } from './cardModel';
import { useGridStyles } from './gridStyles';

interface CardProps {
  readonly card: CardModel;
  /** Opens the feed at this card; must keep its identity, since redraws only follow the card. */
  readonly onOpen: (id: string) => void;
}

export const Card = memo(function Card({ card, onOpen }: CardProps) {
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
        onPress={() => onOpen(card.id)}
        style={styles.pressable}
      >
        <Body card={card} />
      </Pressable>
    </View>
  );
}, (previous, next) => sameCard(previous.card, next.card));
