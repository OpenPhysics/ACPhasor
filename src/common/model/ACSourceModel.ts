/**
 * ACSourceModel.ts
 *
 * Composable model of the sinusoidal voltage source that drives every screen's
 * circuit: v(t) = V₀·cos(ωt + φ). It owns the user-controllable peak amplitude
 * V₀ and frequency f, and derives the angular frequency ω = 2πf and the source
 * voltage {@link Phasor}.
 *
 * Compose it into a screen model rather than extending it:
 *
 *   import { ACSourceModel } from "../../common/model/ACSourceModel.js";
 *
 *   export class MyModel implements TModel {
 *     public readonly source = new ACSourceModel();
 *     // use this.source.angularFrequencyProperty.value for physics
 *   }
 *
 * The source phase φ is fixed at 0 by default (the reference phasor); pass a
 * different `phase` if a screen needs a non-zero reference.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import {
  AC_AMPLITUDE_DEFAULT_V,
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_DEFAULT_HZ,
  AC_FREQUENCY_RANGE_HZ,
} from "../../ACPhasorConstants.js";
import { Phasor } from "./Phasor.js";

export type ACSourceModelOptions = {
  /** Initial peak amplitude V₀ in volts. */
  amplitude?: number;
  /** Allowed amplitude range in volts. */
  amplitudeRange?: Range;
  /** Initial frequency f in hertz. */
  frequency?: number;
  /** Allowed frequency range in hertz. */
  frequencyRange?: Range;
  /** Fixed reference phase φ in radians (default 0). */
  phase?: number;
};

export class ACSourceModel {
  /** Peak amplitude V₀ of the source voltage (V). */
  public readonly amplitudeProperty: NumberProperty;

  /** Driving frequency f of the source (Hz). */
  public readonly frequencyProperty: NumberProperty;

  /** Fixed reference phase φ of the source (radians). */
  public readonly phase: number;

  /** Angular frequency ω = 2πf (rad/s), derived from {@link frequencyProperty}. */
  public readonly angularFrequencyProperty: TReadOnlyProperty<number>;

  /** Source voltage phasor V₀·e^(jφ), derived from amplitude (and fixed phase). */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor>;

  public constructor(providedOptions?: ACSourceModelOptions) {
    const options = {
      amplitude: AC_AMPLITUDE_DEFAULT_V,
      amplitudeRange: AC_AMPLITUDE_RANGE_V,
      frequency: AC_FREQUENCY_DEFAULT_HZ,
      frequencyRange: AC_FREQUENCY_RANGE_HZ,
      phase: 0,
      ...providedOptions,
    };

    this.phase = options.phase;

    this.amplitudeProperty = new NumberProperty(options.amplitude, {
      range: options.amplitudeRange,
      units: "V",
    });

    this.frequencyProperty = new NumberProperty(options.frequency, {
      range: options.frequencyRange,
      units: "Hz",
    });

    this.angularFrequencyProperty = new DerivedProperty(
      [this.frequencyProperty],
      (frequency) => 2 * Math.PI * frequency,
    );

    this.voltagePhasorProperty = new DerivedProperty(
      [this.amplitudeProperty],
      (amplitude) => new Phasor(amplitude, this.phase),
      { valueComparisonStrategy: "equalsFunction" },
    );
  }

  /** The instantaneous source voltage v(t) = V₀·cos(ωt + φ). */
  public voltageAt(time: number): number {
    return this.voltagePhasorProperty.value.instantaneousValue(this.angularFrequencyProperty.value, time);
  }

  public reset(): void {
    this.amplitudeProperty.reset();
    this.frequencyProperty.reset();
  }

  public dispose(): void {
    this.voltagePhasorProperty.dispose();
    this.angularFrequencyProperty.dispose();
    this.amplitudeProperty.dispose();
    this.frequencyProperty.dispose();
  }
}
