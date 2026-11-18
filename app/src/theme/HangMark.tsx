import Svg, { Rect } from 'react-native-svg';
import { MARK_TILES, markViewBox, TILE_RADIUS } from './hangMark';

const VIEW_BOX = markViewBox(MARK_TILES);

/** Hang's mark, the app icon's four tiles. Its colours are the icon's own, the same on both walls. Decorative. */
export function HangMark({ size }: { readonly size: number }) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX} accessible={false}>
      {MARK_TILES.map((tile) => (
        <Rect key={`${tile.x},${tile.y}`} x={tile.x} y={tile.y} width={tile.width} height={tile.height} rx={TILE_RADIUS} fill={tile.fill} />
      ))}
    </Svg>
  );
}
