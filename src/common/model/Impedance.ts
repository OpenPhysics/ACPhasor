/**
 * Impedance.ts
 *
 * Frequency-domain impedances for the three ideal AC circuit elements, plus
 * helpers for combining them. Impedance Z is a complex number (in ohms) that
 * relates the voltage and current phasors of an element through Ohm's law,
 * V = I·Z.
 *
 *   Resistor:  Z_R = R              (real, frequency-independent)
 *   Inductor:  Z_L = jωL            (positive reactance, +90°)
 *   Capacitor: Z_C = 1 / (jωC)      (negative reactance, −90°)
 *             = −j / (ωC)
 *
 * where ω = 2πf is the angular frequency in rad/s. These return dot {@link Complex}
 * values so they compose directly with {@link Phasor#times} / {@link Phasor#dividedBy}.
 */

import { Complex } from "scenerystack/dot";

/** The three ideal passive AC circuit elements. */
export type CircuitElementType = "resistor" | "inductor" | "capacitor";

/** Impedance of an ideal resistor: Z = R (purely real). */
export function resistorImpedance(resistance: number): Complex {
  return Complex.real(resistance);
}

/**
 * Impedance of an ideal inductor: Z = jωL. The reactance X_L = ωL grows with
 * frequency; the impedance leads current by 90°.
 */
export function inductorImpedance(inductance: number, angularFrequency: number): Complex {
  return Complex.imaginary(angularFrequency * inductance);
}

/**
 * Impedance of an ideal capacitor: Z = 1/(jωC) = −j/(ωC). The reactance
 * X_C = 1/(ωC) falls with frequency; the impedance lags current by 90°. At
 * ω = 0 (DC) the impedance is infinite, matching the open-circuit behaviour of
 * a capacitor.
 */
export function capacitorImpedance(capacitance: number, angularFrequency: number): Complex {
  const denominator = angularFrequency * capacitance;
  return Complex.imaginary(denominator === 0 ? Number.NEGATIVE_INFINITY : -1 / denominator);
}

/**
 * Impedance of a single element selected by {@link CircuitElementType}. `value`
 * is R (Ω), L (H), or C (F) depending on the element type.
 */
export function elementImpedance(type: CircuitElementType, value: number, angularFrequency: number): Complex {
  switch (type) {
    case "resistor":
      return resistorImpedance(value);
    case "inductor":
      return inductorImpedance(value, angularFrequency);
    case "capacitor":
      return capacitorImpedance(value, angularFrequency);
  }
}

/** Total impedance of elements in series: Z = Z₁ + Z₂ + … (complex sum). */
export function seriesImpedance(...impedances: Complex[]): Complex {
  return impedances.reduce((sum, z) => sum.plus(z), Complex.ZERO);
}

/**
 * Series RLC impedance Z = R + j(ωL − 1/(ωC)). The imaginary part is the net
 * reactance; it vanishes at the resonant frequency ω₀ = 1/√(LC), where the
 * circuit is purely resistive.
 */
export function seriesRlcImpedance(
  resistance: number,
  inductance: number,
  capacitance: number,
  angularFrequency: number,
): Complex {
  return seriesImpedance(
    resistorImpedance(resistance),
    inductorImpedance(inductance, angularFrequency),
    capacitorImpedance(capacitance, angularFrequency),
  );
}

/**
 * Resonant angular frequency ω₀ = 1/√(LC) (rad/s) of an LC pair — the frequency
 * at which inductive and capacitive reactances cancel.
 */
export function resonantAngularFrequency(inductance: number, capacitance: number): number {
  return 1 / Math.sqrt(inductance * capacitance);
}

/** Resonant frequency f₀ = ω₀ / (2π) in hertz. */
export function resonantFrequency(inductance: number, capacitance: number): number {
  return resonantAngularFrequency(inductance, capacitance) / (2 * Math.PI);
}
