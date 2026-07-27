/**
 * ResonanceKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Resonance & frequency-sweep screen.
 */
import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class ResonanceKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection()], []);
  }
}
