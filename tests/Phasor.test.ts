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

  it("divides by a complex operator (Ohm's law I = V / Z)", () => {
    // V = 4∠0, Z = 2∠0 → I = 2∠0.
    const i = new Phasor(4, 0).dividedBy(Complex.real(2));
    expect(i.amplitude).toBeCloseTo(2);
    expect(i.phase).toBeCloseTo(0);
  });

  it("scales amplitude and rotates phase", () => {
    const p = new Phasor(3, Math.PI / 6);
    expect(p.scaled(2).amplitude).toBeCloseTo(6);
    expect(p.rotated(Math.PI / 6).phase).toBeCloseTo(Math.PI / 3);
  });

  it("projects to a Vector2 (x = real, y = imaginary)", () => {
    const v = new Phasor(2, Math.PI / 2).toVector2();
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(2);
  });

  it("supports value equality", () => {
    expect(new Phasor(2, 1).equals(new Phasor(2, 1))).toBe(true);
    expect(new Phasor(2, 1).equalsEpsilon(new Phasor(2, 1 + 1e-12))).toBe(true);
    expect(new Phasor(2, 1).equals(new Phasor(2, 1.5))).toBe(false);
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
