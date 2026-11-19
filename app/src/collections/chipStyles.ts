import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { textStyle } from '@/theme/typeScale';

const CHIP_PADDING_X = 14;
/** About *Name the room* at actionS, so the empty field doesn't shrink below its placeholder. */
const FIELD_MIN_WIDTH = 132;

export const useChipStyles = makeStyles(({ color }) => ({
  chip: { minHeight: SPACE.touch, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised, paddingHorizontal: CHIP_PADDING_X, overflow: 'hidden' },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  field: { borderColor: color.ink, minWidth: FIELD_MIN_WIDTH },
  input: { ...textStyle('actionS'), color: color.ink, padding: 0 },
}));
