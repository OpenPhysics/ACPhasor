/**
 * ACPhasorConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in ACPhasorColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Range } from "scenerystack/dot";
import ACPhasorNamespace from "./ACPhasorNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

// ── AC source defaults (SI units) ─────────────────────────────────────────────

/** Default peak voltage of the AC source (V). */
export const AC_AMPLITUDE_DEFAULT_V = 5;

/** Selectable peak-voltage range for the AC source (V). */
export const AC_AMPLITUDE_RANGE_V = new Range(0, 10);

/** Default driving frequency of the AC source (Hz). */
export const AC_FREQUENCY_DEFAULT_HZ = 1;

/**
 * Selectable driving-frequency range for the AC source (Hz).
 *
 * The floor is set by resonance, not by the source: across the L and C ranges
 * below, f₀ = 1/(2π√(LC)) spans 0.0159 Hz (both at maximum) to 1.59 Hz (both at
 * minimum). A floor of 0.02 Hz therefore brings resonance within reach almost
 * everywhere in the L–C plane — the lone exception is the exact L = C = 10
 * corner, which lands a hair below it.
 *
 * The span is 2.4 decades, so the frequency control is drawn with a logarithmic
 * slider (see SimNumberControl's `logarithmic` option); a linear one would spend
 * most of its travel above 1 Hz, where nothing interesting happens.
 */
export const AC_FREQUENCY_RANGE_HZ = new Range(0.02, 5);

// ── Circuit-element defaults (SI units) ───────────────────────────────────────

/** Default resistance (Ω). */
export const RESISTANCE_DEFAULT_OHMS = 10;

/** Selectable resistance range (Ω). */
export const RESISTANCE_RANGE_OHMS = new Range(1, 100);

/** Default inductance (H). */
export const INDUCTANCE_DEFAULT_H = 1;

/** Selectable inductance range (H). */
export const INDUCTANCE_RANGE_H = new Range(0.1, 10);

/** Default capacitance (F). */
export const CAPACITANCE_DEFAULT_F = 1;

/** Selectable capacitance range (F). */
export const CAPACITANCE_RANGE_F = new Range(0.1, 10);

// ── Pictorial circuit diagram ─────────────────────────────────────────────────

/**
 * Plate charge q = C·v (coulombs) at which a pictorial capacitor shows the
 * maximum number of charge symbols on its plates. Chosen so the defaults
 * (C = 1 F driven at 5 V peak) fill the plates about halfway at the peak of
 * each cycle, leaving visible headroom in both directions.
 */
export const CAPACITOR_SATURATION_CHARGE_C = 10;

/**
 * Induced EMF |v_L| = |L·di/dt| (volts) at which the pictorial inductor shows its
 * polarity marks at full strength. Set to the top of the source-voltage range, so
 * an inductor that takes the whole source voltage swings its marks to full scale.
 */
export const INDUCTOR_SATURATION_EMF_V = 10;

/**
 * Current (amps) at which the live, current-driven decorations — the inductor's
 * flux arrows and the resistor's heat glow — reach full strength. The current in
 * these circuits spans decades as |Z| changes, so the decorations are drawn
 * relative to their own peak and then dimmed by this reference: a large current
 * looks strong, a tiny one stays visible, and both still swing through zero
 * twice a cycle.
 */
export const CURRENT_DISPLAY_REFERENCE_A = 0.5;

/** Loop size of the circuit diagram on the Intro screen (px). */
export const INTRO_CIRCUIT_SIZE = { width: 360, height: 175 };

/** Loop size of the circuit diagram on the Series RLC screen (px). */
export const SERIES_CIRCUIT_SIZE = { width: 520, height: 95 };

// ── Inductor flux loops ───────────────────────────────────────────────────────

/** Closed field loops drawn around the coil at full current. */
export const INDUCTOR_FLUX_LOOP_COUNT = 4;

/** Radius of the innermost flux loop, measured from the coil axis (px). */
export const INDUCTOR_FLUX_INNER_RADIUS = 17;

/**
 * Radial spacing between consecutive flux loops (px). The loops drift outward by
 * one spacing over a quarter cycle, so this also sets how far the field visibly
 * travels as the current climbs from zero to its peak.
 */
export const INDUCTOR_FLUX_LOOP_SPACING = 9;

// ── Phasor diagrams and oscilloscopes ─────────────────────────────────────────

/** Half-extent of the Intro screen's phasor clock, in view pixels. */
export const INTRO_DIAL_VIEW_RADIUS = 115;

/** Half-extent of the Series RLC voltage phasor diagram, in view pixels. */
export const SERIES_VOLTAGE_DIAL_VIEW_RADIUS = 95;

/** Half-extent of the Series RLC impedance triangle, in view pixels. */
export const SERIES_IMPEDANCE_DIAL_VIEW_RADIUS = 75;

/** Plot size of the oscilloscope on the Intro screen (px). */
export const INTRO_SCOPE_SIZE = { width: 600, height: 150 };

/** Plot size of the oscilloscope on the Series RLC screen (px). */
export const SERIES_SCOPE_SIZE = { width: 600, height: 95 };

/**
 * Cycles of the source held on screen by an oscilloscope. The time window is
 * retuned to this many periods whenever the frequency changes, so a trace reads
 * the same at the bottom of the frequency range as at the top — a fixed window
 * would show a flat line at 0.02 Hz and a picket fence at 5 Hz.
 */
