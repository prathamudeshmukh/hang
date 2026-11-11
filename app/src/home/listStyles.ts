import { StyleSheet } from 'react-native';
import { COLOR, FONT } from '@/share/tokens';

export const RIPPLE = { color: 'rgba(27,26,23,0.08)' } as const;

/** Phase 1 plain lists; Phase 2 restyles them from DESIGN.md. */
export const listStyles = StyleSheet.create({
  wall: { flex: 1, backgroundColor: COLOR.wall },
  content: { paddingHorizontal: 16 },
  title: { fontFamily: FONT.serif, fontSize: 40, color: COLOR.ink, letterSpacing: -1 },
  section: { fontFamily: FONT.serif, fontSize: 22, color: COLOR.ink, marginTop: 32, marginBottom: 4 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.ink3, marginTop: 4 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLOR.rule, paddingVertical: 14 },
  rowTitle: { fontFamily: FONT.serif, fontSize: 18, color: COLOR.ink },
  /** One style object: expo-router's `Link asChild` rejects style arrays. */
  placeRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLOR.rule,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  count: { fontSize: 14, color: COLOR.ink3 },
  error: { fontFamily: FONT.serif, fontSize: 14, color: COLOR.accent, marginTop: 4 },
  input: { fontFamily: FONT.serif, fontSize: 18, color: COLOR.ink, padding: 0 },
  link: { fontSize: 15, fontWeight: '600', color: COLOR.accent },
});
