/**
 * Phasor.ts
 *
 * An immutable AC phasor — the rotating-vector representation of a sinusoidal
 * quantity v(t) = A·cos(ωt + φ). A phasor is the complex amplitude A·e^(jφ),
 * so its magnitude is the peak amplitude A and its argument is the phase φ.
 *
 * The time-varying signal is recovered by rotating the phasor at the angular
 * frequency ω and taking the real part:
 *
 *   v(t) = Re{ A·e^(jφ) · e^(jωt) } = A·cos(ωt + φ)
 *
 * This class is a thin, AC-flavoured wrapper around dot's {@link Complex}. It is
 * a value object: every operation returns a new Phasor and never mutates `this`.
 * Model classes should expose Phasors through a `Property<Phasor>` (they compare
 * by value via {@link Phasor#equals}).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   import { Phasor } from "../model/Phasor.js";
 *
 *   const v = new Phasor( 5, 0 );               // 5·cos(ωt)
 *   const i = v.dividedBy( impedance );          // current phasor = V / Z
 *   const vAtT = v.instantaneousValue( omega, t );
 *   const tip = v.toVector2();                    // point on the complex plane
 */

import { Complex, Vector2 } from "scenerystack/dot";

export class Phasor {
  /** The complex amplitude A·e^(jφ). Immutable — do not mutate in place. */
  public readonly complex: Complex;

  /**
   * @param amplitude - Peak amplitude A (the phasor's magnitude). May be any real number.
   * @param phase - Phase angle φ in radians.
   */
  public constructor(amplitude: number, phase: number) {
    this.complex = Complex.createPolar(amplitude, phase);
  }

  /** Peak amplitude (magnitude of the complex amplitude). Always ≥ 0. */
  public get amplitude(): number {
    return this.complex.magnitude;
  }

  /** Phase angle φ in radians, in (−π, π]. Zero for the zero phasor. */
  public get phase(): number {
    return this.complex.phase();
  }

  /** In-phase (real) component, A·cos(φ). */
  public get real(): number {
    return this.complex.real;
  }

  /** Quadrature (imaginary) component, A·sin(φ). */
  public get imaginary(): number {
    return this.complex.imaginary;
  }

  /** RMS value of the corresponding sinusoid, A/√2. */
  public get rms(): number {
    return this.amplitude / Math.SQRT2;
  }

  /**
   * The instantaneous physical value at time t for angular frequency ω:
   *   Re{ complex · e^(jωt) } = A·cos(ωt + φ).
   */
  public instantaneousValue(angularFrequency: number, time: number): number {
    return this.amplitude * Math.cos(angularFrequency * time + this.phase);
  }

  /** Phasor sum (superposition of two sinusoids of the same frequency). */
  public plus(other: Phasor): Phasor {
    return Phasor.fromComplex(this.complex.plus(other.complex));
  }

  /** Phasor difference. */
  public minus(other: Phasor): Phasor {
    return Phasor.fromComplex(this.complex.minus(other.complex));
  }

  /**
   * Multiply by a complex operator (e.g. an impedance): scales amplitude by |z|
   * and rotates phase by arg(z). Ohm's law in the frequency domain: V = I·Z.
   */
  public times(z: Complex): Phasor {
    return Phasor.fromComplex(this.complex.times(z));
  }

  /**
   * Divide by a complex operator (e.g. an impedance): Ohm's law solved for
   * current, I = V / Z. Dividing by the zero impedance yields a non-finite
   * phasor, matching Complex's behaviour.
   */
  public dividedBy(z: Complex): Phasor {
    return Phasor.fromComplex(this.complex.dividedBy(z));
  }

  /** Scale the amplitude by a real factor, keeping the phase (sign flips at negative scale). */
  public scaled(scale: number): Phasor {
    return new Phasor(this.amplitude * scale, this.phase);
  }

  /** Rotate the phase by the given angle (radians), keeping the amplitude. */
  public rotated(angle: number): Phasor {
    return new Phasor(this.amplitude, this.phase + angle);
  }

  /** The tip of the phasor as a point on the complex plane (x = real, y = imaginary). */
  public toVector2(): Vector2 {
    return new Vector2(this.complex.real, this.complex.imaginary);
  }

  /** Exact component-wise equality (for Property value comparison). */
  public equals(other: Phasor): boolean {
    return this.complex.equals(other.complex);
  }

  /** Approximate equality, tolerating floating-point error up to epsilon per component. */
  public equalsEpsilon(other: Phasor, epsilon = 1e-10): boolean {
    return this.complex.equalsEpsilon(other.complex, epsilon);
  }

  public toString(): string {
    return `Phasor( amplitude=${this.amplitude}, phase=${this.phase} )`;
  }

  /** Builds a Phasor from an existing complex amplitude. */
  public static fromComplex(complex: Complex): Phasor {
    return new Phasor(complex.magnitude, complex.phase());
  }

  /** Builds a Phasor from rectangular components (real + imaginary·j). */
  public static fromRectangular(real: number, imaginary: number): Phasor {
    return Phasor.fromComplex(new Complex(real, imaginary));
  }

  /** The zero phasor (amplitude 0, phase 0). */
  public static readonly ZERO = new Phasor(0, 0);
}
