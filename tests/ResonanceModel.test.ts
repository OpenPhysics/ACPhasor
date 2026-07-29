/**
 * ResonanceModel.test.ts
 *
 * Unit tests for the Resonance screen's sweep. The circuit physics is covered by
 * RlcCircuitModel.test.ts; what is specific here is the frequency walk — that it
 * is logarithmic, that it stays inside the source's range, that it wraps rather
 * than parking at the top, and that it does nothing at all while switched off.
 */

import { describe, expect, it } from "vitest";
import { AC_FREQUENCY_RANGE_HZ, FREQUENCY_SWEEP_DURATION_S } from "../src/ACPhasorConstants.js";
import { ResonanceModel } from "../src/resonance/model/ResonanceModel.js";

describe("ResonanceModel", () => {
  it("does not move the frequency while the sweep is off", () => {
    const model = new ResonanceModel();
    const frequency = model.circuit.source.frequencyProperty.value;
    model.step(1);
    model.step(5);
    expect(model.circuit.source.frequencyProperty.value).toBe(frequency);
  });

  it("advances the frequency while sweeping", () => {
    const model = new ResonanceModel();
    model.circuit.source.frequencyProperty.value = AC_FREQUENCY_RANGE_HZ.min;
    model.isSweepingProperty.value = true;

    model.step(1);
    expect(model.circuit.source.frequencyProperty.value).toBeGreaterThan(AC_FREQUENCY_RANGE_HZ.min);
  });

  it("sweeps by constant ratio, not constant difference", () => {
    // A logarithmic sweep multiplies the frequency by the same factor each
    // second wherever it starts; a linear one would add the same amount.
    const ratioFrom = (start: number): number => {
      const model = new ResonanceModel();
      model.circuit.source.frequencyProperty.value = start;
      model.isSweepingProperty.value = true;
      model.step(1);
      return model.circuit.source.frequencyProperty.value / start;
    };

    expect(ratioFrom(0.05)).toBeCloseTo(ratioFrom(0.5), 6);
  });

  it("crosses the whole range in the advertised time", () => {
    const model = new ResonanceModel();
    model.circuit.source.frequencyProperty.value = AC_FREQUENCY_RANGE_HZ.min;
    model.isSweepingProperty.value = true;

    // One step of exactly the sweep duration lands on the far end.
    model.step(FREQUENCY_SWEEP_DURATION_S);
    expect(model.circuit.source.frequencyProperty.value).toBeCloseTo(AC_FREQUENCY_RANGE_HZ.max, 4);
  });

  it("wraps back to the bottom instead of parking at the top", () => {
    const model = new ResonanceModel();
    model.circuit.source.frequencyProperty.value = AC_FREQUENCY_RANGE_HZ.max;
    model.isSweepingProperty.value = true;

    model.step(FREQUENCY_SWEEP_DURATION_S / 10);
    expect(model.circuit.source.frequencyProperty.value).toBeLessThan(AC_FREQUENCY_RANGE_HZ.max / 2);
    expect(model.circuit.source.frequencyProperty.value).toBeGreaterThanOrEqual(AC_FREQUENCY_RANGE_HZ.min);
  });

  it("stays inside the range across a long run", () => {
    const model = new ResonanceModel();
    model.isSweepingProperty.value = true;
    for (let i = 0; i < 2000; i++) {
      model.step(1 / 60);
      const frequency = model.circuit.source.frequencyProperty.value;
      expect(frequency).toBeGreaterThanOrEqual(AC_FREQUENCY_RANGE_HZ.min);
      expect(frequency).toBeLessThanOrEqual(AC_FREQUENCY_RANGE_HZ.max);
    }
  });

  it("picks up a frequency set from outside mid-sweep", () => {
    // The sweep reads its position out of the frequency rather than keeping its
    // own counter, so dragging the slider and letting go must simply continue.
    const model = new ResonanceModel();
    model.isSweepingProperty.value = true;
    model.step(3);

    model.circuit.source.frequencyProperty.value = 1;
    model.step(1 / 60);
    expect(model.circuit.source.frequencyProperty.value).toBeGreaterThan(1);
    expect(model.circuit.source.frequencyProperty.value).toBeLessThan(1.2);
  });

  it("opens on element values that put a visible peak in the middle of the chart", () => {
    // The sim-wide defaults give Q = 0.1 — a hump so broad it does not read as a
    // resonance at all, on the one screen whose whole subject is the peak.
    const model = new ResonanceModel();
    expect(model.circuit.qualityFactorProperty.value).toBeGreaterThan(2);

    // f₀ near the geometric centre of the (logarithmic) frequency axis, so the
    // peak is drawn in the middle of the chart rather than against an edge.
    const centre = Math.sqrt(AC_FREQUENCY_RANGE_HZ.min * AC_FREQUENCY_RANGE_HZ.max);
    expect(model.circuit.resonantFrequencyProperty.value).toBeCloseTo(centre, 1);
  });

  it("reset() stops the sweep and restores this screen's own defaults", () => {
    const model = new ResonanceModel();
    const resistance = model.circuit.resistanceProperty.value;
    model.isSweepingProperty.value = true;
    model.step(2);
    model.circuit.resistanceProperty.value = 80;

    model.reset();

    expect(model.isSweepingProperty.value).toBe(false);
    expect(model.circuit.resistanceProperty.value).toBe(resistance);
    expect(model.circuit.source.frequencyProperty.value).toBe(1);
  });
});
