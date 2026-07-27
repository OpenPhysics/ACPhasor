/**
 * SimNumberControl.ts
 *
 * A pre-themed {@link NumberControl} for the sim's dark panels: the title reads
 * in the panel text color, the value badge sits on the light control surface,
 * and the value is formatted with a units pattern (e.g. "{{value}} Ω"). Use it
 * for every slider-with-readout so styling stays consistent.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const control = new SimNumberControl(
 *     labels.resistanceStringProperty,
 *     model.resistanceProperty,
 *     RESISTANCE_RANGE_OHMS,
 *     labels.ohmsPatternStringProperty,
 *     { decimalPlaces: 0, accessibleName: a11y.controls.resistanceStringProperty },
 *   );
 */

import type { PhetioProperty, TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { NumberControl, type NumberControlOptions, PhetFont } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../SimButtonOptions.js";

export type SimNumberControlOptions = {
  /** Digits after the decimal point in the readout (default 1). */
  decimalPlaces?: number;
} & NumberControlOptions;

export class SimNumberControl extends NumberControl {
  public constructor(
    title: TReadOnlyProperty<string>,
    numberProperty: PhetioProperty<number>,
    range: Range,
    valuePattern: TReadOnlyProperty<string>,
    providedOptions?: SimNumberControlOptions,
  ) {
    const { decimalPlaces = 1, ...controlOptions } = providedOptions ?? {};
    const delta = controlOptions.delta ?? (range.max - range.min) / 100;

    super(title, numberProperty, range, {
      delta,
      titleNodeOptions: {
        font: new PhetFont(14),
        fill: ACPhasorColors.textColorProperty,
        maxWidth: 140,
      },
      numberDisplayOptions: {
        valuePattern,
        decimalPlaces,
        textOptions: {
          font: new PhetFont(14),
          fill: ACPhasorColors.controlSurfaceTextColorProperty,
        },
        backgroundFill: ACPhasorColors.controlSurfaceColorProperty,
        backgroundStroke: ACPhasorColors.panelBorderColorProperty,
      },
      sliderOptions: {
        trackFillEnabled: ACPhasorColors.accentColorProperty,
        thumbFill: ACPhasorColors.accentColorProperty,
      },
      arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
      ...controlOptions,
    });
  }
}
