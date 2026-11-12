import { Pressable, type PressableProps } from 'react-native';
import { makeStyles, useTheme } from './theme';
import { RADIUS, SPACE } from './tokens';
import { ActionText } from './Text';

/** `filled`: ink (the main action); `outline`: rule border; `accent`: vermilion (Save, Take down only). */
export type PillKind = 'filled' | 'outline' | 'accent';

interface PillProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly kind?: PillKind;
}

const PADDING_X = 20;

const useStyles = makeStyles(({ color }) => ({
  base: { minHeight: SPACE.touch, paddingHorizontal: PADDING_X, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  filled: { backgroundColor: color.ink },
  outline: { borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised },
  accent: { backgroundColor: color.accent },
}));

/** Round to touch (DESIGN.md §1): every control is a pill, labelled with a word, never an icon and a label. */
export function Pill({ label, kind = 'outline', disabled, ...rest }: PillProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const labelColor = { filled: color.wall, outline: color.ink, accent: color.screenInk }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      android_ripple={{ color: color.ripple }}
      disabled={disabled}
      style={[styles.base, styles[kind], disabled ? { opacity: 0.5 } : null]}
      {...rest}
    >
      <ActionText token="action" style={{ color: labelColor }}>
        {label}
      </ActionText>
    </Pressable>
  );
}
