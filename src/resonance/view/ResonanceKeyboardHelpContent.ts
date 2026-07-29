/**
 * ResonanceKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Resonance & frequency-sweep screen. The
 * screen is driven almost entirely by sliders — the frequency one in particular,
 * which is how the operating point is walked across the resonance curve by hand
 * — so the slider section is worth showing alongside the basic actions.
 */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class ResonanceKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
