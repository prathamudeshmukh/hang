import { Pressable, type PressableProps } from 'react-native';
import { makeStyles, useTheme } from './theme';
import { RADIUS, SPACE } from './tokens';
import { ActionText } from './Text';

/** `filled`: ink (the main action, or a selected chip); `outline`: rule border; `accent`: vermilion (Save, Take down only). */
export type PillKind = 'filled' | 'outline' | 'accent';
/** `s`: chips and filters (#42), 36dp to the eye with the 48dp touch target kept by hitSlop. */
export type PillSize = 'm' | 's';

interface PillProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly kind?: PillKind;
  readonly size?: PillSize;
}

const SIZES = {
  m: { height: SPACE.touch, paddingX: 20, token: 'action' },
  s: { height: 36, paddingX: 14, token: 'actionS' },
} as const;

const useStyles = makeStyles(({ color }) => ({
  base: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  filled: { borderWidth: 1, borderColor: color.ink, backgroundColor: color.ink },
  outline: { borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised },
  accent: { backgroundColor: color.accent },
}));

/** Round to touch (DESIGN.md §1): every control is a pill, labelled with a word, never an icon and a label. */
export function Pill({ label, kind = 'outline', size = 'm', disabled, accessibilityState, ...rest }: PillProps) {
  const styles = useStyles();
  const { color } = useTheme();
  const { height, paddingX, token } = SIZES[size];
  const slop = (SPACE.touch - height) / 2;
  const labelColor = { filled: color.wall, outline: color.ink, accent: color.screenInk }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: color.ripple }}
      disabled={disabled}
      hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
      style={[styles.base, styles[kind], { minHeight: height, paddingHorizontal: paddingX }, disabled ? { opacity: 0.5 } : null]}
      {...rest}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
    >
      <ActionText token={token} style={{ color: labelColor }}>
        {label}
      </ActionText>
    </Pressable>
  );
}
