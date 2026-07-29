/**
 * ResonanceModel.ts
 *
 * Model for the Resonance & frequency-sweep screen. The circuit is the same
 * series RLC loop as the screen before it ({@link RlcCircuitModel}); what
 * changes is the question. Instead of asking what the circuit does at one
 * frequency, this screen asks what it does across the whole range — the current
 * peaks at f₀ = 1/(2π√(LC)), where the reactances cancel and only R is left to
 * limit it, and the phase swings from −90° (capacitive) through zero to +90°
 * (inductive) as the drive passes through that peak.
 *
 * The sharpness of the peak is the quality factor Q = (1/R)√(L/C), and its width
 * is the half-power bandwidth Δf = f₀/Q. Both come from the shared circuit,
 * along with {@link RlcCircuitModel.currentAmplitudeAt} and
 * {@link RlcCircuitModel.phaseAt}, which is how the view samples its curves.
 *
 * ── The sweep ─────────────────────────────────────────────────────────────────
 *
 * {@link isSweepingProperty} walks the drive frequency across the source's whole
 * range in {@link FREQUENCY_SWEEP_DURATION_S} seconds and then starts over, so a
 * learner can watch the operating point climb the resonance curve rather than
 * having to hunt for the peak by hand.
 *
 * The travel is logarithmic — a constant *ratio* per second, matching the
 * frequency slider — because the range spans 2.4 decades and a linear sweep
 * would cross every resonance below 1 Hz in its first few frames.
 *
 * Each step reads the sweep's position back out of the frequency rather than
 * keeping its own progress counter. That makes the sweep a pure function of the
 * frequency, so grabbing the slider mid-sweep and letting go simply continues
 * from wherever it was left, with nothing to fall out of sync.
 */

import { BooleanProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  AC_FREQUENCY_RANGE_HZ,
  FREQUENCY_SWEEP_DURATION_S,
  RESONANCE_SCREEN_CAPACITANCE_F,
  RESONANCE_SCREEN_INDUCTANCE_H,
  RESONANCE_SCREEN_RESISTANCE_OHMS,
} from "../../ACPhasorConstants.js";
import type { Phasor } from "../../common/model/Phasor.js";
import { RlcCircuitModel } from "../../common/model/RlcCircuitModel.js";

export class ResonanceModel implements TModel {
  /**
   * The series RLC loop being swept. It opens on element values chosen for this
   * screen rather than the sim-wide ones: the shared defaults give Q = 0.1, and
   * a resonance screen whose curve has no visible peak in it explains nothing.
   */
  public readonly circuit = new RlcCircuitModel({
    resistance: RESONANCE_SCREEN_RESISTANCE_OHMS,
    inductance: RESONANCE_SCREEN_INDUCTANCE_H,
    capacitance: RESONANCE_SCREEN_CAPACITANCE_F,
  });

  /** Whether the drive frequency is currently sweeping across the range. */
  public readonly isSweepingProperty = new BooleanProperty(false);

  // ── The circuit's Properties, re-exported ───────────────────────────────────
  // Same convention as {@link SeriesRlcModel}: the view and its tests read
  // `model.qualityFactorProperty` rather than reaching through `model.circuit`
  // for every one of them. The screen still owns the circuit — anything that has
  // to *sample* it off-frequency (`currentAmplitudeAt`, `phaseAt`) goes through
  // `model.circuit` because it is a method, not a Property.

  /** The sinusoidal voltage source whose frequency the sweep walks. */
  public readonly source = this.circuit.source;

  /** Resistance R (Ω). */
  public readonly resistanceProperty = this.circuit.resistanceProperty;

  /** Inductance L (H). */
  public readonly inductanceProperty = this.circuit.inductanceProperty;

  /** Capacitance C (F). */
  public readonly capacitanceProperty = this.circuit.capacitanceProperty;

  /** Total series impedance Z = R + j(ωL − 1/ωC). */
  public readonly impedanceProperty: TReadOnlyProperty<Complex> = this.circuit.impedanceProperty;

  /** Peak current |I| (A) at the present drive frequency — the height of the curve. */
  public readonly currentAmplitudeProperty: TReadOnlyProperty<number> = this.circuit.currentAmplitudeProperty;

  /** Phase by which source voltage leads current, arg(Z) (radians). */
  public readonly phaseProperty: TReadOnlyProperty<number> = this.circuit.phaseProperty;

  /** Resonant frequency f₀ = 1/(2π√(LC)) (Hz) — where the curve peaks. */
  public readonly resonantFrequencyProperty: TReadOnlyProperty<number> = this.circuit.resonantFrequencyProperty;

  /** Quality factor Q = (1/R)·√(L/C) — how sharp that peak is. */
  public readonly qualityFactorProperty: TReadOnlyProperty<number> = this.circuit.qualityFactorProperty;

  /** Half-power bandwidth Δf = f₀/Q (Hz) — how wide it is. */
  public readonly bandwidthProperty: TReadOnlyProperty<number> = this.circuit.bandwidthProperty;

  /** The two frequencies bounding the half-power band. */
  public readonly lowerHalfPowerFrequencyProperty: TReadOnlyProperty<number> =
    this.circuit.lowerHalfPowerFrequencyProperty;
  public readonly upperHalfPowerFrequencyProperty: TReadOnlyProperty<number> =
    this.circuit.upperHalfPowerFrequencyProperty;

  /** Whether the reactances have cancelled closely enough to call it resonance. */
  public readonly isAtResonanceProperty: TReadOnlyProperty<boolean> = this.circuit.isAtResonanceProperty;

  /** The impedance triangle's three sides, as phasors on the complex plane. */
  public readonly resistancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.resistancePhasorProperty;
  public readonly reactancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.reactancePhasorProperty;
  public readonly impedancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.impedancePhasorProperty;

  /**
   * Advance the sweep. Ignores dt entirely when the sweep is off, so a paused
   * screen is genuinely still.
   */
  public step(dt: number): void {
    if (!this.isSweepingProperty.value) {
      return;
    }
    const range = AC_FREQUENCY_RANGE_HZ;
    const decades = Math.log10(range.max / range.min);
    const frequency = this.source.frequencyProperty.value;

    // Where the present frequency sits along the sweep, in [0, 1].
    const position = Math.log10(frequency / range.min) / decades;
    let next = position + dt / FREQUENCY_SWEEP_DURATION_S;
    // Wrap rather than stop: the curve is worth seeing more than once, and a
    // sweep that parks itself at 5 Hz would need resetting before every run.
    while (next > 1) {
      next -= 1;
    }

    this.source.frequencyProperty.value = Math.min(range.max, Math.max(range.min, range.min * 10 ** (next * decades)));
  }

  public reset(): void {
    this.isSweepingProperty.reset();
    this.circuit.reset();
  }

  /**
   * Release the listener graph. Everything this screen exposes belongs to the
   * circuit, so only the sweep flag is disposed here.
   */
  public dispose(): void {
    this.isSweepingProperty.dispose();
    this.circuit.dispose();
  }
}
