/**
 * PowerKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Power-in-AC-circuits screen.
 */
import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class PowerKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection()], []);
  }
}
