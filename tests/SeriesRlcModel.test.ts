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
});
