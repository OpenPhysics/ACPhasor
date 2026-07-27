/**
 * SeriesRlcScreenSummaryContent.ts
 *
 * Accessible screen summary for the Series RLC screen.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeriesRlcModel } from "../model/SeriesRlcModel.js";

export class SeriesRlcScreenSummaryContent extends ScreenSummaryContent {
  public constructor(_model: SeriesRlcModel) {
    const a11y = StringManager.getInstance().getSeriesRlcA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
