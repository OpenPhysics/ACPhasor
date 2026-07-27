/**
 * Impedance.test.ts
 *
 * Unit tests for the frequency-domain impedance helpers in
 * src/common/model/Impedance.ts.
 */

import { describe, expect, it } from "vitest";
import {
  capacitorImpedance,
  elementImpedance,
  inductorImpedance,
  resistorImpedance,
  resonantAngularFrequency,
  resonantFrequency,
  seriesRlcImpedance,
} from "../src/common/model/Impedance.js";

describe("Impedance", () => {
  it("resistor impedance is purely real", () => {
    const z = resistorImpedance(50);
    expect(z.real).toBeCloseTo(50);
    expect(z.imaginary).toBeCloseTo(0);
  });

  it("inductor impedance is jωL (positive reactance)", () => {
    const z = inductorImpedance(2, 3); // L=2, ω=3 → Z = 6j
    expect(z.real).toBeCloseTo(0);
    expect(z.imaginary).toBeCloseTo(6);
  });

  it("capacitor impedance is −j/(ωC) (negative reactance)", () => {
    const z = capacitorImpedance(0.5, 4); // C=0.5, ω=4 → Z = −j/2
    expect(z.real).toBeCloseTo(0);
    expect(z.imaginary).toBeCloseTo(-0.5);
  });

  it("capacitor impedance is infinite at DC (ω = 0)", () => {
    const z = capacitorImpedance(1, 0);
    expect(z.imaginary).toBe(Number.NEGATIVE_INFINITY);
  });

  it("elementImpedance dispatches by element type", () => {
    expect(elementImpedance("resistor", 10, 5).real).toBeCloseTo(10);
    expect(elementImpedance("inductor", 2, 3).imaginary).toBeCloseTo(6);
    expect(elementImpedance("capacitor", 0.5, 4).imaginary).toBeCloseTo(-0.5);
  });

  it("series RLC impedance sums R and net reactance", () => {
    // R=10, L=1, C=1, ω=1 → Z = 10 + j(1 − 1) = 10 (at resonance).
    const z = seriesRlcImpedance(10, 1, 1, 1);
    expect(z.real).toBeCloseTo(10);
    expect(z.imaginary).toBeCloseTo(0);
  });

  it("series RLC net reactance is inductive above resonance", () => {
    // ω=2: X_L = 2, X_C = 1/2 → net +1.5.
    const z = seriesRlcImpedance(10, 1, 1, 2);
    expect(z.imaginary).toBeCloseTo(1.5);
  });

  it("computes resonant angular frequency ω₀ = 1/√(LC)", () => {
    expect(resonantAngularFrequency(1, 1)).toBeCloseTo(1);
    expect(resonantAngularFrequency(4, 1)).toBeCloseTo(0.5);
  });

  it("computes resonant frequency f₀ = ω₀ / 2π", () => {
    expect(resonantFrequency(1, 1)).toBeCloseTo(1 / (2 * Math.PI));
  });

  it("series RLC is purely resistive at its resonant frequency", () => {
    const L = 2;
    const C = 0.5;
    const omega0 = resonantAngularFrequency(L, C);
    const z = seriesRlcImpedance(7, L, C, omega0);
    expect(z.imaginary).toBeCloseTo(0);
    expect(z.real).toBeCloseTo(7);
  });
});
