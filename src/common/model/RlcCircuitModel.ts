/**
 * RlcCircuitModel.ts
 *
 * The series RLC circuit itself: an {@link ACSourceModel} driving a resistor, an
 * inductor, and a capacitor in one loop. Three screens are built on it — Series
 * RLC draws its phasors, Resonance sweeps its drive frequency, and Power
 * multiplies its voltage and current together — so the electrical vocabulary is
 * defined once here and composed rather than re-derived.
 *
 *   Z = R + j(ωL − 1/ωC)     total series impedance
 *   I = V / Z                the current every element shares
 *   V_R = I·R                (in phase with the current)
 *   V_L = I·jωL              (leads the current by 90°)
 *   V_C = I·(−j/ωC)          (lags the current by 90°)
 *
 * By Kirchhoff's voltage law V_R + V_L + V_C equals the source voltage, so the
 * three element phasors close the voltage triangle back onto the source phasor.
 * Dividing that triangle through by the (common) current gives the impedance
 * triangle R + jX = Z, which is why the two are the same shape; the impedance
 * side is exposed as phasors so a view can draw it.
 *
 * ── Frequency response ────────────────────────────────────────────────────────
 *
 * The Properties above describe the circuit at the frequency it is *presently*
 * driven at. {@link impedanceAt} and friends answer the same questions for any
 * frequency without disturbing the model, which is what a response curve needs:
 * it plots the circuit as it *would* respond across a whole range.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   export class MyModel implements TModel {
 *     public readonly circuit = new RlcCircuitModel();
 *     public reset(): void { this.circuit.reset(); }
 *   }
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import {
  CAPACITANCE_DEFAULT_F,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_DEFAULT_H,
  INDUCTANCE_RANGE_H,
  RESISTANCE_DEFAULT_OHMS,
  RESISTANCE_RANGE_OHMS,
  RESONANCE_PHASE_TOLERANCE_RADIANS,
} from "../../ACPhasorConstants.js";
import { ACSourceModel } from "./ACSourceModel.js";
import {
  capacitorImpedance,
  inductorImpedance,
  resistorImpedance,
  resonantFrequency,
  seriesRlcImpedance,
} from "./Impedance.js";
import { Phasor } from "./Phasor.js";

/**
 * Starting element values, for a screen whose phenomenon needs a particular
 * corner of the R–L–C space to be visible from the moment it opens. Anything
 * omitted takes the sim-wide default from {@link ACPhasorConstants}; the ranges
 * are always the shared ones, so the controls behave identically everywhere.
 */
export type RlcCircuitModelOptions = {
  /** Initial resistance (Ω). */
  resistance?: number;
  /** Initial inductance (H). */
  inductance?: number;
  /** Initial capacitance (F). */
  capacitance?: number;
};

export class RlcCircuitModel {
  /** The sinusoidal voltage source driving the series loop. */
  public readonly source = new ACSourceModel();

  /** Resistance R (Ω). */
  public readonly resistanceProperty: NumberProperty;

  /** Inductance L (henries). No `units` — henries are not in axon's unit list. */
  public readonly inductanceProperty: NumberProperty;

  /** Capacitance C (F). */
  public readonly capacitanceProperty: NumberProperty;

  /** Total series impedance Z = R + j(ωL − 1/ωC). */
  public readonly impedanceProperty: TReadOnlyProperty<Complex>;

  /** Source voltage phasor (the reference). */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor>;

  /** Current phasor through the (series) circuit, I = V / Z. */
  public readonly currentPhasorProperty: TReadOnlyProperty<Phasor>;

  /** Peak current |I| (A) — the amplitude that traces the resonance curve. */
  public readonly currentAmplitudeProperty: TReadOnlyProperty<number>;

  /** Voltage phasor across the resistor, V_R = I·R. */
  public readonly resistorVoltageProperty: TReadOnlyProperty<Phasor>;

  /** Voltage phasor across the inductor, V_L = I·jωL. */
  public readonly inductorVoltageProperty: TReadOnlyProperty<Phasor>;

  /** Voltage phasor across the capacitor, V_C = I·(−j/ωC). */
  public readonly capacitorVoltageProperty: TReadOnlyProperty<Phasor>;

  /** Net reactance X = ωL − 1/ωC (Ω): >0 inductive, <0 capacitive, 0 at resonance. */
  public readonly reactanceProperty: TReadOnlyProperty<number>;

  /** Phase by which source voltage leads current, arg(Z) (radians). */
  public readonly phaseProperty: TReadOnlyProperty<number>;

  /** Resonant frequency f₀ = 1/(2π√(LC)) (Hz). */
  public readonly resonantFrequencyProperty: TReadOnlyProperty<number>;

  /**
   * Quality factor Q = (1/R)·√(L/C) — how sharply the circuit selects its
   * resonant frequency. It is the peak's height relative to its width: a large Q
   * is a tall, narrow resonance, a small one a broad hump.
   */
  public readonly qualityFactorProperty: TReadOnlyProperty<number>;

