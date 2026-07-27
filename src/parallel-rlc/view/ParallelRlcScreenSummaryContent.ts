/**
 * ParallelRlcScreenSummaryContent.ts
 *
 * Accessible screen summary for the Parallel RLC screen.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ParallelRlcModel } from "../model/ParallelRlcModel.js";

export class ParallelRlcScreenSummaryContent extends ScreenSummaryContent {
  public constructor(_model: ParallelRlcModel) {
    const a11y = StringManager.getInstance().getParallelRlcA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
