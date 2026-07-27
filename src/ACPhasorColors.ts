/**
 * ACPhasorColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import ACPhasorColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import ACPhasorColors from "../../ACPhasorColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: ACPhasorColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the ACPhasorColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import ACPhasorNamespace from "./ACPhasorNamespace.js";

const ACPhasorColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(ACPhasorNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(ACPhasorNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(ACPhasorNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(ACPhasorNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(ACPhasorNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(ACPhasorNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(ACPhasorNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(ACPhasorNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Circuit diagram ──────────────────────────────────────────────────────────

  /** Wire / schematic-symbol stroke in the circuit diagram. Light on dark, dark on light. */
  wireColorProperty: new ProfileColorProperty(ACPhasorNamespace, "wire", {
    default: "#e0e0e0",
    projector: "#333333",
  }),

  /** Moving charge carriers in the circuit diagram. Amber in both profiles for a "charge" read. */
  chargeColorProperty: new ProfileColorProperty(ACPhasorNamespace, "charge", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  // ── Circuit-component colors (R, L, C) ───────────────────────────────────────

  /** Resistor (R) accent — used in icons and future component nodes. */
  resistorColorProperty: new ProfileColorProperty(ACPhasorNamespace, "resistor", {
    default: "#ef5350",
    projector: "#c62828",
  }),

  /** Inductor (L) accent. */
  inductorColorProperty: new ProfileColorProperty(ACPhasorNamespace, "inductor", {
    default: "#66bb6a",
    projector: "#2e7d32",
  }),

  /** Capacitor (C) accent. */
  capacitorColorProperty: new ProfileColorProperty(ACPhasorNamespace, "capacitor", {
    default: "#42a5f5",
    projector: "#1565c0",
  }),
};

export default ACPhasorColors;
