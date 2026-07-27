/**
 * SeriesRlcKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Series RLC screen.
 */
import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class SeriesRlcKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection()], []);
  }
}
