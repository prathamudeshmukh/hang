import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SpikeItem } from './items';
import { COLOR, FONT, LAYOUT } from './tokens';

interface Props {
  readonly title: string;
  readonly items: readonly SpikeItem[];
  /** Renders the tappable image for one item at the given size. */
  readonly renderPrint: (item: SpikeItem, size: { width: number; height: number }) => ReactNode;
}

/** Splits items into columns, always adding to the shortest one. */
function toColumns(items: readonly SpikeItem[], columnWidth: number): readonly (readonly SpikeItem[])[] {
  const initial = Array.from({ length: LAYOUT.columns }, () => ({ height: 0, items: [] as readonly SpikeItem[] }));
  const columns = items.reduce((acc, item) => {
    const shortest = acc.reduce((min, col, i) => (col.height < (acc[min]?.height ?? Infinity) ? i : min), 0);
    return acc.map((col, i) =>
      i === shortest ? { height: col.height + columnWidth / item.aspect, items: [...col.items, item] } : col,
    );
  }, initial);
  return columns.map((col) => col.items);
}

export function Masonry({ title, items, renderPrint }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columnWidth = (width - LAYOUT.margin * 2 - LAYOUT.gutter * (LAYOUT.columns - 1)) / LAYOUT.columns;

  return (
    <ScrollView style={styles.wall} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {toColumns(items, columnWidth).map((column, index) => (
          <View key={index} style={{ width: columnWidth }}>
            {column.map((item) => (
              <View key={item.id} style={styles.card}>
                {renderPrint(item, { width: columnWidth, height: columnWidth / item.aspect })}
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.note}>{item.note}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wall: { flex: 1, backgroundColor: COLOR.wall },
  title: { fontFamily: FONT.serif, fontSize: 40, color: COLOR.ink, marginHorizontal: LAYOUT.margin, marginBottom: 14, letterSpacing: -1 },
  row: { flexDirection: 'row', gap: LAYOUT.gutter, paddingHorizontal: LAYOUT.margin },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: COLOR.ink, marginTop: 6 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 12, color: COLOR.ink3, marginTop: 1 },
});
