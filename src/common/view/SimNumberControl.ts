/**
 * SimNumberControl.ts
 *
 * A pre-themed {@link NumberControl} for the sim's dark panels: the title reads
 * in the panel text color, the value badge sits on the light control surface,
 * and the value is formatted with a units pattern (e.g. "{{value}} Ω"). Use it
 * for every slider-with-readout so styling stays consistent.
 *
 * ── Logarithmic sliders ───────────────────────────────────────────────────────
 *
 * `logarithmic: true` puts the *slider* in log space while the model Property and
 * the readout stay in real units. Use it wherever a range spans more than about a
 * decade: the source frequency runs from 0.02 Hz to 5 Hz, and on a linear track
 * the whole sub-hertz region — which is where every resonance in this sim lives —
 * would be squeezed into the first fifth of the travel. In log space each step of
 * the slider is a constant *ratio*, so the bottom of the range gets as much room
 * as the top.
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

import { NumberProperty, type PhetioProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { NumberControl, type NumberControlOptions, PhetFont } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../SimButtonOptions.js";

export type SimNumberControlOptions = {
  /** Digits after the decimal point in the readout (default 1). */
  decimalPlaces?: number;
  /**
   * Drive the slider by log₁₀ of the value rather than the value itself, so the
   * track is divided by ratio instead of by difference. The bound Property and
   * the readout are unaffected — they stay in real units.
   *
   * Requires a strictly positive range.
   */
  logarithmic?: boolean;
} & NumberControlOptions;

export class SimNumberControl extends NumberControl {
  /** The log-space Property backing the slider, or null for a linear control. */
  private readonly logProperty: NumberProperty | null;
  private readonly detachLogBridge: (() => void) | null;

  public constructor(
    title: TReadOnlyProperty<string>,
    numberProperty: PhetioProperty<number>,
    range: Range,
    valuePattern: TReadOnlyProperty<string>,
    providedOptions?: SimNumberControlOptions,
  ) {
    const { decimalPlaces = 1, logarithmic = false, ...controlOptions } = providedOptions ?? {};

    const useLog = logarithmic && range.min > 0;
    const sliderRange = useLog ? new Range(Math.log10(range.min), Math.log10(range.max)) : range;
    const delta = controlOptions.delta ?? (sliderRange.max - sliderRange.min) / 100;

    // In log space the control is bound to an intermediate Property; the display
    // has to undo the mapping, which rules out valuePattern/decimalPlaces (they
    // are mutually exclusive with numberFormatter) and means filling the pattern
    // by hand.
    const numberDisplayOptions = useLog
      ? {
          numberFormatter: (logValue: number): string =>
            StringUtils.fillIn(valuePattern.value, {
              value: (10 ** logValue).toFixed(decimalPlaces),
            }),
          numberFormatterDependencies: [valuePattern],
        }
      : { valuePattern, decimalPlaces };

    let sliderProperty: PhetioProperty<number> = numberProperty;
    let logProperty: NumberProperty | null = null;
    if (useLog) {
      logProperty = new NumberProperty(clampToRange(Math.log10(numberProperty.value), sliderRange), {
        range: sliderRange,
      });
      sliderProperty = logProperty;
    }

    super(title, sliderProperty, sliderRange, {
      delta,
      titleNodeOptions: {
        font: new PhetFont(14),
        fill: ACPhasorColors.textColorProperty,
        maxWidth: 140,
      },
      numberDisplayOptions: {
        ...numberDisplayOptions,
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

    this.logProperty = logProperty;
    this.detachLogBridge = null;

    if (logProperty) {
      // Keep the two Properties in step in both directions: the slider writes
      // through to the model, and a model change from anywhere else — reset, a
      // linked control — moves the slider. The guard keeps the round trip from
      // ping-ponging, and matters here because 10^log10(x) is not exactly x.
      let syncing = false;
      const fromModel = (value: number): void => {
        if (syncing || !(value > 0)) {
          return;
        }
        syncing = true;
        logProperty.value = clampToRange(Math.log10(value), sliderRange);
        syncing = false;
      };
      const toModel = (logValue: number): void => {
        if (syncing) {
          return;
        }
        syncing = true;
        numberProperty.value = clampToRange(10 ** logValue, range);
        syncing = false;
      };
      numberProperty.link(fromModel);
      logProperty.link(toModel);
      this.detachLogBridge = () => {
        numberProperty.unlink(fromModel);
        logProperty.unlink(toModel);
      };
    }
  }

  public override dispose(): void {
    this.detachLogBridge?.();
    this.logProperty?.dispose();
    super.dispose();
  }
}

/** Clamp a value into a range, so float round-trips never trip range validation. */
function clampToRange(value: number, range: Range): number {
  return Math.max(range.min, Math.min(range.max, value));
}
