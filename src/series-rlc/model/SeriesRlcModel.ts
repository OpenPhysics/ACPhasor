/**
 * SeriesRlcModel.ts
 *
 * Model for the Series RLC screen: the shared {@link RlcCircuitModel} — a
 * resistor, inductor, and capacitor in series across one AC source — plus the
 * clock that spins its phasors.
 *
 * The physics lives in the shared circuit, because the Resonance and Power
 * screens drive exactly the same loop and only ask different questions of it.
 * What this screen adds is time: the voltage triangle rotates at ω, and the
 * impedance triangle deliberately does not.
 *
 * The circuit's Properties are re-exported as fields so the view and its tests
 * read `model.resistorVoltageProperty` rather than reaching through
 * `model.circuit` for every one of them.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { Phasor } from "../../common/model/Phasor.js";
import { RlcCircuitModel } from "../../common/model/RlcCircuitModel.js";
import { TimeModel } from "../../common/TimeModel.js";

export class SeriesRlcModel implements TModel {
  /** The series RLC loop: source, R, L, C, and everything derived from them. */
  public readonly circuit = new RlcCircuitModel();

  /** Play/pause + elapsed time for the rotating phasors (starts playing). */
  public readonly timer = new TimeModel(true);

  /** The sinusoidal voltage source driving the series circuit. */
  public readonly source = this.circuit.source;

  /** Resistance R (Ω). */
  public readonly resistanceProperty = this.circuit.resistanceProperty;

  /** Inductance L (H). */
  public readonly inductanceProperty = this.circuit.inductanceProperty;

  /** Capacitance C (F). */
  public readonly capacitanceProperty = this.circuit.capacitanceProperty;

  /** Total series impedance Z = R + j(ωL − 1/ωC). */
  public readonly impedanceProperty: TReadOnlyProperty<Complex> = this.circuit.impedanceProperty;

  /** Source voltage phasor (the reference). */
  public readonly voltagePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.voltagePhasorProperty;

  /** Current phasor through the (series) circuit, I = V / Z. */
  public readonly currentPhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.currentPhasorProperty;

  /** Voltage phasor across the resistor, V_R = I·R. */
  public readonly resistorVoltageProperty: TReadOnlyProperty<Phasor> = this.circuit.resistorVoltageProperty;

  /** Voltage phasor across the inductor, V_L = I·jωL. */
  public readonly inductorVoltageProperty: TReadOnlyProperty<Phasor> = this.circuit.inductorVoltageProperty;

  /** Voltage phasor across the capacitor, V_C = I·(−j/ωC). */
  public readonly capacitorVoltageProperty: TReadOnlyProperty<Phasor> = this.circuit.capacitorVoltageProperty;

  /** Net reactance X = ωL − 1/ωC (Ω): >0 inductive, <0 capacitive, 0 at resonance. */
  public readonly reactanceProperty: TReadOnlyProperty<number> = this.circuit.reactanceProperty;

  /** Phase by which source voltage leads current, arg(Z) (radians). */
  public readonly phaseProperty: TReadOnlyProperty<number> = this.circuit.phaseProperty;

  /** Resonant frequency f₀ = 1/(2π√(LC)) (Hz). */
  public readonly resonantFrequencyProperty: TReadOnlyProperty<number> = this.circuit.resonantFrequencyProperty;

  /** Whether the reactances have cancelled closely enough to call it resonance. */
  public readonly isAtResonanceProperty: TReadOnlyProperty<boolean> = this.circuit.isAtResonanceProperty;

  /** The impedance triangle's three sides, as phasors on the complex plane. */
  public readonly resistancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.resistancePhasorProperty;
  public readonly reactancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.reactancePhasorProperty;
  public readonly impedancePhasorProperty: TReadOnlyProperty<Phasor> = this.circuit.impedancePhasorProperty;

  public step(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.step(dt);
    this.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  /**
   * Advance the clock and drive phase by one frame while paused. Wire the
   * TimeControlNode step-forward button here so Θ stays locked to the playhead.
   */
  public stepForward(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.stepForward(dt);
    this.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  public reset(): void {
    this.circuit.reset();
    this.timer.reset();
  }

  /**
   * Release the listener graph. Every Property this screen exposes belongs to
   * the circuit, so there is nothing here to dispose beyond it and the clock.
   */
  public dispose(): void {
    this.timer.dispose();
    this.circuit.dispose();
  }
}
