/**
 * ResonanceScreenSummaryContent.ts
 *
 * Accessible screen summary for the Resonance & frequency-sweep screen.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ResonanceModel } from "../model/ResonanceModel.js";

export class ResonanceScreenSummaryContent extends ScreenSummaryContent {
  public constructor(_model: ResonanceModel) {
    const a11y = StringManager.getInstance().getResonanceA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
