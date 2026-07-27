/**
 * SeriesRlcScreenSummaryContent.ts
 *
 * Accessible screen summary for the Series RLC screen. The current-details
 * sentence is live: it reports whether the circuit is currently inductive,
 * capacitive, or at resonance, based on the net reactance.
 */
import { DerivedProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeriesRlcModel } from "../model/SeriesRlcModel.js";

// Net reactance (Ω) within this band of zero is treated as resonance.
const RESONANCE_REACTANCE_TOLERANCE = 0.05;

export class SeriesRlcScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SeriesRlcModel) {
    const a11y = StringManager.getInstance().getSeriesRlcA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        model.reactanceProperty,
        a11y.currentDetails.inductiveStringProperty,
        a11y.currentDetails.capacitiveStringProperty,
        a11y.currentDetails.resonantStringProperty,
      ],
      (reactance, inductive, capacitive, resonant) => {
        if (Math.abs(reactance) <= RESONANCE_REACTANCE_TOLERANCE) {
          return resonant;
        }
        return reactance > 0 ? inductive : capacitive;
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
