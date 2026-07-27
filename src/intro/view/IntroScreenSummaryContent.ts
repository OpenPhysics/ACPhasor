/**
 * IntroScreenSummaryContent.ts
 *
 * Accessible screen summary for the Intro screen (PDOM / Interactive Description).
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";

export class IntroScreenSummaryContent extends ScreenSummaryContent {
  public constructor(_model: IntroModel) {
    const a11y = StringManager.getInstance().getIntroA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
