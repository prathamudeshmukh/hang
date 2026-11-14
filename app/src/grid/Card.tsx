import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { TextArrival } from '@/rewards/TextArrival';
import { useTheme } from '@/theme/theme';
import { CARD_BODIES } from './cardBodies';
import { sameCard, type CardModel } from './cardModel';
import { useGridStyles } from './gridStyles';

interface CardProps {
  readonly card: CardModel;
  /** Opens the feed at this card; must keep its identity, since redraws only follow the card. */
  readonly onOpen: (card: CardModel) => void;
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
        onPress={() => onOpen(card)}
        style={styles.pressable}
      >
        <TextArrival card={card}>
          <Body card={card} />
        </TextArrival>
      </Pressable>
    </View>
  );
}, (previous, next) => sameCard(previous.card, next.card));
