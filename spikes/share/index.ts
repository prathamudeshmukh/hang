import 'expo-router/entry';
import { AppRegistry } from 'react-native';
import { ShareSheetRoot } from './src/share/ShareSheet';

// Second root component, hosted by ShareActivity (plugins/withShareActivity.js).
AppRegistry.registerComponent('ShareSheet', () => ShareSheetRoot);
