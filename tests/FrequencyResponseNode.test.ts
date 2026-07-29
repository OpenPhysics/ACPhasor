/**
 * FrequencyResponseNode.test.ts
 *
 * The resonance curve has to hold still while the physics moves under it, for
 * the same reason the oscilloscope does: it sits in a column with a triangle and
 * a readout panel below, and any change to its footprint would shove them. The
 * peak height alone spans two decades across the resistance range, so this is
 * not a theoretical concern.
 */

import { Range } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { FrequencyResponseNode } from "../src/common/view/FrequencyResponseNode.js";

const FREQUENCY_RANGE = new Range(0.02, 5);

/** An auto-scaling current curve like the Resonance screen's upper chart. */
function createCurrentChart(): FrequencyResponseNode {
  return new FrequencyResponseNode({
    viewWidth: 600,
    viewHeight: 150,
    frequencyRange: FREQUENCY_RANGE,
    stroke: "orange",
    label: "|I|",
    units: "A",
    autoScale: true,
    minimumFullScale: 0.05,
    showFrequencyAxisLabels: false,
  });
}

/** A Lorentzian-ish resonance peak at `centre`, sharpened by `q`. */
function peakAt(centre: number, q: number, height: number): (frequency: number) => number {
  return (frequency: number) => {
    const detuning = q * (frequency / centre - centre / frequency);
    return height / Math.sqrt(1 + detuning * detuning);
  };
}

describe("FrequencyResponseNode", () => {
  it("does not change size when the curve rescales by decades", () => {
    const chart = createCurrentChart();
    chart.setCurve(peakAt(0.16, 5, 0.5));
    const before = chart.bounds.copy();

    // V/R across the whole resistance range, and then some.
    for (const height of [0.001, 0.05, 0.5, 5, 50]) {
      chart.setCurve(peakAt(0.16, 5, height));
      expect(chart.bounds.equals(before)).toBe(true);
    }
  });

  it("does not change size as the marker crosses the range", () => {
    const chart = createCurrentChart();
    chart.setCurve(peakAt(0.16, 5, 0.5));
    const before = chart.bounds.copy();

    for (const frequency of [FREQUENCY_RANGE.min, 0.1, 1, FREQUENCY_RANGE.max]) {
      chart.setMarkerFrequency(frequency);
      expect(chart.bounds.equals(before)).toBe(true);
    }
  });

  it("does not change size when the resonance marker and band move", () => {
    const chart = createCurrentChart();
    chart.setCurve(peakAt(0.16, 5, 0.5));
    const before = chart.bounds.copy();

    chart.setResonantFrequency(0.16);
    chart.setBand(0.12, 0.21);
    expect(chart.bounds.equals(before)).toBe(true);

    // A band wide enough to run off both ends is clipped, not grown into.
    chart.setBand(0.001, 500);
    expect(chart.bounds.equals(before)).toBe(true);
  });

  it("survives a curve with non-finite samples", () => {
    // A lossless circuit exactly at resonance divides by zero; the curve should
    // skip those samples rather than corrupt the axis or the footprint.
    const chart = createCurrentChart();
    const before = chart.bounds.copy();
    chart.setCurve((frequency) => (Math.abs(frequency - 1) < 0.01 ? Number.POSITIVE_INFINITY : 1 / frequency));
    chart.setMarkerFrequency(1);
    expect(chart.bounds.equals(before)).toBe(true);
  });

  it("ignores a hidden resonance marker and an empty band", () => {
    const chart = createCurrentChart();
    const before = chart.bounds.copy();
    chart.setResonantFrequency(0);
    chart.setResonantFrequency(Number.NaN);
    chart.setBand(0.5, 0.2);
    chart.setBand(-1, Number.POSITIVE_INFINITY);
    expect(chart.bounds.equals(before)).toBe(true);
  });

  it("holds a fixed vertical range when told to", () => {
    // The phase curve is bounded by ±90° for any series RLC circuit, so its axis
    // must not follow the data — a scale that never moves is what makes the zero
    // crossing readable.
    const chart = new FrequencyResponseNode({
      viewWidth: 600,
      viewHeight: 95,
      frequencyRange: FREQUENCY_RANGE,
      stroke: "white",
      label: "φ",
      units: "°",
      yRange: new Range(-90, 90),
    });
    const before = chart.bounds.copy();
    chart.setCurve((frequency) => (Math.atan(frequency - 1) * 180) / Math.PI);
    expect(chart.bounds.equals(before)).toBe(true);
  });
});
