/**
 * ACSourceModel.test.ts
 *
 * Unit tests for the composable AC voltage-source model in
 * src/common/model/ACSourceModel.ts.
 */

import { describe, expect, it } from "vitest";
import { ACSourceModel } from "../src/common/model/ACSourceModel.js";

describe("ACSourceModel", () => {
  it("derives angular frequency ω = 2πf", () => {
    const source = new ACSourceModel({ frequency: 2 });
    expect(source.angularFrequencyProperty.value).toBeCloseTo(4 * Math.PI);
    source.dispose();
  });

  it("updates ω when the frequency changes", () => {
    const source = new ACSourceModel({ frequency: 1 });
    source.frequencyProperty.value = 3;
    expect(source.angularFrequencyProperty.value).toBeCloseTo(6 * Math.PI);
    source.dispose();
  });

  it("exposes a voltage phasor at the configured amplitude and phase", () => {
    const source = new ACSourceModel({ amplitude: 7, phase: 0 });
    expect(source.voltagePhasorProperty.value.amplitude).toBeCloseTo(7);
    expect(source.voltagePhasorProperty.value.phase).toBeCloseTo(0);
    source.dispose();
  });

  it("recomputes the voltage phasor when amplitude changes", () => {
    const source = new ACSourceModel({ amplitude: 5 });
    source.amplitudeProperty.value = 8;
    expect(source.voltagePhasorProperty.value.amplitude).toBeCloseTo(8);
    source.dispose();
  });

  it("evaluates instantaneous voltage v(t) = V₀·cos(ωt)", () => {
    const source = new ACSourceModel({ amplitude: 4, frequency: 1, phase: 0 });
    expect(source.voltageAt(0)).toBeCloseTo(4);
    expect(source.voltageAt(0.5)).toBeCloseTo(-4); // half period at 1 Hz
    source.dispose();
  });

  it("accumulates drive phase as Θ += ω·dt", () => {
    const source = new ACSourceModel({ frequency: 1 });
    source.advanceDrivePhase(0.25);
    expect(source.drivePhaseProperty.value).toBeCloseTo(Math.PI / 2);
    source.dispose();
  });

  it("keeps instantaneous voltage continuous across a frequency change", () => {
    const source = new ACSourceModel({ amplitude: 5, frequency: 1, phase: 0 });
    source.advanceDrivePhase(0.125); // Θ = π/4 at 1 Hz
    const before = source.instantaneousVoltage();

    source.frequencyProperty.value = 4;
    // Without re-accumulating, Θ is unchanged, so v is unchanged.
    expect(source.instantaneousVoltage()).toBeCloseTo(before);
    expect(source.instantaneousVoltage()).toBeCloseTo(5 * Math.cos(Math.PI / 4));
    source.dispose();
  });

  it("reset() restores default amplitude, frequency, and drive phase", () => {
    const source = new ACSourceModel({ amplitude: 5, frequency: 1 });
    source.amplitudeProperty.value = 9;
    source.frequencyProperty.value = 4;
    source.advanceDrivePhase(1);
    source.reset();
    expect(source.amplitudeProperty.value).toBeCloseTo(5);
    expect(source.frequencyProperty.value).toBeCloseTo(1);
    expect(source.drivePhaseProperty.value).toBe(0);
    source.dispose();
  });
});