  /**
   * Half-power bandwidth Δf = f₀/Q = R/(2πL) (Hz) — the width of the band over
   * which the current stays within 1/√2 of its peak.
   */
  public readonly bandwidthProperty: TReadOnlyProperty<number>;

  /**
   * The two frequencies where the current has fallen to 1/√2 of its peak — the
   * edges of the band whose width is {@link bandwidthProperty}.
   *
   * Solving |ωL − 1/ωC| = R, the condition that the reactance equals the
   * resistance, gives ω± = (±R + √(R² + 4L/C)) / 2L. Those two are exactly Δω
   * apart, but they do not straddle ω₀ evenly: their midpoint is
   * ω₀·√(1 + 1/4Q²), which sits above ω₀ and only approaches it as Q grows. So
   * drawing the band as f₀ ± Δf/2 is fine at high Q and visibly wrong at low Q
   * — and low Q is where this sim's R, L and C ranges actually put it.
   */
  public readonly lowerHalfPowerFrequencyProperty: TReadOnlyProperty<number>;
  public readonly upperHalfPowerFrequencyProperty: TReadOnlyProperty<number>;

  /**
   * Whether the reactances have cancelled closely enough to call it resonance —
   * measured on the phase angle, which is the thing the triangles are showing.
   */
  public readonly isAtResonanceProperty: TReadOnlyProperty<boolean>;

  /**
   * The impedance triangle's three sides, as phasors on the complex plane:
   * resistance along the real axis, net reactance along the imaginary axis, and
   * the impedance that closes them. Dividing every voltage phasor by the common
   * current gives exactly this figure, which is why it is the same shape as the
   * voltage triangle.
   */
  public readonly resistancePhasorProperty: TReadOnlyProperty<Phasor>;
  public readonly reactancePhasorProperty: TReadOnlyProperty<Phasor>;
  public readonly impedancePhasorProperty: TReadOnlyProperty<Phasor>;

