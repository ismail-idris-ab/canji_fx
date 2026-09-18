import {
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';

/**
 * Two faces, each for one job.
 *
 * Bricolage Grotesque sets headlines: it has a face rather than a default,
 * and reads as editorial without the high-contrast serif every reading view
 * arrives at. Newsreader sets body copy; it is drawn for long measure at
 * small sizes on screen, which is the entire problem on a phone.
 *
 * Only the reading surfaces use them. Rates stay in the system font, where
 * digits need to be unremarkable and instantly legible rather than
 * characterful.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
  });

  return loaded;
}
