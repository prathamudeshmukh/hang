import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { SKETCH } from '@/theme/tokens';
import { HOWTO_ART_SIZE, howtoArt, type HowToStep, type Shape, type SketchInk } from './howtoShapes';

const VIEW_BOX = `0 0 ${HOWTO_ART_SIZE} ${HOWTO_ART_SIZE}`;
const OUTLINE_WIDTH = 0.8;

function DrawnShape({ shape, paint }: { readonly shape: Shape; readonly paint: (ink: SketchInk) => string }) {
  switch (shape.kind) {
    case 'rect':
      return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} fill={paint(shape.ink)} opacity={shape.opacity} />;
    case 'circle':
      return (
        <Circle
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={paint(shape.ink)}
          opacity={shape.opacity}
          stroke={shape.outline ? paint(shape.outline) : undefined}
          strokeWidth={shape.outline ? OUTLINE_WIDTH : undefined}
        />
      );
    case 'line':
      return <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={paint(shape.ink)} strokeWidth={shape.width} opacity={shape.opacity} />;
    case 'path':
      return <Path d={shape.d} fill={paint(shape.ink)} opacity={shape.opacity} />;
    case 'tile':
      return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} fill={shape.fill} />;
  }
}

/** One how-to drawing on a print's paper. Decorative: the step's row carries the words. */
export function HowToArt({ step, size }: { readonly step: HowToStep; readonly size: number }) {
  const { scheme, color } = useTheme();
  const inks: Readonly<Record<SketchInk, string>> = { ...SKETCH[scheme], ink: color.ink, ink2: color.ink2, raised: color.raised, wall: color.wall };
  const paint = (ink: SketchInk): string => inks[ink];
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX} accessible={false}>
      <Rect width={HOWTO_ART_SIZE} height={HOWTO_ART_SIZE} fill={color.raised} />
      {howtoArt(step).map((shape, index) => <DrawnShape key={index} shape={shape} paint={paint} />)}
    </Svg>
  );
}
