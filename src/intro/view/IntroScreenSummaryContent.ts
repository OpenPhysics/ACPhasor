/**
 * IntroScreenSummaryContent.ts
 *
 * Accessible screen summary for the Intro screen (PDOM / Interactive Description).
 * The current-details sentence is live: it tracks the selected component so a
 * screen-reader user hears the correct phase relationship.
 */
import { DerivedProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";

export class IntroScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: IntroModel) {
    const a11y = StringManager.getInstance().getIntroA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.elementTypeProperty,
        a11y.currentDetails.resistorStringProperty,
        a11y.currentDetails.inductorStringProperty,
        a11y.currentDetails.capacitorStringProperty,
      ],
      (type, resistor, inductor, capacitor) =>
        type === "resistor" ? resistor : type === "inductor" ? inductor : capacitor,
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
