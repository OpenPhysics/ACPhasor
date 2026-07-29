/**
 * PowerKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Power-in-AC-circuits screen. The load is
 * set entirely with sliders, so the slider section joins the basic actions.
 */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class PowerKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