export const SCOPE_PERIODS_SHOWN = 3;

// ── Resonance ─────────────────────────────────────────────────────────────────

/**
 * Phase angle |arg Z| (radians) below which the series circuit is reported as
 * being at resonance. Shared by the screen-summary description and the on-screen
 * badge so the two can never disagree.
 *
 * The test is on the phase rather than on the reactance because the phase is
 * what the learner is looking at — it is the angle of both triangles, and it is
 * scale-free, whereas a band in ohms means something quite different at R = 1
 * than at R = 100. It also has to be wide enough to actually land on: reactance
 * passes through zero steeply, and a band of a few hundredths of an ohm is
 * narrower than a single step of the frequency slider.
 */
export const RESONANCE_PHASE_TOLERANCE_RADIANS = (5 * Math.PI) / 180;

/** Plot size of the current-vs-frequency resonance curve (px). */
export const RESONANCE_CURVE_SIZE = { width: 540, height: 148 };

/** Plot size of the phase-vs-frequency curve below it (px). */
export const RESONANCE_PHASE_CURVE_SIZE = { width: 540, height: 92 };

/** Half-extent of the Resonance screen's impedance triangle, in view pixels. */
export const RESONANCE_IMPEDANCE_DIAL_VIEW_RADIUS = 76;

/**
 * Element values the Resonance screen opens with, chosen so the screen shows its
 * phenomenon before anything is touched. The sim-wide defaults (R = 10, L = C = 1)
 * give Q = 0.1 — a hump so broad it barely reads as a peak at all.
 *
 * These give f₀ = 1/(2π√(LC)) ≈ 0.32 Hz, which is the geometric centre of the
 * 0.02–5 Hz range and therefore the middle of the chart's logarithmic axis, and
 * Q = √(L/C)/R = 2.5, sharp enough to be unmistakably a resonance. All three sit
 * inside their ranges with room to move in both directions, so the first thing a
 * learner does to any of them changes the peak visibly.
 */
export const RESONANCE_SCREEN_RESISTANCE_OHMS = 2;
export const RESONANCE_SCREEN_INDUCTANCE_H = 2.5;
export const RESONANCE_SCREEN_CAPACITANCE_F = 0.1;

/**
 * Seconds an automatic frequency sweep takes to cross the whole source range.
 * The travel is logarithmic, so this is also the time per 2.4 decades: slow
 * enough that a narrow resonance is not skipped between frames, brisk enough
 * that the peak comes round again without a wait.
 */
export const FREQUENCY_SWEEP_DURATION_S = 14;

// ── Power ─────────────────────────────────────────────────────────────────────

/** Loop size of the circuit diagram on the Power screen (px). */
export const POWER_CIRCUIT_SIZE = { width: 400, height: 88 };

/**
 * Plot size of each oscilloscope on the Power screen (px). Narrower than the
 * other screens' scopes: this screen puts a third column — the power triangle
 * and its readouts — between the scopes and the controls.
 */
export const POWER_SCOPE_SIZE = { width: 335, height: 108 };

/** Half-extent of the Power screen's power triangle, in view pixels. */
export const POWER_TRIANGLE_DIAL_VIEW_RADIUS = 78;

ACPhasorNamespace.register("ACPhasorConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  AC_AMPLITUDE_DEFAULT_V,
  AC_AMPLITUDE_RANGE_V,
  AC_FREQUENCY_DEFAULT_HZ,
  AC_FREQUENCY_RANGE_HZ,
  RESISTANCE_DEFAULT_OHMS,
  RESISTANCE_RANGE_OHMS,
  INDUCTANCE_DEFAULT_H,
  INDUCTANCE_RANGE_H,
  CAPACITANCE_DEFAULT_F,
  CAPACITANCE_RANGE_F,
  CAPACITOR_SATURATION_CHARGE_C,
  INDUCTOR_SATURATION_EMF_V,
  CURRENT_DISPLAY_REFERENCE_A,
  INTRO_CIRCUIT_SIZE,
  SERIES_CIRCUIT_SIZE,
  INDUCTOR_FLUX_LOOP_COUNT,
  INDUCTOR_FLUX_INNER_RADIUS,
  INDUCTOR_FLUX_LOOP_SPACING,
  INTRO_DIAL_VIEW_RADIUS,
  SERIES_VOLTAGE_DIAL_VIEW_RADIUS,
  SERIES_IMPEDANCE_DIAL_VIEW_RADIUS,
  INTRO_SCOPE_SIZE,
  SERIES_SCOPE_SIZE,
  SCOPE_PERIODS_SHOWN,
  RESONANCE_PHASE_TOLERANCE_RADIANS,
  RESONANCE_CURVE_SIZE,
  RESONANCE_PHASE_CURVE_SIZE,
  RESONANCE_IMPEDANCE_DIAL_VIEW_RADIUS,
  RESONANCE_SCREEN_RESISTANCE_OHMS,
  RESONANCE_SCREEN_INDUCTANCE_H,
  RESONANCE_SCREEN_CAPACITANCE_F,
  FREQUENCY_SWEEP_DURATION_S,
  POWER_CIRCUIT_SIZE,
  POWER_SCOPE_SIZE,
  POWER_TRIANGLE_DIAL_VIEW_RADIUS,
});
