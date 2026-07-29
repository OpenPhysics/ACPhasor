/**
 * Phasor.test.ts
 *
 * Unit tests for the immutable AC phasor value object in src/common/model/Phasor.ts.
 */

import { Complex } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { Phasor } from "../src/common/model/Phasor.js";

describe("Phasor", () => {
  it("exposes amplitude and phase from polar construction", () => {
    const p = new Phasor(5, Math.PI / 3);
    expect(p.amplitude).toBeCloseTo(5);
    expect(p.phase).toBeCloseTo(Math.PI / 3);
  });

  it("computes rectangular components", () => {
    const p = new Phasor(2, Math.PI / 2);
    expect(p.real).toBeCloseTo(0);
    expect(p.imaginary).toBeCloseTo(2);
  });

  it("reports the RMS value as amplitude / sqrt(2)", () => {
    const p = new Phasor(10, 0);
    expect(p.rms).toBeCloseTo(10 / Math.SQRT2);
  });

  it("evaluates the instantaneous value A·cos(ωt + φ)", () => {
    const p = new Phasor(3, 0); // 3·cos(ωt)
    const omega = 2 * Math.PI; // 1 Hz
    expect(p.instantaneousValue(omega, 0)).toBeCloseTo(3);
    expect(p.instantaneousValue(omega, 0.25)).toBeCloseTo(0); // quarter period
    expect(p.instantaneousValue(omega, 0.5)).toBeCloseTo(-3); // half period
  });

  it("respects a phase offset in the instantaneous value", () => {
    const p = new Phasor(1, Math.PI / 2); // cos(ωt + 90°) = −sin(ωt)
    const omega = 2 * Math.PI;
    expect(p.instantaneousValue(omega, 0.25)).toBeCloseTo(-1);
  });

  it("evaluates A·cos(Θ + φ) from an accumulated drive phase", () => {
    const p = new Phasor(2, Math.PI / 6);
    expect(p.instantaneousAtDrivePhase(Math.PI / 3)).toBeCloseTo(2 * Math.cos(Math.PI / 3 + Math.PI / 6));
  });

  it("adds phasors by superposition", () => {
    // Two equal-amplitude phasors 90° apart sum to amplitude √2 at 45°.
    const sum = new Phasor(1, 0).plus(new Phasor(1, Math.PI / 2));
    expect(sum.amplitude).toBeCloseTo(Math.SQRT2);
    expect(sum.phase).toBeCloseTo(Math.PI / 4);
  });

  it("multiplies by a complex operator (Ohm's law V = I·Z)", () => {
    // I = 2∠0, Z = j (pure inductor-like) → V = 2∠90°.
    const v = new Phasor(2, 0).times(Complex.I);
    expect(v.amplitude).toBeCloseTo(2);
    expect(v.phase).toBeCloseTo(Math.PI / 2);
  });

  it("multiplies by an impedance with both parts, scaling by |Z| and turning by arg Z", () => {
    // I = 3∠30°, Z = 3 + 4j (|Z| = 5, arg Z ≈ 53.13°) → V = 15∠83.13°.
    const current = new Phasor(3, Math.PI / 6);
    const impedance = new Complex(3, 4);
    const voltage = current.times(impedance);
    expect(voltage.amplitude).toBeCloseTo(15);
    expect(voltage.phase).toBeCloseTo(Math.PI / 6 + Math.atan2(4, 3));
  });

  it("divides by a complex operator (Ohm's law I = V / Z)", () => {
    // V = 4∠0, Z = 2∠0 → I = 2∠0.
    const i = new Phasor(4, 0).dividedBy(Complex.real(2));
    expect(i.amplitude).toBeCloseTo(2);
    expect(i.phase).toBeCloseTo(0);
  });

  it("divides by an impedance with both parts, and times() undoes it", () => {
    // A capacitive load: R − jX, so the current leads.
    const voltage = new Phasor(10, Math.PI / 4);
    const impedance = new Complex(6, -8);
    const current = voltage.dividedBy(impedance);
    expect(current.amplitude).toBeCloseTo(1);
    expect(current.phase).toBeCloseTo(Math.PI / 4 + Math.atan2(8, 6));

    // Round trip: V / Z · Z is V again, which is the loop every screen closes.
    const recovered = current.times(impedance);
    expect(recovered.equalsEpsilon(voltage, 1e-12)).toBe(true);
  });

  it("scales amplitude and rotates phase", () => {
    const p = new Phasor(3, Math.PI / 6);
    expect(p.scaled(2).amplitude).toBeCloseTo(6);
    expect(p.rotated(Math.PI / 6).phase).toBeCloseTo(Math.PI / 3);
  });

  it("normalizes a negative amplitude into the phase", () => {
    // The complex amplitude is stored rectangular and read back as |z| and arg z,
    // so the amplitude is never negative: the sign lands in the phase instead.
    const negative = new Phasor(-4, 0);
    expect(negative.amplitude).toBeCloseTo(4);
    expect(Math.abs(negative.phase)).toBeCloseTo(Math.PI);
    expect(negative.equalsEpsilon(new Phasor(4, Math.PI), 1e-12)).toBe(true);

    // Which is what makes a negative scale a reflection rather than nonsense.
    const flipped = new Phasor(3, Math.PI / 6).scaled(-2);
    expect(flipped.amplitude).toBeCloseTo(6);
    expect(flipped.instantaneousAtDrivePhase(0)).toBeCloseTo(-6 * Math.cos(Math.PI / 6));
  });

  it("projects to a Vector2 (x = real, y = imaginary)", () => {
    const v = new Phasor(2, Math.PI / 2).toVector2();
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(2);
  });

  /**
   * `equals` is load-bearing: every Property<Phasor> in the sim is declared with
   * `valueComparisonStrategy: "equalsFunction"`, so this is what decides whether
   * a frame's recomputation notifies anyone. Too loose and the views stop
   * updating; too tight and they update on nothing.
   */
  describe("value equality", () => {
    it("compares component-wise", () => {
      expect(new Phasor(2, 1).equals(new Phasor(2, 1))).toBe(true);
      expect(new Phasor(2, 1).equalsEpsilon(new Phasor(2, 1 + 1e-12))).toBe(true);
      expect(new Phasor(2, 1).equals(new Phasor(2, 1.5))).toBe(false);
    });

    it("separates a change in amplitude from a change in phase", () => {
      // Either one alone has to register, or a rotating phasor of constant
      // length would stop redrawing.
      expect(new Phasor(2, 1).equals(new Phasor(2.5, 1))).toBe(false);
      expect(new Phasor(2, 1).equals(new Phasor(2, 1.000001))).toBe(false);
    });

    it("sees through the polar form to the same complex value", () => {
      // Same phasor, written two ways: a full turn of phase, and the negative
      // amplitude the constructor normalizes.
      expect(new Phasor(2, 0).equalsEpsilon(new Phasor(2, 2 * Math.PI), 1e-12)).toBe(true);
      expect(new Phasor(-2, 0).equalsEpsilon(new Phasor(2, Math.PI), 1e-12)).toBe(true);
      // The zero phasor has no phase to disagree about.
      expect(new Phasor(0, 1).equalsEpsilon(Phasor.ZERO, 1e-12)).toBe(true);
    });
  });

  it("builds from rectangular components and a complex", () => {
    expect(Phasor.fromRectangular(0, 3).amplitude).toBeCloseTo(3);
    expect(Phasor.fromRectangular(0, 3).phase).toBeCloseTo(Math.PI / 2);
    expect(Phasor.fromComplex(new Complex(3, 4)).amplitude).toBeCloseTo(5);
  });

  it("has a zero constant", () => {
    expect(Phasor.ZERO.amplitude).toBe(0);
  });
});
