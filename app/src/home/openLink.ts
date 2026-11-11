import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

/** In a Custom Tab, until the reader exists (Phase 3). The URL is never logged. */
export async function openLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    console.warn('Could not open a saved link', error instanceof Error ? error.message : String(error));
    Alert.alert('Couldn’t open this link', 'Try again, or check that a browser is installed.');
  }
}
