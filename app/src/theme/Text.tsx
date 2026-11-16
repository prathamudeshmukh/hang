import { Text, type TextProps } from 'react-native';
import { useTheme } from './theme';
import type { Palette } from './tokens';
import { postFitStyle, textStyle, type PostFitStep, type TypeToken } from './typeScale';

type NameToken = 'display' | 'titleL' | 'title' | 'titleS' | 'bodyRead' | 'post' | 'byline' | 'imprint';
type ActionToken = 'action' | 'actionS' | 'card';
type InkColor = keyof Pick<Palette, 'ink' | 'ink2' | 'ink3' | 'accent' | 'screenInk'>;

interface VoiceProps<Token extends TypeToken> extends TextProps {
  readonly token: Token;
  readonly color?: InkColor;
}

function VoiceText<Token extends TypeToken>({ token, color, style, ...rest }: VoiceProps<Token> & { readonly color: InkColor }) {
  const theme = useTheme();
  return <Text {...rest} style={[textStyle(token), { color: theme.color[color] }, style]} />;
}

/** Anything with a name: collections, item titles, reader text (Newsreader upright). */
export function NameText({ color = 'ink', ...props }: VoiceProps<NameToken>) {
  return <VoiceText {...props} color={color} />;
}

/** Anything about a thing: sources, durations, dates, counts, empty states (Newsreader italic). */
export function NoteText({ color = 'ink3', token = 'note', ...props }: Partial<VoiceProps<'note' | 'prompt' | 'label'>> & TextProps) {
  return <VoiceText {...props} token={token} color={color} />;
}

/** Anything you do: buttons, filters, small card titles, inputs (Hanken Grotesk). */
export function ActionText({ color = 'ink', ...props }: VoiceProps<ActionToken>) {
  return <VoiceText {...props} color={color} />;
}

/** A post page's words at one `post-fit` step (DESIGN.md §4): a name, in the italic display cut. */
export function PostFitText({ step, style, ...rest }: TextProps & { readonly step: PostFitStep }) {
  const theme = useTheme();
  return <Text {...rest} style={[postFitStyle(step), { color: theme.color.ink }, style]} />;
}
