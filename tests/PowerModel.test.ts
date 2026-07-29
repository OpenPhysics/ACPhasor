/**
 * PowerModel.test.ts
 *
 * Unit tests for the Power screen. The load-bearing check is the last one: the
 * real power the model reports must equal the *numerical* average of v(t)·i(t)
 * over a cycle. P is computed from the phasors and p(t) from the signals, so the
 * two paths are independent, and agreeing means the algebra behind
 * p = P + S·cos(2ωt − φ) is right rather than merely self-consistent.
 */

import { describe, expect, it } from "vitest";
import { PowerModel } from "../src/power/model/PowerModel.js";

/** Average of p(t) over one full source cycle, by the trapezoid rule. */
function averagePower(model: PowerModel, samples = 4000): number {
  const angularFrequency = model.circuit.source.angularFrequencyProperty.value;
  const period = (2 * Math.PI) / angularFrequency;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    total += model.instantaneousPowerAt((period * i) / samples);
  }
  return total / samples;
}

describe("PowerModel", () => {
  it("S is ½·V·I and P² + Q² = S²", () => {
    const model = new PowerModel();
    model.circuit.source.frequencyProperty.value = 0.4;

    const voltage = model.circuit.voltagePhasorProperty.value.amplitude;
    const current = model.circuit.currentPhasorProperty.value.amplitude;
    expect(model.apparentPowerProperty.value).toBeCloseTo((voltage * current) / 2);

    const real = model.realPowerProperty.value;
    const reactive = model.reactivePowerProperty.value;
    expect(Math.hypot(real, reactive)).toBeCloseTo(model.apparentPowerProperty.value);
  });

  it("real power is the power dissipated in the resistance, ½·I²·R", () => {
    const model = new PowerModel();
    model.circuit.source.frequencyProperty.value = 0.35;

    const current = model.circuit.currentPhasorProperty.value.amplitude;
    const resistance = model.circuit.resistanceProperty.value;
    // Only R consumes anything: that is why P is the average of p(t).
    expect(model.realPowerProperty.value).toBeCloseTo((current * current * resistance) / 2);
  });

  describe("at resonance", () => {
    it("has unity power factor and all of S is real", () => {
      const model = new PowerModel();
      model.circuit.source.frequencyProperty.value = model.circuit.resonantFrequencyProperty.value;

      expect(model.powerFactorProperty.value).toBeCloseTo(1);
      expect(model.reactivePowerProperty.value).toBeCloseTo(0);
      expect(model.realPowerProperty.value).toBeCloseTo(model.apparentPowerProperty.value);
    });

    it("never lets p(t) go negative — no energy is handed back", () => {
      const model = new PowerModel();
      model.circuit.source.frequencyProperty.value = model.circuit.resonantFrequencyProperty.value;

      const period = (2 * Math.PI) / model.circuit.source.angularFrequencyProperty.value;
      for (let i = 0; i <= 200; i++) {
        expect(model.instantaneousPowerAt((period * i) / 200)).toBeGreaterThanOrEqual(-1e-9);
      }
    });
  });

  describe("far from resonance", () => {
    it("approaches zero real power as the load becomes purely reactive", () => {
      const model = new PowerModel();
      model.circuit.resistanceProperty.value = 1;
      model.circuit.inductanceProperty.value = 10;
      // Well above resonance: the reactance dwarfs the 1 Ω of resistance.
      model.circuit.source.frequencyProperty.value = 5;

      expect(Math.abs(model.powerFactorProperty.value)).toBeLessThan(0.01);
      expect(model.realPowerProperty.value).toBeLessThan(model.apparentPowerProperty.value / 50);
      // Reactive, not lost: the same energy goes out and comes back each cycle.
      expect(Math.abs(model.reactivePowerProperty.value)).toBeCloseTo(model.apparentPowerProperty.value, 4);
    });

    it("is lagging above resonance and leading below it", () => {
      const model = new PowerModel();
      const resonant = model.circuit.resonantFrequencyProperty.value;

      model.circuit.source.frequencyProperty.value = resonant * 3;
      expect(model.reactivePowerProperty.value).toBeGreaterThan(0);

      model.circuit.source.frequencyProperty.value = resonant / 3;
      expect(model.reactivePowerProperty.value).toBeLessThan(0);
    });
  });

  describe("p(t) = v·i", () => {
    it("averages to the real power across the regimes", () => {
      const model = new PowerModel();
      const resonant = model.circuit.resonantFrequencyProperty.value;

      for (const frequency of [resonant / 4, resonant, resonant * 4]) {
        model.circuit.source.frequencyProperty.value = frequency;
        expect(averagePower(model)).toBeCloseTo(model.realPowerProperty.value, 4);
      }
    });

    it("swings by S about that average, at twice the drive frequency", () => {
      const model = new PowerModel();
      model.circuit.source.frequencyProperty.value = 0.5;

      const period = (2 * Math.PI) / model.circuit.source.angularFrequencyProperty.value;
      let minimum = Number.POSITIVE_INFINITY;
      let maximum = Number.NEGATIVE_INFINITY;
      for (let i = 0; i <= 2000; i++) {
        const power = model.instantaneousPowerAt((period * i) / 2000);
        minimum = Math.min(minimum, power);
        maximum = Math.max(maximum, power);
      }
      // Two full excursions in one source period, peak to peak equal to 2·S.
      expect(maximum - minimum).toBeCloseTo(2 * model.apparentPowerProperty.value, 3);
      expect((maximum + minimum) / 2).toBeCloseTo(model.realPowerProperty.value, 3);
    });
  });

  describe("power triangle", () => {
    it("P and Q are the legs and S closes them", () => {
      const model = new PowerModel();
      model.circuit.source.frequencyProperty.value = model.circuit.resonantFrequencyProperty.value * 2;

      const real = model.realPowerPhasorProperty.value;
      const reactive = model.reactivePowerPhasorProperty.value;
      const apparent = model.apparentPowerPhasorProperty.value;

      expect(real.imaginary).toBeCloseTo(0);
      expect(reactive.real).toBeCloseTo(0);
      expect(real.plus(reactive).real).toBeCloseTo(apparent.real);
      expect(real.plus(reactive).imaginary).toBeCloseTo(apparent.imaginary);
    });

    it("opens at the same angle as the impedance triangle", () => {
      const model = new PowerModel();
      model.circuit.source.frequencyProperty.value = model.circuit.resonantFrequencyProperty.value * 2;
      // Multiplying every side of the impedance triangle by ½·I² gives this one,
      // so the two are similar and their angles must match.
      expect(model.apparentPowerPhasorProperty.value.phase).toBeCloseTo(model.circuit.phaseProperty.value);
    });
  });

  describe("clock", () => {
    it("advances while playing and stops when paused", () => {
      const model = new PowerModel();
      model.step(1);
      expect(model.timer.timeProperty.value).toBeCloseTo(1);

      model.timer.isPlayingProperty.value = false;
      model.step(1);
      expect(model.timer.timeProperty.value).toBeCloseTo(1);
    });

    it("reset() rewinds the clock and restores the circuit", () => {
      const model = new PowerModel();
      model.step(2);
      model.circuit.resistanceProperty.value = 75;

      model.reset();

      expect(model.timer.timeProperty.value).toBe(0);
      expect(model.circuit.resistanceProperty.value).toBe(10);
    });
  });
});
