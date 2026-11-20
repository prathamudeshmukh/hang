import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Swatch } from '@/rooms/roomColours';
import { Paper } from '@/theme/Paper';
import { useTheme } from '@/theme/theme';
import type { CardModel } from './cardModel';

/** The print's room colour in this scheme (#85); null for an unsorted print. */
export function useSwatch(card: Pick<CardModel, 'swatch'>): Swatch | null {
  const { scheme } = useTheme();
  return card.swatch?.[scheme] ?? null;
}

interface PrintPaperProps {
  readonly swatch: Swatch | null;
  /** The print's box, with its plain `raised` paper, which a swatch replaces. */
  readonly style?: StyleProp<ViewStyle>;
  readonly children?: ReactNode;
}

/** A print without a picture: on its room's colour when it hangs in one, else on plain paper. */
export function PrintPaper({ swatch, style, children }: PrintPaperProps) {
  if (!swatch) return <View style={style}>{children}</View>;
  return (
    <Paper fill={swatch} style={style}>
      {children}
    </Paper>
  );
}
