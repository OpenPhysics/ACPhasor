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

  it("moves the playhead without resizing, and tolerates times outside the window", () => {
    const scope = createDualTraceScope();
    scope.setTrace(0, 5, 2 * Math.PI, 0);
    const before = scope.bounds.copy();

    for (const time of [0, 1.5, 3, 47.25]) {
      scope.setCursorTime(time);
      expect(scope.bounds.equals(before)).toBe(true);
    }
  });
});
