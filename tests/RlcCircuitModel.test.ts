/**
 * RlcCircuitModel.test.ts
 *
 * Unit tests for the shared series RLC circuit. The Series RLC screen's own
 * tests cover the phasor geometry; what is tested here is the part the last two
 * screens added — the resonance figures (Q, bandwidth) and the frequency-response
 * helpers, which answer for frequencies the circuit is not being driven at and
 * must agree with the live Properties when it is.
 */

import { describe, expect, it } from "vitest";
import { RlcCircuitModel } from "../src/common/model/RlcCircuitModel.js";

describe("RlcCircuitModel", () => {
  describe("frequency response helpers", () => {
    it("agrees with the live Properties at the driven frequency", () => {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = 25;
      circuit.inductanceProperty.value = 2;
      circuit.capacitanceProperty.value = 0.5;
      circuit.source.frequencyProperty.value = 0.3;

      const frequency = circuit.source.frequencyProperty.value;
      expect(circuit.currentAmplitudeAt(frequency)).toBeCloseTo(circuit.currentPhasorProperty.value.amplitude);
      expect(circuit.phaseAt(frequency)).toBeCloseTo(circuit.phaseProperty.value);
      expect(circuit.impedanceAt(frequency).magnitude).toBeCloseTo(circuit.impedanceProperty.value.magnitude);
    });

    it("does not disturb the model when sampled elsewhere", () => {
      const circuit = new RlcCircuitModel();
      const frequency = circuit.source.frequencyProperty.value;
      const current = circuit.currentPhasorProperty.value.amplitude;

      for (const sample of [0.02, 0.1, 1, 5]) {
        circuit.currentAmplitudeAt(sample);
        circuit.phaseAt(sample);
      }

      expect(circuit.source.frequencyProperty.value).toBe(frequency);
      expect(circuit.currentPhasorProperty.value.amplitude).toBeCloseTo(current);
    });

    it("peaks at the resonant frequency, where the current is V / R", () => {
      const circuit = new RlcCircuitModel();
      const resonant = circuit.resonantFrequencyProperty.value;
      const peak = circuit.currentAmplitudeAt(resonant);

      expect(peak).toBeCloseTo(circuit.source.amplitudeProperty.value / circuit.resistanceProperty.value);
      // Either side of the peak the current is strictly smaller — that is what
      // makes the curve a peak rather than a step.
      expect(circuit.currentAmplitudeAt(resonant / 2)).toBeLessThan(peak);
      expect(circuit.currentAmplitudeAt(resonant * 2)).toBeLessThan(peak);
    });

    it("goes to zero current and −90° at DC, where the capacitor blocks", () => {
      const circuit = new RlcCircuitModel();
      expect(circuit.currentAmplitudeAt(0)).toBe(0);
      expect(circuit.phaseAt(0)).toBeCloseTo(-Math.PI / 2);
    });

    it("sweeps the phase from capacitive through zero to inductive", () => {
      const circuit = new RlcCircuitModel();
      const resonant = circuit.resonantFrequencyProperty.value;
      expect(circuit.phaseAt(resonant / 4)).toBeLessThan(0);
      expect(circuit.phaseAt(resonant)).toBeCloseTo(0);
      expect(circuit.phaseAt(resonant * 4)).toBeGreaterThan(0);
    });

    it("approaches +90° far above resonance, where only the inductor is left", () => {
      const circuit = new RlcCircuitModel();
      const resonant = circuit.resonantFrequencyProperty.value;
      // The mirror of the DC limit: ωL swamps both R and 1/ωC, so Z is very
      // nearly a pure inductor, and the phase closes on +90° from below without
      // ever reaching it.
      expect(circuit.phaseAt(resonant * 1e4)).toBeGreaterThan(Math.PI / 2 - 0.01);
      expect(circuit.phaseAt(resonant * 1e4)).toBeLessThan(Math.PI / 2);
      expect(circuit.phaseAt(resonant * 1e8)).toBeGreaterThan(circuit.phaseAt(resonant * 1e4));
      // …and the current falls away to nothing with it.
      expect(circuit.currentAmplitudeAt(resonant * 1e8)).toBeLessThan(1e-6);
    });
  });

  describe("quality factor and bandwidth", () => {
    it.each([
      // R, L, C, Q — spanning the sim's ranges, from a broad hump to a sharp peak.
      [5, 4, 1, 0.4],
      [1, 10, 0.1, 10],
      [100, 1, 1, 0.01],
      [10, 0.5, 5, 0.03162277660168379],
      [2, 8, 2, 1],
    ])("Q = (1/R)·√(L/C): R=%p L=%p C=%p → %p", (resistance, inductance, capacitance, expected) => {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = resistance;
      circuit.inductanceProperty.value = inductance;
      circuit.capacitanceProperty.value = capacitance;
      expect(circuit.qualityFactorProperty.value).toBeCloseTo(expected, 8);
      // Q is also f₀/Δf, which is what makes it readable off the chart.
      expect(circuit.resonantFrequencyProperty.value / circuit.bandwidthProperty.value).toBeCloseTo(expected, 8);
    });

    it("bandwidth is f₀ / Q", () => {
      const circuit = new RlcCircuitModel();
      for (const resistance of [1, 10, 100]) {
        circuit.resistanceProperty.value = resistance;
        const expected = circuit.resonantFrequencyProperty.value / circuit.qualityFactorProperty.value;
        expect(circuit.bandwidthProperty.value).toBeCloseTo(expected);
      }
    });

    it("the half-power edges really are at 1/√2 of the peak, at any Q", () => {
      const circuit = new RlcCircuitModel();
      // A sharp resonance and a broad one: the edges are exact for both, which
      // an f₀ ± Δf/2 band would not be.
      for (const [resistance, inductance, capacitance] of [
        [1, 10, 0.1],
        [50, 1, 5],
      ]) {
        circuit.resistanceProperty.value = resistance as number;
        circuit.inductanceProperty.value = inductance as number;
        circuit.capacitanceProperty.value = capacitance as number;

        const peak = circuit.currentAmplitudeAt(circuit.resonantFrequencyProperty.value);
        for (const edge of [
          circuit.lowerHalfPowerFrequencyProperty.value,
          circuit.upperHalfPowerFrequencyProperty.value,
        ]) {
          expect(circuit.currentAmplitudeAt(edge)).toBeCloseTo(peak / Math.SQRT2, 6);
        }
      }
    });

    it("the half-power edges are exactly one bandwidth apart", () => {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = 30;
      circuit.inductanceProperty.value = 2;
      circuit.capacitanceProperty.value = 4;

      const width = circuit.upperHalfPowerFrequencyProperty.value - circuit.lowerHalfPowerFrequencyProperty.value;
      expect(width).toBeCloseTo(circuit.bandwidthProperty.value, 9);
      // …but they do not straddle f₀ evenly; their midpoint sits above it.
      const midpoint =
        (circuit.upperHalfPowerFrequencyProperty.value + circuit.lowerHalfPowerFrequencyProperty.value) / 2;
      expect(midpoint).toBeGreaterThan(circuit.resonantFrequencyProperty.value);
    });

    it("a smaller resistance makes the peak both taller and narrower", () => {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = 50;
      const broadPeak = circuit.currentAmplitudeAt(circuit.resonantFrequencyProperty.value);
      const broadBandwidth = circuit.bandwidthProperty.value;

      circuit.resistanceProperty.value = 5;
      expect(circuit.currentAmplitudeAt(circuit.resonantFrequencyProperty.value)).toBeGreaterThan(broadPeak);
      expect(circuit.bandwidthProperty.value).toBeLessThan(broadBandwidth);
    });
  });

  /**
   * The reason `drivePhaseProperty` exists. Everything the screens animate is
   * read at the accumulated Θ rather than at ω·t, so that dragging the frequency
   * mid-run — or letting the Resonance screen's sweep do it — moves the traces
   * rather than tearing them.
   *
   * The source's own phasor is a weak place to check that: its phase is fixed at
   * 0, so nothing but the time reference can move. A *derived* phasor is the real
   * test, because V_L = I·jωL changes amplitude and phase with f as well.
   */
  describe("drive-phase continuity", () => {
    /** v_L at the accumulated drive phase, the way every view reads it. */
    function inductorVoltageAtDrivePhase(circuit: RlcCircuitModel): number {
      return circuit.inductorVoltageProperty.value.instantaneousAtDrivePhase(circuit.source.drivePhaseProperty.value);
    }

    /** A circuit whose V_L is a decent fraction of the source, for a legible signal. */
    function sweepableCircuit(): RlcCircuitModel {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = 20;
      circuit.inductanceProperty.value = 4;
      circuit.capacitanceProperty.value = 2;
      circuit.source.frequencyProperty.value = 0.1;
      return circuit;
    }

    it("keeps a derived phasor's signal continuous while the frequency is swept", () => {
      const circuit = sweepableCircuit();

      // Twenty seconds of playback, with the drive frequency climbing a decade
      // underneath it — the Resonance screen's sweep, in other words.
      const steps = 1200;
      let time = 0;
      let previousDrivePhase = inductorVoltageAtDrivePhase(circuit);
      let previousOmegaT = circuit.inductorVoltageProperty.value.instantaneousValue(
        circuit.source.angularFrequencyProperty.value,
        time,
      );
      let drivePhaseJump = 0;
      let omegaTJump = 0;
      for (let i = 1; i <= steps; i++) {
        circuit.source.frequencyProperty.value = 0.1 * 10 ** (i / steps);
        circuit.source.advanceDrivePhase(1 / 60);
        time += 1 / 60;

        const atDrivePhase = inductorVoltageAtDrivePhase(circuit);
        drivePhaseJump = Math.max(drivePhaseJump, Math.abs(atDrivePhase - previousDrivePhase));
        previousDrivePhase = atDrivePhase;

        const atOmegaT = circuit.inductorVoltageProperty.value.instantaneousValue(
          circuit.source.angularFrequencyProperty.value,
          time,
        );
        omegaTJump = Math.max(omegaTJump, Math.abs(atOmegaT - previousOmegaT));
        previousOmegaT = atOmegaT;
      }

      // One frame at the top of the sweep turns the phasor by ω/60 ≈ 0.1 rad, so
      // a few tenths of a volt is the honest frame-to-frame motion.
      expect(circuit.inductorVoltageProperty.value.amplitude).toBeGreaterThan(1);
      expect(drivePhaseJump).toBeLessThan(0.5);
      // And it is the drive phase doing it, not the algebra: the same sweep read
      // at ω·t jumps several times as far per frame, because each new ω is
      // applied to the whole elapsed history.
      expect(omegaTJump).toBeGreaterThan(2 * drivePhaseJump);
    });

    it("moves the trace by less and less as the frequency change shrinks", () => {
      // Continuity, stated as the thing that can actually be measured: nudge the
      // slider by a smaller amount twenty seconds into a run, and the trace
      // should move by a proportionally smaller amount. Under ω·t it does not —
      // the jump carries a factor of the elapsed time.
      const measure = (delta: number): { atDrivePhase: number; atOmegaT: number } => {
        const circuit = sweepableCircuit();
        const time = 20;
        circuit.source.advanceDrivePhase(time);

        const beforeDrivePhase = inductorVoltageAtDrivePhase(circuit);
        const beforeOmegaT = circuit.inductorVoltageProperty.value.instantaneousValue(
          circuit.source.angularFrequencyProperty.value,
          time,
        );

        circuit.source.frequencyProperty.value = 0.1 + delta;

        return {
          atDrivePhase: Math.abs(inductorVoltageAtDrivePhase(circuit) - beforeDrivePhase),
          atOmegaT: Math.abs(
            circuit.inductorVoltageProperty.value.instantaneousValue(
              circuit.source.angularFrequencyProperty.value,
              time,
            ) - beforeOmegaT,
          ),
        };
      };

      const coarse = measure(0.01);
      const fine = measure(0.001);

      // Θ is untouched by the change, so all that moves is the phasor itself: a
      // ten-times smaller nudge moves the trace roughly ten times less.
      expect(fine.atDrivePhase).toBeLessThan(coarse.atDrivePhase / 5);
      // The ω·t form applies the new ω to twenty seconds of history, so the same
      // nudge throws the trace much further.
      expect(coarse.atOmegaT).toBeGreaterThan(5 * coarse.atDrivePhase);
      expect(fine.atOmegaT).toBeGreaterThan(5 * fine.atDrivePhase);
    });
  });

  it("reset() restores the source and every element value", () => {
    const circuit = new RlcCircuitModel();
    circuit.resistanceProperty.value = 42;
    circuit.inductanceProperty.value = 5;
    circuit.capacitanceProperty.value = 3;
    circuit.source.frequencyProperty.value = 4;

    circuit.reset();

    expect(circuit.resistanceProperty.value).toBe(10);
    expect(circuit.inductanceProperty.value).toBe(1);
    expect(circuit.capacitanceProperty.value).toBe(1);
    expect(circuit.source.frequencyProperty.value).toBe(1);
  });
});
