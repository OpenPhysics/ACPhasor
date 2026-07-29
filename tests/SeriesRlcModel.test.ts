/**
 * SeriesRlcModel.test.ts
 *
 * Unit tests for the Series RLC model: Kirchhoff's voltage law across the
 * elements, and the inductive / capacitive / resonant regimes.
 */

import { describe, expect, it } from "vitest";
import { SeriesRlcModel } from "../src/series-rlc/model/SeriesRlcModel.js";

describe("SeriesRlcModel", () => {
  it("element voltages sum to the source voltage (KVL)", () => {
    const model = new SeriesRlcModel();
    const vr = model.resistorVoltageProperty.value;
    const vl = model.inductorVoltageProperty.value;
    const vc = model.capacitorVoltageProperty.value;
    const sum = vr.plus(vl).plus(vc);
    const source = model.voltagePhasorProperty.value;
    expect(sum.real).toBeCloseTo(source.real);
    expect(sum.imaginary).toBeCloseTo(source.imaginary);
  });

  it("current obeys Ohm's law I = V / Z", () => {
    const model = new SeriesRlcModel();
    const expected = model.voltagePhasorProperty.value.dividedBy(model.impedanceProperty.value);
    expect(model.currentPhasorProperty.value.amplitude).toBeCloseTo(expected.amplitude);
    expect(model.currentPhasorProperty.value.phase).toBeCloseTo(expected.phase);
  });

  it("is inductive (positive reactance) above the resonant frequency", () => {
    const model = new SeriesRlcModel();
    // Resonance at f0 = 1/(2π√(LC)); push frequency well above it.
    model.source.frequencyProperty.value = model.resonantFrequencyProperty.value * 4;
    expect(model.reactanceProperty.value).toBeGreaterThan(0);
    expect(model.phaseProperty.value).toBeGreaterThan(0);
  });

  it("is capacitive (negative reactance) below the resonant frequency", () => {
    const model = new SeriesRlcModel();
    model.source.frequencyProperty.value = model.resonantFrequencyProperty.value / 4;
    expect(model.reactanceProperty.value).toBeLessThan(0);
    expect(model.phaseProperty.value).toBeLessThan(0);
  });

  it("is purely resistive at resonance", () => {
    const model = new SeriesRlcModel();
    model.inductanceProperty.value = 2;
    model.capacitanceProperty.value = 0.5;
    // Set frequency to the resonant frequency for this L and C.
    model.source.frequencyProperty.value = model.resonantFrequencyProperty.value;
    expect(model.reactanceProperty.value).toBeCloseTo(0);
    expect(model.impedanceProperty.value.real).toBeCloseTo(model.resistanceProperty.value);
  });

  it("reset() restores defaults", () => {
    const model = new SeriesRlcModel();
    model.resistanceProperty.value = 50;
    model.source.amplitudeProperty.value = 9;
    model.reset();
    expect(model.resistanceProperty.value).toBe(10);
    expect(model.source.amplitudeProperty.value).toBe(5);
  });

  describe("clock", () => {
    it("advances while playing and stops when paused", () => {
      const model = new SeriesRlcModel();
      model.step(1);
      expect(model.timer.timeProperty.value).toBeCloseTo(1);

      model.timer.isPlayingProperty.value = false;
      model.step(1);
      expect(model.timer.timeProperty.value).toBeCloseTo(1);
    });

    it("advances drive phase with the clock", () => {
      const model = new SeriesRlcModel();
      model.source.frequencyProperty.value = 1;
      model.step(0.5);
      expect(model.source.drivePhaseProperty.value).toBeCloseTo(Math.PI);
    });

    it("reset() rewinds the clock and drive phase", () => {
      const model = new SeriesRlcModel();
      model.step(2);
      model.reset();
      expect(model.timer.timeProperty.value).toBe(0);
      expect(model.source.drivePhaseProperty.value).toBe(0);
    });
  });

  describe("isAtResonanceProperty", () => {
    it("is true at the resonant frequency and false a factor away", () => {
      const model = new SeriesRlcModel();
      model.source.frequencyProperty.value = model.resonantFrequencyProperty.value;
      expect(model.isAtResonanceProperty.value).toBe(true);

      model.source.frequencyProperty.value = model.resonantFrequencyProperty.value * 2;
      expect(model.isAtResonanceProperty.value).toBe(false);
    });

    it("agrees with the phase readout rather than with a fixed band in ohms", () => {
      // A tolerance in ohms would mean something different at R = 1 than at
      // R = 100; a tolerance in phase means the same thing at both.
      const model = new SeriesRlcModel();
      for (const resistance of [1, 100]) {
        model.resistanceProperty.value = resistance;
        model.source.frequencyProperty.value = model.resonantFrequencyProperty.value;
        expect(model.isAtResonanceProperty.value).toBe(true);
      }
    });
  });

  describe("impedance triangle", () => {
    it("R and X are the legs and Z closes them", () => {
      const model = new SeriesRlcModel();
      model.source.frequencyProperty.value = model.resonantFrequencyProperty.value * 3;

      const r = model.resistancePhasorProperty.value;
      const x = model.reactancePhasorProperty.value;
      const z = model.impedancePhasorProperty.value;

      // R lies on the real axis, X on the imaginary axis, and they sum to Z —
      // the geometry the view draws head to tail.
      expect(r.imaginary).toBeCloseTo(0);
      expect(x.real).toBeCloseTo(0);
      expect(r.plus(x).real).toBeCloseTo(z.real);
      expect(r.plus(x).imaginary).toBeCloseTo(z.imaginary);
    });

    it("is similar to the voltage triangle — the same shape, scaled by |I|", () => {
      const model = new SeriesRlcModel();
      model.source.frequencyProperty.value = model.resonantFrequencyProperty.value * 3;

      const current = model.currentPhasorProperty.value;
      // V_R = I·R, so the voltage triangle is the impedance triangle turned by
      // arg(I) and scaled by |I|. Their corresponding angles must match.
      const impedanceAngle = model.impedancePhasorProperty.value.phase - model.resistancePhasorProperty.value.phase;
      const voltageAngle = model.voltagePhasorProperty.value.phase - model.resistorVoltageProperty.value.phase;
      expect(voltageAngle).toBeCloseTo(impedanceAngle);

      expect(model.resistorVoltageProperty.value.amplitude).toBeCloseTo(
        current.amplitude * model.resistancePhasorProperty.value.amplitude,
      );
    });
  });
});
