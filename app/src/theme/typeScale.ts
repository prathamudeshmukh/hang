/**
 * DESIGN.md §4 type scale. Newsreader's optical size can't be set at runtime on Android, so each size uses the
 * static cut built for it (scripts/build-fonts.py): Text (opsz 16) up to 18, Display (opsz 36) above.
 */
export const FONT_FILE = {
  textRegular: 'Newsreader-Text-Regular',
  textItalic: 'Newsreader-Text-Italic',
  displayBook: 'Newsreader-Display-Book',
  displayRegular: 'Newsreader-Display-Regular',
  sansMedium: 'HankenGrotesk-Medium',
  sansSemiBold: 'HankenGrotesk-SemiBold',
} as const;

export type Voice = 'name' | 'note' | 'action';

interface ScaleEntry {
  readonly voice: Voice;
  readonly font: (typeof FONT_FILE)[keyof typeof FONT_FILE];
  readonly size: number;
  /** Line height as a multiple of the size. */
  readonly leading: number;
  /** Letter spacing as a fraction of the size (−3% = −0.03). */
  readonly tracking: number;
}

export const TYPE_SCALE = {
  display: { voice: 'name', font: FONT_FILE.displayBook, size: 40, leading: 1.0, tracking: -0.03 },
  titleL: { voice: 'name', font: FONT_FILE.displayBook, size: 30, leading: 1.05, tracking: -0.02 },
  title: { voice: 'name', font: FONT_FILE.displayRegular, size: 26, leading: 1.1, tracking: -0.02 },
  titleS: { voice: 'name', font: FONT_FILE.textRegular, size: 18, leading: 1.15, tracking: 0 },
  bodyRead: { voice: 'name', font: FONT_FILE.textRegular, size: 17, leading: 1.6, tracking: 0 },
  note: { voice: 'note', font: FONT_FILE.textItalic, size: 13, leading: 1.35, tracking: 0 },
  /** Share sheet prompt (DESIGN.md §8): prompts are notes (§4). */
  prompt: { voice: 'note', font: FONT_FILE.textItalic, size: 15, leading: 1.3, tracking: 0 },
  action: { voice: 'action', font: FONT_FILE.sansSemiBold, size: 15, leading: 1.2, tracking: 0 },
  actionS: { voice: 'action', font: FONT_FILE.sansSemiBold, size: 13, leading: 1.2, tracking: 0 },
  card: { voice: 'action', font: FONT_FILE.sansMedium, size: 13, leading: 1.25, tracking: 0 },
} as const satisfies Record<string, ScaleEntry>;

export type TypeToken = keyof typeof TYPE_SCALE;

export interface TextStyleValues {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
}

/** Plain style values for a token; React Native scales them with the system font size. */
export function textStyle(token: TypeToken): TextStyleValues {
  const { font, size, leading, tracking } = TYPE_SCALE[token];
  return { fontFamily: font, fontSize: size, lineHeight: Math.round(size * leading), letterSpacing: size * tracking };
}

/** Tokens that belong to a voice, so a NoteText can never be set in an action face by mistake. */
export function tokensOf(voice: Voice): readonly TypeToken[] {
  return (Object.keys(TYPE_SCALE) as TypeToken[]).filter((token) => TYPE_SCALE[token].voice === voice);
}
