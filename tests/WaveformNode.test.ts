/**
 * WaveformNode.test.ts
 *
 * Covers the two invariants a scope has to hold while the physics moves under
 * it, both of which are silent failures on screen: the footprint must not change
 * when a trace rescales or the window is retuned (a sibling laid out below would
 * drift), and the two vertical axes must scale independently (volts and amps
 * share no number line).
 */

import { describe, expect, it } from "vitest";
import { WaveformNode } from "../src/common/view/WaveformNode.js";

/** A dual-axis scope like the ones on the first two screens. */
function createDualTraceScope(): WaveformNode {
  return new WaveformNode({
    viewWidth: 600,
    viewHeight: 120,
    timeWindow: 3,
    showCursor: true,
    traces: [
      { stroke: "white", label: "v(t)", units: "V", maxAmplitude: 10 },
      { stroke: "orange", label: "i(t)", units: "A", axis: "right", autoScale: true },
    ],
  });
}

describe("WaveformNode", () => {
  it("keeps a single-trace scope's setWaveform working", () => {
    const scope = new WaveformNode({ maxAmplitude: 10, units: "V", label: "v(t)" });
    const before = scope.bounds.copy();
    scope.setWaveform(7, 2 * Math.PI, 0);
    expect(scope.bounds.equals(before)).toBe(true);
  });

  it("does not change size when an auto-scaled trace rescales", () => {
    const scope = createDualTraceScope();
    const before = scope.bounds.copy();

    // Four decades of current, which is roughly what |Z| spans in this sim.
    for (const amplitude of [0.001, 0.05, 1, 12]) {
      scope.setTrace(1, amplitude, 2 * Math.PI, 0);
      expect(scope.bounds.equals(before)).toBe(true);
    }
  });

  it("survives a decade jump on an auto-scaled axis without overflowing ticks", () => {
    // Capacitor current on the Intro screen spans ~0.1 A to thousands of amps
    // when fuzz slams frequency and C together. Bamboo rebuilds ticks on every
    // range change, so the leftover tiny spacing must not be asked to fill the
    // new large range.
    const scope = createDualTraceScope();
    scope.setTrace(1, 0.001, 2 * Math.PI, 0);
    const before = scope.bounds.copy();
    scope.setTrace(1, 5000, 2 * Math.PI, 0);
    expect(scope.bounds.equals(before)).toBe(true);
    scope.setTrace(1, 0.001, 2 * Math.PI, 0);
    expect(scope.bounds.equals(before)).toBe(true);
  });

  it("does not change size when the time window is retuned", () => {
    const scope = createDualTraceScope();
    const before = scope.bounds.copy();

    // The full frequency range: 3 cycles at 5 Hz through 3 cycles at 0.02 Hz.
    for (const seconds of [0.6, 3, 150]) {
      scope.setTimeWindow(seconds);
      expect(scope.bounds.equals(before)).toBe(true);
    }
  });

  it("scales the two axes independently", () => {
    const scope = createDualTraceScope();
    const before = scope.bounds.copy();

    // A fixed-scale voltage trace and an auto-scaled current trace: moving the
    // current by three decades must not disturb the voltage axis, which is what
    // lets the trace height keep reading as a voltage.
    scope.setTrace(0, 5, 2 * Math.PI, 0);
    scope.setTrace(1, 0.002, 2 * Math.PI, -Math.PI / 2);
    expect(scope.bounds.equals(before)).toBe(true);

    scope.setTrace(1, 3, 2 * Math.PI, -Math.PI / 2);
    expect(scope.bounds.equals(before)).toBe(true);
  });

  it("ignores a nonsensical time window rather than blowing up the axis", () => {
    const scope = createDualTraceScope();
    const before = scope.bounds.copy();
    scope.setTimeWindow(0);
    scope.setTimeWindow(Number.NaN);
    scope.setTimeWindow(Number.POSITIVE_INFINITY);
    expect(scope.bounds.equals(before)).toBe(true);
  });

  describe("an offset, shaded trace (instantaneous power)", () => {
    /** The p(t) scope on the Power screen: 2ω sinusoid on a DC offset. */
    function createPowerScope(): WaveformNode {
      return new WaveformNode({
        viewWidth: 470,
        viewHeight: 88,
        timeWindow: 3,
        showCursor: true,
        traces: [
          {
            stroke: "violet",
            label: "p(t)",
            units: "W",
            autoScale: true,
            fill: "teal",
            negativeFill: "indigo",
            showAverageLine: true,
            captionValue: "average",
          },
        ],
      });
    }

    it("does not change size as the offset and amplitude move", () => {
      const scope = createPowerScope();
      const before = scope.bounds.copy();

      // Resonance (all real, never negative) through purely reactive (centred on
      // zero), across the decades that p = v·i spans as the load changes.
      for (const [amplitude, offset] of [
        [0.5, 0.5],
        [0.5, 0],
        [50, 12],
        [0.002, 0.001],
      ]) {
        scope.setTrace(0, amplitude as number, 4 * Math.PI, 0, offset as number);
        expect(scope.bounds.equals(before)).toBe(true);
      }
    });

    it("does not change size when the shading has no zero crossing to split at", () => {
      const scope = createPowerScope();
      const before = scope.bounds.copy();

      // Entirely above zero (unity power factor), then entirely below.
      scope.setTrace(0, 1, 4 * Math.PI, 0, 5);
      expect(scope.bounds.equals(before)).toBe(true);
      scope.setTrace(0, 1, 4 * Math.PI, 0, -5);
      expect(scope.bounds.equals(before)).toBe(true);
    });

    it("does not change size when the offset trace's window is retuned", () => {
      const scope = createPowerScope();
      scope.setTrace(0, 2, 4 * Math.PI, 0, 1);
      const before = scope.bounds.copy();

      for (const seconds of [0.6, 3, 150]) {
        scope.setTimeWindow(seconds);
        expect(scope.bounds.equals(before)).toBe(true);
      }
    });

    it("leaves an ordinary trace unshifted when no offset is passed", () => {
      // setTrace's offset argument is optional, and the earlier screens rely on
      // it defaulting to zero.
      const scope = createDualTraceScope();
      const before = scope.bounds.copy();
      scope.setTrace(0, 5, 2 * Math.PI, 0);
      expect(scope.bounds.equals(before)).toBe(true);
    });
  });

  it("moves the playhead without resizing, and tolerates times outside the window", () => {
    const scope = createDualTraceScope();
    scope.setTrace(0, 5, 2 * Math.PI, 0);
    const before = scope.bounds.copy();

    for (const time of [0, 1.5, 3, 47.25]) {
      scope.setCursorTime(time);
      expect(scope.bounds.equals(before)).toBe(true);
    }
  });

  it("accepts a drive-phase reference on setCursorTime without resizing", () => {
    const scope = createDualTraceScope();
    scope.setTrace(0, 5, 2 * Math.PI, Math.PI / 6);
    const before = scope.bounds.copy();

    scope.setCursorTime(1.5, Math.PI / 3);
    scope.setTrace(0, 5, 8 * Math.PI, Math.PI / 6);
    scope.setCursorTime(1.5, Math.PI / 3);
    expect(scope.bounds.equals(before)).toBe(true);
  });
});
