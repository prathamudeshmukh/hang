import { useState } from 'react';
import { Pressable, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { NameText } from '@/theme/Text';
import { textStyle } from '@/theme/typeScale';
import type { Opening } from '../feedPage';
import { useTextPageStyles } from './textPageStyles';
import { openingLines } from './textLayout';

interface OpeningTextProps {
  readonly opening: Opening;
  /** A tap on the text does what Read does (DESIGN.md §8). */
  readonly onPress: () => void;
  /** The room is laid out, so the lines are final: the hero may land on them. */
  readonly onLaidOut?: () => void;
}

/** An article's first lines, as many as the room between title and pills holds, cut with an ellipsis (#61). */
export function OpeningText({ opening, onPress, onLaidOut }: OpeningTextProps) {
  const styles = useTextPageStyles();
  const { fontScale } = useWindowDimensions();
  const [room, setRoom] = useState(0);
  const lines = openingLines({ room, lineHeight: textStyle('bodyRead').lineHeight * fontScale });
  const onLayout = (event: LayoutChangeEvent) => {
    setRoom(event.nativeEvent.layout.height);
    onLaidOut?.();
  };
  return (
    <Pressable style={styles.opening} onLayout={onLayout} onPress={onPress} accessibilityRole="button" accessibilityLabel={opening.spoken} testID="feed-opening">
      <NameText token="bodyRead" color="ink2" numberOfLines={lines} ellipsizeMode="tail">
        {opening.text}
      </NameText>
    </Pressable>
  );
}
