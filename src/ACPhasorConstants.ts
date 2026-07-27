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
 *
 * Remove the example constants below and replace them with the sim's own.
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

/** Selectable driving-frequency range for the AC source (Hz). */
export const AC_FREQUENCY_RANGE_HZ = new Range(0.1, 5);

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

/** Loop size of the circuit diagram on the Intro screen (px). */
export const INTRO_CIRCUIT_SIZE = { width: 360, height: 175 };

/** Loop size of the circuit diagram on the Series RLC screen (px). */
export const SERIES_CIRCUIT_SIZE = { width: 520, height: 150 };

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
  INTRO_CIRCUIT_SIZE,
  SERIES_CIRCUIT_SIZE,
});
