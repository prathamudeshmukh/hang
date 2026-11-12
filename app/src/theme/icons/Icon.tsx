import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { useTheme } from '../theme';
import type { Palette } from '../tokens';

/** Phosphor Light paths (MIT), drawn on Phosphor's 256 grid. DESIGN.md §6: only these four. */
const GRID = 256;
const SIZE_DP = 22;
const STROKE_DP = 1.25;
const STROKE = (STROKE_DP * GRID) / SIZE_DP;
const DOT_RADIUS = 10;

export type IconName = 'play' | 'back' | 'search' | 'more';
type IconInk = keyof Pick<Palette, 'ink' | 'screenInk'>;

type Stroke = { readonly stroke: string; readonly strokeWidth: number; readonly strokeLinecap: 'round'; readonly strokeLinejoin: 'round'; readonly fill: 'none' };

const strokeOf = (color: string): Stroke => ({ stroke: color, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' });

const GLYPHS: Readonly<Record<IconName, (color: string) => React.JSX.Element>> = {
  play: (color) => <Path d="M72,39.88V216.12a8,8,0,0,0,12.15,6.69l144.08-88.12a7.82,7.82,0,0,0,0-13.38L84.15,33.19A8,8,0,0,0,72,39.88Z" {...strokeOf(color)} />,
  back: (color) => (
    <>
      <Line x1={216} y1={128} x2={40} y2={128} {...strokeOf(color)} />
      <Polyline points="112 56 40 128 112 200" {...strokeOf(color)} />
    </>
  ),
  search: (color) => (
    <>
      <Circle cx={112} cy={112} r={80} {...strokeOf(color)} />
      <Line x1={168.57} y1={168.57} x2={224} y2={224} {...strokeOf(color)} />
    </>
  ),
  more: (color) => <>{[60, 128, 196].map((cx) => <Circle key={cx} cx={cx} cy={128} r={DOT_RADIUS} fill={color} />)}</>,
};

/** Decorative: the control around an icon carries its label. */
export function Icon({ name, color = 'ink' }: { readonly name: IconName; readonly color?: IconInk }) {
  const theme = useTheme();
  return (
    <Svg width={SIZE_DP} height={SIZE_DP} viewBox={`0 0 ${GRID} ${GRID}`} accessible={false}>
      {GLYPHS[name](theme.color[color])}
    </Svg>
  );
}
