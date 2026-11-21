import { Image } from 'expo-image';
import { View } from 'react-native';
import { PrintPaper } from '@/grid/PrintPaper';
import type { RoomColours } from '@/rooms/roomColours';
import { NameText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import type { MosaicCell, RoomMosaic } from './roomMosaic';
import { useRoomTileStyles, WORDS_LINES } from './roomTileStyles';

interface CellProps {
  readonly cell: MosaicCell;
  readonly colours: RoomColours | null;
}

/** A picture is never tinted; a shade draws through Paper, the room colour's gentle gradient (#85). */
function Cell({ cell, colours }: CellProps) {
  const styles = useRoomTileStyles();
  const { scheme } = useTheme();
  if (cell.kind === 'picture') return <Image source={{ uri: cell.uri }} style={styles.cell} contentFit="cover" accessible={false} />;
  if (cell.kind === 'shade' && colours) return <PrintPaper swatch={colours[scheme].prints[cell.at]} style={styles.cell} />;
  if (cell.kind === 'words') {
    return (
      <View style={styles.words}>
        <NameText token="titleS" numberOfLines={WORDS_LINES} accessible={false}>{cell.text}</NameText>
      </View>
    );
  }
  return <View style={styles.cell} />;
}

interface RoomMosaicViewProps {
  readonly mosaic: RoomMosaic;
  readonly colours: RoomColours | null;
}

/** The newest large on the left, the next two stacked on the right (#106). */
export function RoomMosaicView({ mosaic: [big, first, second], colours }: RoomMosaicViewProps) {
  const styles = useRoomTileStyles();
  return (
    <View style={styles.mosaic}>
      <View style={styles.big}><Cell cell={big} colours={colours} /></View>
      <View style={styles.smallColumn}>
        <View style={styles.small}><Cell cell={first} colours={colours} /></View>
        <View style={styles.small}><Cell cell={second} colours={colours} /></View>
      </View>
    </View>
  );
}
