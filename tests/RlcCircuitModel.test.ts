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
  });

  describe("quality factor and bandwidth", () => {
    it("Q = (1/R)·√(L/C)", () => {
      const circuit = new RlcCircuitModel();
      circuit.resistanceProperty.value = 5;
      circuit.inductanceProperty.value = 4;
      circuit.capacitanceProperty.value = 1;
      // √(4/1) / 5 = 0.4
      expect(circuit.qualityFactorProperty.value).toBeCloseTo(0.4);
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
