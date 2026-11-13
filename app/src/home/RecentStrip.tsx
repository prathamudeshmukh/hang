import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { countInWords } from './homeCopy';
import type { RecentPrint } from './homeLists';
import { useHomeStyles } from './homeStyles';
import { StripPrint } from './StripPrint';

const EMPTY_HOME = 'Share anything from another app to hang it here.';

function Label() {
  return <NameText token="titleS">Recently saved</NameText>;
}

/** The whole label row opens the Inbox; it exists only while something is unsorted (#30). */
function InboxLabel({ inboxCount }: { readonly inboxCount: number }) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  const unsorted = `${countInWords(inboxCount)} unsorted`;
  return (
    <Link href="/inbox" asChild>
      <Pressable testID="inbox" accessibilityRole="link" accessibilityLabel={`Recently saved, ${unsorted}. Open the Inbox`} android_ripple={{ color: color.ripple }} style={styles.sectionLabel}>
        <View style={styles.sectionName}>
          <Label />
          <View style={styles.inboxDot} />
        </View>
        <NoteText>{unsorted}</NoteText>
      </Pressable>
    </Link>
  );
}

export function RecentStrip({ recent, inboxCount }: { readonly recent: readonly RecentPrint[]; readonly inboxCount: number }) {
  const styles = useHomeStyles();
  if (recent.length === 0) {
    return (
      <View style={styles.sectionLabel}>
        <NoteText token="prompt">{EMPTY_HOME}</NoteText>
      </View>
    );
  }
  return (
    <>
      {inboxCount > 0 ? (
        <InboxLabel inboxCount={inboxCount} />
      ) : (
        <View style={styles.sectionLabel}>
          <Label />
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
        {recent.map((print) => <StripPrint key={print.card.id} print={print} />)}
      </ScrollView>
    </>
  );
}
