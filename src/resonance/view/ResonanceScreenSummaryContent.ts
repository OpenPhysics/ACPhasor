/**
 * ResonanceScreenSummaryContent.ts
 *
 * Accessible screen summary for the Resonance & frequency-sweep screen. The
 * current-details sentence is live: it reports which side of the resonant peak
 * the drive frequency is presently on, which is what the marker on the curve
 * shows sighted users.
 */
import { DerivedProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ResonanceModel } from "../model/ResonanceModel.js";

export class ResonanceScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ResonanceModel) {
    const a11y = StringManager.getInstance().getResonanceA11yStrings();

    // Keyed on the phase, exactly as the "at resonance" badge is, so the
    // sentence and the badge can never disagree about where the peak is.
    const currentDetails = new DerivedProperty(
      [
        model.phaseProperty,
        model.isAtResonanceProperty,
        a11y.currentDetails.belowStringProperty,
        a11y.currentDetails.aboveStringProperty,
        a11y.currentDetails.atStringProperty,
      ],
      (phase, isAtResonance, below, above, at) => {
        if (isAtResonance) {
          return at;
        }
        // arg Z > 0 is inductive, which happens above the resonant frequency.
        return phase > 0 ? above : below;
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
