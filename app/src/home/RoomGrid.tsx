import { useWindowDimensions, View } from 'react-native';
import { NameText, NoteText } from '@/theme/Text';
import { SPACE } from '@/theme/tokens';
import { countInWords } from './homeCopy';
import type { CollectionRow } from './homeLists';
import { useHomeStyles } from './homeStyles';
import { NewRoomTile } from './NewRoomTile';
import { RoomTile } from './RoomTile';
import { TILE_COLUMN_GAP, TILES_PER_ROW, useRoomTileStyles } from './roomTileStyles';

/** Two tiles and the gap between them fill Home's width inside its margins; floored so rounding never wraps a row. */
function useTileWidth(): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - 2 * SPACE.margin - (TILES_PER_ROW - 1) * TILE_COLUMN_GAP) / TILES_PER_ROW);
}

type RoomGridProps = {
  readonly collections: readonly CollectionRow[];
  /** Whether ＋ New room's name field is focused, so Home moves for its keyboard and no other (#111). */
  readonly onNaming: (naming: boolean) => void;
};

/**
 * Home's rooms as a wall of mosaic tiles, two to a row, ending in a place for a new one (#106). One wrapping list with
 * a key per tile, so a room arriving from a sync never remounts ＋ New room while its name is being typed.
 */
export function RoomGrid({ collections, onNaming }: RoomGridProps) {
  const homeStyles = useHomeStyles();
  const styles = useRoomTileStyles();
  const width = useTileWidth();
  return (
    <>
      <View style={homeStyles.sectionLabel}>
        <NameText token="titleS">Collections</NameText>
        {collections.length > 0 ? <NoteText>{countInWords(collections.length)}</NoteText> : null}
      </View>
      <View style={styles.grid}>
        {collections.map((collection) => <RoomTile key={collection.id} collection={collection} width={width} />)}
        <NewRoomTile key="new" width={width} onNaming={onNaming} />
      </View>
    </>
  );
}
