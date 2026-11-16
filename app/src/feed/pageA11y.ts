import type { AccessibilityActionEvent } from 'react-native';

/** TalkBack's way to swipe (#31): every feed page offers the next and previous item. */
export const PAGE_ACTIONS = [
  { name: 'next', label: 'Next' },
  { name: 'previous', label: 'Previous' },
] as const;

export type PageStep = 'next' | 'previous';

export function stepOf(event: AccessibilityActionEvent): PageStep | null {
  const { actionName } = event.nativeEvent;
  return actionName === 'next' || actionName === 'previous' ? actionName : null;
}
