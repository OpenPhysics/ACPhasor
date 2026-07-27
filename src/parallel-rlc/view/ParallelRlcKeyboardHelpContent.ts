/**
 * ParallelRlcKeyboardHelpContent.ts
 *
 * Keyboard-help dialog content for the Parallel RLC screen.
 */
import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class ParallelRlcKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection()], []);
  }
}
