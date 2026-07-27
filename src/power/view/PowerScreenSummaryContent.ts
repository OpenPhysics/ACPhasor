/**
 * PowerScreenSummaryContent.ts
 *
 * Accessible screen summary for the Power-in-AC-circuits screen.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { PowerModel } from "../model/PowerModel.js";

export class PowerScreenSummaryContent extends ScreenSummaryContent {
  public constructor(_model: PowerModel) {
    const a11y = StringManager.getInstance().getPowerA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
