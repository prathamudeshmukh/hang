import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '@/theme/Pill';
import { NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import type { Curve, FlightTuning } from '../flightPlan';
import { CURVES, currentTuning, DURATIONS_MS, subscribeTuning, TEXT_FADES_MS, tune } from './tuningStore';

/* Branch-only (#33): deleted once a tuning is picked. */

interface Choice<T> {
  readonly label: string;
  readonly value: T;
}

const sameCurve = (a: Curve, b: Curve) => a.every((point, at) => point === b[at]);
const curveChoices = CURVES.map(({ name, curve }) => ({ label: name, value: curve }));
const msChoices = (values: readonly number[]) => values.map((ms) => ({ label: `${ms}`, value: ms }));

interface RowProps<T> {
  readonly title: string;
  readonly choices: readonly Choice<T>[];
  readonly isPicked: (value: T) => boolean;
  readonly onPick: (value: T) => void;
}

function Row<T>({ title, choices, isPicked, onPick }: RowProps<T>) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <NoteText color="ink2">{title}</NoteText>
      <View style={styles.chips}>
        {choices.map(({ label, value }) => (
          <Pill key={label} size="s" label={label} kind={isPicked(value) ? 'filled' : 'outline'} onPress={() => onPick(value)} />
        ))}
      </View>
    </View>
  );
}

function Panel({ tuning }: { readonly tuning: FlightTuning }) {
  return (
    <>
      <Row title="out curve" choices={curveChoices} isPicked={(curve) => sameCurve(curve, tuning.out)} onPick={(out) => tune({ out })} />
      <Row title="back curve" choices={curveChoices} isPicked={(curve) => sameCurve(curve, tuning.back)} onPick={(back) => tune({ back })} />
      <Row title="flight ms" choices={msChoices(DURATIONS_MS)} isPicked={(ms) => ms === tuning.durationMs} onPick={(durationMs) => tune({ durationMs })} />
      <Row title="text fade ms" choices={msChoices(TEXT_FADES_MS)} isPicked={(ms) => ms === tuning.textFadeMs} onPick={(textFadeMs) => tune({ textFadeMs })} />
      <Row
        title="ground curve"
        choices={[{ label: 'calm', value: 'calm' as const }, { label: 'linked', value: 'linked' as const }]}
        isPicked={(ground) => ground === tuning.ground}
        onPick={(ground) => tune({ ground })}
      />
    </>
  );
}

/** A pill in the corner of every screen in dev builds: compare flight curves on the phone (#33). */
export function FlightTuner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const tuning = useSyncExternalStore(subscribeTuning, currentTuning);
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.corner, { bottom: insets.bottom + SPACE.rhythm }]} pointerEvents="box-none">
      {open ? (
        <View style={styles.panel}>
          <Panel tuning={tuning} />
        </View>
      ) : null}
      <Pill size="s" kind="accent" label={open ? 'Done' : 'Tune'} onPress={() => setOpen(!open)} />
    </View>
  );
}

const useStyles = makeStyles(({ color }) => ({
  corner: { position: 'absolute', left: SPACE.gutter, alignItems: 'flex-start', gap: SPACE.chip },
  panel: { backgroundColor: color.raised, borderRadius: RADIUS.print, borderWidth: StyleSheet.hairlineWidth, borderColor: color.rule, padding: SPACE.inset, gap: SPACE.inset },
  row: { gap: SPACE.tight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.chip },
}));
