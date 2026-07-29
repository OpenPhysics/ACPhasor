/**
 * PowerModel.ts
 *
 * Model for the Power-in-AC-circuits screen. The circuit is again the shared
 * series RLC loop ({@link RlcCircuitModel}); the new quantity is the product of
 * its two signals.
 *
 *   p(t) = v(t)·i(t) = V·I·cos(ωt)·cos(ωt − φ)
 *        = (V·I/2)·cos φ  +  (V·I/2)·cos(2ωt − φ)
 *
 * That identity is the whole screen. Instantaneous power is a sinusoid at
 * *twice* the drive frequency, riding on a constant offset — and the offset is
 * the only part that does not average away:
 *
 *   P = ½·V·I·cos φ    real power (W)      — the average; what the resistor burns
 *   Q = ½·V·I·sin φ    reactive power (var) — sloshes into L and C and back out
 *   S = ½·V·I          apparent power (VA)  — √(P² + Q²), the hypotenuse
 *   cos φ              power factor         — the fraction of S that does work
 *
 * P, Q and S form a right triangle similar to the impedance and voltage
 * triangles of the earlier screens (multiply Z's sides by ½·I² and you get this
 * one), so the view can draw it with the same {@link PhasorChainNode}. At
 * resonance φ = 0: the triangle flattens, the power factor is 1, and p(t) never
 * goes negative. In a purely reactive circuit φ = ±90°: P = 0, and p(t) is a
 * symmetric sinusoid about zero — energy is borrowed and returned twice a cycle,
 * and none of it is consumed.
 *
 * Amplitudes are peak values throughout the sim, hence the factors of ½; in RMS
 * terms the same quantities read P = V_rms·I_rms·cos φ.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { Phasor } from "../../common/model/Phasor.js";
import { RlcCircuitModel } from "../../common/model/RlcCircuitModel.js";
import { TimeModel } from "../../common/TimeModel.js";

export class PowerModel implements TModel {
  /** The series RLC loop whose voltage and current are being multiplied. */
  public readonly circuit = new RlcCircuitModel();

  /** Play/pause + elapsed time for the traces and the circuit animation. */
  public readonly timer = new TimeModel(true);

  /**
   * Apparent power S = ½·V·I (VA) — the hypotenuse of the power triangle, and
   * also the amplitude of the 2ω swing of p(t) about its average.
   */
  public readonly apparentPowerProperty: TReadOnlyProperty<number>;

  /** Real (average) power P = ½·V·I·cos φ (W) — what the resistance dissipates. */
  public readonly realPowerProperty: TReadOnlyProperty<number>;

  /** Reactive power Q = ½·V·I·sin φ (var) — exchanged with L and C, never consumed. */
  public readonly reactivePowerProperty: TReadOnlyProperty<number>;

  /** Power factor cos φ, in [−1, 1]; 1 at resonance, 0 for a purely reactive load. */
  public readonly powerFactorProperty: TReadOnlyProperty<number>;

  /**
   * The power triangle's three sides as phasors: P along the real axis, Q along
   * the imaginary axis, and S closing them. Same shape as the impedance triangle
   * on the previous screens, scaled by ½·I².
   */
  public readonly realPowerPhasorProperty: TReadOnlyProperty<Phasor>;
  public readonly reactivePowerPhasorProperty: TReadOnlyProperty<Phasor>;
  public readonly apparentPowerPhasorProperty: TReadOnlyProperty<Phasor>;

  public constructor() {
    this.apparentPowerProperty = new DerivedProperty(
      [this.circuit.voltagePhasorProperty, this.circuit.currentPhasorProperty],
      (voltage, current) => (voltage.amplitude * current.amplitude) / 2,
    );

    // φ is the angle of Z: the phase by which the source voltage leads the
    // current, which is exactly the angle the power triangle opens at.
    this.realPowerProperty = new DerivedProperty(
      [this.apparentPowerProperty, this.circuit.phaseProperty],
      (apparent, phase) => apparent * Math.cos(phase),
    );

    this.reactivePowerProperty = new DerivedProperty(
      [this.apparentPowerProperty, this.circuit.phaseProperty],
      (apparent, phase) => apparent * Math.sin(phase),
    );

    this.powerFactorProperty = new DerivedProperty([this.circuit.phaseProperty], (phase) => Math.cos(phase));

    this.realPowerPhasorProperty = new DerivedProperty(
      [this.realPowerProperty],
      (real) => Phasor.fromRectangular(real, 0),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.reactivePowerPhasorProperty = new DerivedProperty(
      [this.reactivePowerProperty],
      (reactive) => Phasor.fromRectangular(0, reactive),
      { valueComparisonStrategy: "equalsFunction" },
    );

    this.apparentPowerPhasorProperty = new DerivedProperty(
      [this.realPowerProperty, this.reactivePowerProperty],
      (real, reactive) => Phasor.fromRectangular(real, reactive),
      { valueComparisonStrategy: "equalsFunction" },
    );
  }

  /**
   * Instantaneous power p(t) = v(t)·i(t) (W), computed as the product of the two
   * signals rather than from the P + S·cos(2ωt − φ) identity — so the scope trace
   * and the readouts are checkable against each other rather than against the
   * same line of algebra twice.
   */
  public instantaneousPowerAt(time: number): number {
    const angularFrequency = this.circuit.source.angularFrequencyProperty.value;
    const voltage = this.circuit.voltagePhasorProperty.value.instantaneousValue(angularFrequency, time);
    const current = this.circuit.currentPhasorProperty.value.instantaneousValue(angularFrequency, time);
    return voltage * current;
  }

  public step(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.step(dt);
    this.circuit.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  /**
   * Advance the clock and drive phase by one frame while paused. Wire the
   * TimeControlNode step-forward button here so Θ stays locked to the playhead.
   */
  public stepForward(dt: number): void {
    const before = this.timer.timeProperty.value;
    this.timer.stepForward(dt);
    this.circuit.source.advanceDrivePhase(this.timer.timeProperty.value - before);
  }

  public reset(): void {
    this.circuit.reset();
    this.timer.reset();
  }

  /**
   * Release the listener graph, leaves first: the power Properties listen to the
   * circuit's, so they have to let go before the circuit does.
   */
  public dispose(): void {
    this.apparentPowerPhasorProperty.dispose();
    this.reactivePowerPhasorProperty.dispose();
    this.realPowerPhasorProperty.dispose();
    this.powerFactorProperty.dispose();
    this.reactivePowerProperty.dispose();
    this.realPowerProperty.dispose();
    this.apparentPowerProperty.dispose();
    this.timer.dispose();
    this.circuit.dispose();
  }
}
