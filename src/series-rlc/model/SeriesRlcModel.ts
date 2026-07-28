/**
 * SeriesRlcModel.ts
 *
 * Model for the Series RLC screen: a resistor, inductor, and capacitor in
 * series across the shared {@link ACSourceModel}. The same current flows through
 * every element (I = V / Z_total), and the voltage across each element is the
 * current times that element's impedance:
 *
 *   V_R = I·R          (in phase with the current)
 *   V_L = I·jωL        (leads the current by 90°)
 *   V_C = I·(−j/ωC)    (lags the current by 90°)
 *
 * By Kirchhoff's voltage law V_R + V_L + V_C equals the source voltage, so the
 * three element phasors close the voltage triangle back onto the source phasor.
 *
 * Dividing that triangle through by the (common) current gives the impedance
 * triangle R + jX = Z, which is why the two are the same shape: the view draws
 * both, and the model exposes the impedance side as phasors so it can.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  CAPACITANCE_DEFAULT_F,
  CAPACITANCE_RANGE_F,
  INDUCTANCE_DEFAULT_H,
  INDUCTANCE_RANGE_H,
  RESISTANCE_DEFAULT_OHMS,
  RESISTANCE_RANGE_OHMS,
  RESONANCE_PHASE_TOLERANCE_RADIANS,
} from "../../ACPhasorConstants.js";
import { ACSourceModel } from "../../common/model/ACSourceModel.js";
import {
  capacitorImpedance,
  inductorImpedance,
  resistorImpedance,
  resonantFrequency,
  seriesRlcImpedance,
} from "../../common/model/Impedance.js";
import { Phasor } from "../../common/model/Phasor.js";
import { TimeModel } from "../../common/TimeModel.js";

export class SeriesRlcModel implements TModel {
  /** The sinusoidal voltage source driving the series circuit. */
  public readonly source = new ACSourceModel();

  /** Play/pause + elapsed time for the rotating phasors (starts playing). */
  public readonly timer = new TimeModel(true);

  /** Resistance R (Ω). */
  public readonly resistanceProperty = new NumberProperty(RESISTANCE_DEFAULT_OHMS, {
    range: RESISTANCE_RANGE_OHMS,
    units: "Ω",
  });

  /** Inductance L (henries). No `units` — henries are not in axon's unit list. */
  public readonly inductanceProperty = new NumberProperty(INDUCTANCE_DEFAULT_H, {
    range: INDUCTANCE_RANGE_H,
  });

  /** Capacitance C (F). */
  public readonly capacitanceProperty = new NumberProperty(CAPACITANCE_DEFAULT_F, {
    range: CAPACITANCE_RANGE_F,
    units: "F",
  });

  /** Total series impedance Z = R + j(ωL − 1/ωC). */
  public readonly impedanceProperty: TReadOnlyProperty<Complex>;

  /** Source voltage phasor (the reference). */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor>;

  /** Current phasor through the (series) circuit, I = V / Z. */
  public readonly currentPhasorProperty: TReadOnlyProperty<Phasor>;

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

  public constructor() {
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

  public step(dt: number): void {
    this.timer.step(dt);
  }

  public reset(): void {
    this.source.reset();
    this.timer.reset();
    this.resistanceProperty.reset();
    this.inductanceProperty.reset();
    this.capacitanceProperty.reset();
  }
}
