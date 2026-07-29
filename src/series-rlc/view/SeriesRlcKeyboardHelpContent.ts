/**
 * SeriesRlcKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Series RLC screen. R, L, C, the source
 * voltage and the frequency are all sliders, so the slider section joins the
 * basic actions, as on the other three screens.
 */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class SeriesRlcKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
