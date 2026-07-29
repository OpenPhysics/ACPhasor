/**
 * IntroKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Intro screen. Every quantity here — the
 * element value, the source voltage, the frequency — is set with a slider, so
 * the slider section joins the basic actions, as on the other three screens.
 */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class IntroKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