  public constructor(providedOptions?: RlcCircuitModelOptions) {
    const options = {
      resistance: RESISTANCE_DEFAULT_OHMS,
      inductance: INDUCTANCE_DEFAULT_H,
      capacitance: CAPACITANCE_DEFAULT_F,
      ...providedOptions,
    };

    this.resistanceProperty = new NumberProperty(options.resistance, {
      range: RESISTANCE_RANGE_OHMS,
      units: "Ω",
    });
    this.inductanceProperty = new NumberProperty(options.inductance, {
      range: INDUCTANCE_RANGE_H,
    });
    this.capacitanceProperty = new NumberProperty(options.capacitance, {
      range: CAPACITANCE_RANGE_F,
      units: "F",
    });

    this.voltagePhasorProperty = this.source.voltagePhasorProperty;

    this.impedanceProperty = new DerivedProperty(
      [
        this.resistanceProperty,
        this.inductanceProperty,
        this.capacitanceProperty,
        this.source.angularFrequencyProperty,
      ],
      (resistance, inductance, capacitance, angularFrequency) =>
        seriesRlcImpedance(resistance, inductance, capacitance, angularFrequency),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.currentPhasorProperty = new DerivedProperty(
      [this.voltagePhasorProperty, this.impedanceProperty],
      (voltage, impedance) => voltage.dividedBy(impedance),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.currentAmplitudeProperty = new DerivedProperty([this.currentPhasorProperty], (current) => current.amplitude);

    this.resistorVoltageProperty = new DerivedProperty(
      [this.currentPhasorProperty, this.resistanceProperty],
      (current, resistance) => current.times(resistorImpedance(resistance)),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.inductorVoltageProperty = new DerivedProperty(
      [this.currentPhasorProperty, this.inductanceProperty, this.source.angularFrequencyProperty],
      (current, inductance, angularFrequency) => current.times(inductorImpedance(inductance, angularFrequency)),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.capacitorVoltageProperty = new DerivedProperty(
      [this.currentPhasorProperty, this.capacitanceProperty, this.source.angularFrequencyProperty],
      (current, capacitance, angularFrequency) => current.times(capacitorImpedance(capacitance, angularFrequency)),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.reactanceProperty = new DerivedProperty([this.impedanceProperty], (impedance) => impedance.imaginary);

    this.phaseProperty = new DerivedProperty([this.impedanceProperty], (impedance) => impedance.phase());

    this.resonantFrequencyProperty = new DerivedProperty(
      [this.inductanceProperty, this.capacitanceProperty],
      (inductance, capacitance) => resonantFrequency(inductance, capacitance),
    );

    this.qualityFactorProperty = new DerivedProperty(
      [this.resistanceProperty, this.inductanceProperty, this.capacitanceProperty],
      (resistance, inductance, capacitance) => Math.sqrt(inductance / capacitance) / resistance,
    );

    // Δf = R/(2πL) is f₀/Q written without the round trip through √(LC), so it
    // stays exact where Q and f₀ would each carry their own rounding.
    this.bandwidthProperty = new DerivedProperty(
      [this.resistanceProperty, this.inductanceProperty],
      (resistance, inductance) => resistance / (2 * Math.PI * inductance),
    );

    const halfPowerEdge = (sign: number, resistance: number, inductance: number, capacitance: number): number => {
      const angular =
        (sign * resistance + Math.sqrt(resistance * resistance + (4 * inductance) / capacitance)) / (2 * inductance);
      return angular / (2 * Math.PI);
    };
    this.lowerHalfPowerFrequencyProperty = new DerivedProperty(
      [this.resistanceProperty, this.inductanceProperty, this.capacitanceProperty],
      (resistance, inductance, capacitance) => halfPowerEdge(-1, resistance, inductance, capacitance),
    );
    this.upperHalfPowerFrequencyProperty = new DerivedProperty(
      [this.resistanceProperty, this.inductanceProperty, this.capacitanceProperty],
      (resistance, inductance, capacitance) => halfPowerEdge(1, resistance, inductance, capacitance),
    );

    this.isAtResonanceProperty = new DerivedProperty(
      [this.phaseProperty],
      (phase) => Math.abs(phase) < RESONANCE_PHASE_TOLERANCE_RADIANS,
    );

    this.resistancePhasorProperty = new DerivedProperty(
      [this.resistanceProperty],
      (resistance) => Phasor.fromRectangular(resistance, 0),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.reactancePhasorProperty = new DerivedProperty(
      [this.reactanceProperty],
      (reactance) => Phasor.fromRectangular(0, reactance),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.impedancePhasorProperty = new DerivedProperty(
      [this.impedanceProperty],
      (impedance) => Phasor.fromComplex(impedance),
      { valueComparisonStrategy: "equalsFunction" },
    );
  }

  // ── Frequency response ──────────────────────────────────────────────────────
  // Answers about a frequency the circuit is not currently being driven at. They
  // read the present R, L, C and source amplitude but leave every Property
  // alone, so a view can sample a whole curve inside one render pass.

  /** Series impedance Z(f) the circuit would present at the given frequency. */
  public impedanceAt(frequency: number): Complex {
    return seriesRlcImpedance(
      this.resistanceProperty.value,
      this.inductanceProperty.value,
      this.capacitanceProperty.value,
      2 * Math.PI * frequency,
    );
  }

  /** Peak current |I(f)| = |V| / |Z(f)| the source would drive at the given frequency. */
  public currentAmplitudeAt(frequency: number): number {
    const magnitude = this.impedanceAt(frequency).magnitude;
    // |Z| → ∞ as f → 0 (the capacitor blocks DC), so the current goes to zero
    // rather than to a division by zero.
    return Number.isFinite(magnitude) && magnitude > 0 ? this.source.amplitudeProperty.value / magnitude : 0;
  }

  /** Phase arg Z(f) (radians) by which the source voltage would lead the current. */
  public phaseAt(frequency: number): number {
    const impedance = this.impedanceAt(frequency);
    // At f = 0 the reactance is −∞ and Complex.phase() is undefined; the limit is
    // a pure capacitor, −90°.
    return Number.isFinite(impedance.imaginary) ? impedance.phase() : -Math.PI / 2;
  }

  public reset(): void {
    this.source.reset();
    this.resistanceProperty.reset();
    this.inductanceProperty.reset();
    this.capacitanceProperty.reset();
  }

  /**
   * Release the listener graph this circuit builds, so a discarded screen model
   * stops being kept alive — and stops recomputing — through it.
   *
   * The order is the reverse of construction: every DerivedProperty here listens
   * to the ones declared above it and to the source's, so the leaves have to let
   * go before the things they depend on. {@link voltagePhasorProperty} is not
   * disposed: it is an alias for the source's, which `source.dispose()` owns.
   */
  public dispose(): void {
    this.impedancePhasorProperty.dispose();
    this.reactancePhasorProperty.dispose();
    this.resistancePhasorProperty.dispose();
    this.isAtResonanceProperty.dispose();
    this.upperHalfPowerFrequencyProperty.dispose();
    this.lowerHalfPowerFrequencyProperty.dispose();
    this.bandwidthProperty.dispose();
    this.qualityFactorProperty.dispose();
    this.resonantFrequencyProperty.dispose();
    this.phaseProperty.dispose();
    this.reactanceProperty.dispose();
    this.capacitorVoltageProperty.dispose();
    this.inductorVoltageProperty.dispose();
    this.resistorVoltageProperty.dispose();
    this.currentAmplitudeProperty.dispose();
    this.currentPhasorProperty.dispose();
    this.impedanceProperty.dispose();
    this.capacitanceProperty.dispose();
    this.inductanceProperty.dispose();
    this.resistanceProperty.dispose();
    this.source.dispose();
  }
}
