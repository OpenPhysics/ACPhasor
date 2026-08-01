/**
 * ACSourceModel.ts
 *
 * Composable model of the sinusoidal voltage source that drives every screen's
 * circuit: v = V₀·cos(Θ + φ). It owns the user-controllable peak amplitude V₀
 * and frequency f, and derives the angular frequency ω = 2πf and the source
 * voltage {@link Phasor}.
 *
 * The drive phase Θ is accumulated as dΘ/dt = ω rather than written as ωt. That
 * keeps the waveform and the rotating phasors continuous when the learner drags
 * the frequency mid-run — changing f would otherwise jump cos(ωt + φ) because t
 * is wall-clock time and the new ω is applied to the whole elapsed history.
 *
 * Compose it into a screen model rather than extending it:
 *
 *   import { ACSourceModel } from "../../common/model/ACSourceModel.js";
 *
 *   export class MyModel implements TModel {
 *     public readonly source = new ACSourceModel();
 *     public step( dt: number ): void {
 *       const before = this.timer.timeProperty.value;
 *       this.timer.step( dt );
 *       this.source.advanceDrivePhase( this.timer.timeProperty.value - before );
 *     }
 *   }
 *
 * The source phase φ is fixed at 0 by default (the reference phasor); pass a
 * different `phase` if a screen needs a non-zero reference.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import {
  AC_AMPLITUDE_DEFAULT_V,
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_DEFAULT_HZ,
  AC_FREQUENCY_RANGE_HZ,
} from "../../ACPhasorConstants.js";
import { Phasor } from "./Phasor.js";

export type ACSourceModelSelfOptions = {
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

export type ACSourceModelOptions = ACSourceModelSelfOptions;

export class ACSourceModel {
  /** Peak amplitude V₀ of the source voltage (V). */
  public readonly amplitudeProperty: NumberProperty;

  /** Driving frequency f of the source (Hz). */
  public readonly frequencyProperty: NumberProperty;

  /** Fixed reference phase φ of the source (radians). */
  public readonly phase: number;

  /**
   * Accumulated drive phase Θ (radians). Advances as dΘ/dt = ω via
   * {@link advanceDrivePhase}; the rotating dials and scopes read this instead
   * of ω·t so a frequency change does not discontinuity the signal.
   */
  public readonly drivePhaseProperty: NumberProperty;

  /** Angular frequency ω = 2πf (rad/s), derived from {@link frequencyProperty}. */
  public readonly angularFrequencyProperty: TReadOnlyProperty<number>;

  /** Source voltage phasor V₀·e^(jφ), derived from amplitude (and fixed phase). */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor>;

  public constructor(providedOptions?: ACSourceModelOptions) {
    const options = optionize<ACSourceModelOptions, ACSourceModelSelfOptions, EmptySelfOptions>()(
      {
        amplitude: AC_AMPLITUDE_DEFAULT_V,
        amplitudeRange: AC_AMPLITUDE_RANGE_V,
        frequency: AC_FREQUENCY_DEFAULT_HZ,
        frequencyRange: AC_FREQUENCY_RANGE_HZ,
        phase: 0,
      },
      providedOptions,
    );

    this.phase = options.phase;

    this.amplitudeProperty = new NumberProperty(options.amplitude, {
      range: options.amplitudeRange,
      units: "V",
    });

    this.frequencyProperty = new NumberProperty(options.frequency, {
      range: options.frequencyRange,
      units: "Hz",
    });

    this.drivePhaseProperty = new NumberProperty(0);

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

  /**
   * Advance the drive phase by ω·dt. Pass the same dt the clock actually applied
   * (including speed scaling and step-forward), so Θ stays locked to the playhead.
   */
  public advanceDrivePhase(dt: number): void {
    this.drivePhaseProperty.value += this.angularFrequencyProperty.value * dt;
  }

  /**
   * Instantaneous source voltage at the accumulated drive phase:
   * V₀·cos(Θ + φ). Prefer this for live animation.
   */
  public instantaneousVoltage(): number {
    return this.voltagePhasorProperty.value.instantaneousAtDrivePhase(this.drivePhaseProperty.value);
  }

  /**
   * Analytic sample v(t) = V₀·cos(ωt + φ) from a quiescent phase origin. Useful
   * for tests and averages over a period; live animation should use
   * {@link instantaneousVoltage} / {@link drivePhaseProperty} instead.
   */
  public voltageAt(time: number): number {
    return this.voltagePhasorProperty.value.instantaneousValue(this.angularFrequencyProperty.value, time);
  }

  public reset(): void {
    this.amplitudeProperty.reset();
    this.frequencyProperty.reset();
    this.drivePhaseProperty.reset();
  }

  public dispose(): void {
    this.voltagePhasorProperty.dispose();
    this.angularFrequencyProperty.dispose();
    this.drivePhaseProperty.dispose();
    this.amplitudeProperty.dispose();
    this.frequencyProperty.dispose();
  }
}
