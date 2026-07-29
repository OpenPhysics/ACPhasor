/**
 * PowerScreenSummaryContent.ts
 *
 * Accessible screen summary for the Power-in-AC-circuits screen. The
 * current-details sentence is live: it reports whether the power factor is
 * essentially unity, lagging (inductive), or leading (capacitive) — the three
 * cases the power triangle and the shaded p(t) trace are showing.
 */
import { DerivedProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { PowerModel } from "../model/PowerModel.js";

export class PowerScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: PowerModel) {
    const a11y = StringManager.getInstance().getPowerA11yStrings();

    // "Unity" is decided by the model's own resonance test rather than by a
    // second threshold on cos φ, so this sentence agrees with the rest of the
    // sim about when the reactances have cancelled.
    const currentDetails = new DerivedProperty(
      [
        model.circuit.phaseProperty,
        model.circuit.isAtResonanceProperty,
        a11y.currentDetails.unityStringProperty,
        a11y.currentDetails.laggingStringProperty,
        a11y.currentDetails.leadingStringProperty,
      ],
      (phase, isAtResonance, unity, lagging, leading) => {
        if (isAtResonance) {
          return unity;
        }
        // arg Z > 0 is inductive: the current lags, and so does the power factor.
        return phase > 0 ? lagging : leading;
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
