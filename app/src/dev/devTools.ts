/**
 * Test builds only: `e2e/run.sh` (or a sign-off build) sets EXPO_PUBLIC_HANG_DEV_TOOLS=1. Expo inlines it as a
 * literal, so in a normal build the dev routes do nothing.
 */
export const DEV_TOOLS_ON = process.env.EXPO_PUBLIC_HANG_DEV_TOOLS === '1';
