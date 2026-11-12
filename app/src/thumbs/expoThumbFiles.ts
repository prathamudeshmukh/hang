import { Directory, File, Paths } from 'expo-file-system';
import type { ThumbFilesPort } from './thumbSync';

const FOLDER = 'thumbs';

/** Thumbnails in the app's documents folder: kept until Hang deletes them (unlike the cache folder). */
export function createExpoThumbFiles(): ThumbFilesPort {
  const folder = new Directory(Paths.document, FOLDER);
  const ensureFolder = () => folder.create({ intermediates: true, idempotent: true });
  return {
    uriFor: (itemId) => new File(folder, `${itemId}.webp`).uri,
    list: async () => (folder.exists ? folder.list().map((entry) => entry.uri) : []),
    download: async (url, uri) => {
      ensureFolder();
      await File.downloadFileAsync(url, new File(uri), { idempotent: true });
    },
    remove: async (uri) => {
      const file = new File(uri);
      if (file.exists) file.delete();
    },
  };
}
