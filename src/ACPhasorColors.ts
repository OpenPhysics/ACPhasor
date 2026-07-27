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

  // ── Pictorial circuit elements ───────────────────────────────────────────────
  // Material colors for the "realistic" component bodies (resistor body and bands,
  // inductor coil and core, capacitor plates). Real components look the same under
  // either profile, so these barely change between default and projector mode —
  // they are only nudged for contrast against the background.

  /** Ceramic body of the pictorial resistor. */
  resistorBodyColorProperty: new ProfileColorProperty(ACPhasorNamespace, "resistorBody", {
    default: "#d9c9a3",
    projector: "#cdbb8f",
  }),

  /** Shadow along the bottom of a cylindrical component body. */
  componentShadeColorProperty: new ProfileColorProperty(ACPhasorNamespace, "componentShade", {
    default: "#8d7f63",
    projector: "#7c6f56",
  }),

  /** Specular highlight along the top of a cylindrical component body. */
  componentHighlightColorProperty: new ProfileColorProperty(ACPhasorNamespace, "componentHighlight", {
    default: "#fdf3d8",
    projector: "#fdf3d8",
  }),

  /** Copper winding of the pictorial inductor. */
  coilColorProperty: new ProfileColorProperty(ACPhasorNamespace, "coil", {
    default: "#c87137",
    projector: "#a85a24",
  }),

  /** Lit edge of the copper winding. */
  coilHighlightColorProperty: new ProfileColorProperty(ACPhasorNamespace, "coilHighlight", {
    default: "#f0a868",
    projector: "#d98c46",
  }),

  /** Ferrite core the inductor is wound around. */
  coreColorProperty: new ProfileColorProperty(ACPhasorNamespace, "core", {
    default: "#78909c",
    projector: "#607d8b",
  }),

  // ── Capacitor plates (three faces of the same metal, lit from above) ─────────

  /** Top face of a capacitor plate — the surface the charges sit on. */
  plateTopColorProperty: new ProfileColorProperty(ACPhasorNamespace, "plateTop", {
    default: "#cfd8dc",
    projector: "#b0bec5",
  }),

  /** Front (edge) face of a capacitor plate. */
  plateFrontColorProperty: new ProfileColorProperty(ACPhasorNamespace, "plateFront", {
    default: "#90a4ae",
    projector: "#78909c",
  }),

  /** Right (edge) face of a capacitor plate; darkest of the three. */
  plateSideColorProperty: new ProfileColorProperty(ACPhasorNamespace, "plateSide", {
    default: "#607d8b",
    projector: "#546e7a",
  }),

  /** Outline shared by every plate face. */
  plateEdgeColorProperty: new ProfileColorProperty(ACPhasorNamespace, "plateEdge", {
    default: "#455a64",
    projector: "#37474f",
  }),

  /** Electric-field arrows drawn in the capacitor gap. */
  electricFieldColorProperty: new ProfileColorProperty(ACPhasorNamespace, "electricField", {
    default: "#b39ddb",
    projector: "#5e35b1",
  }),

  /** Positive charge symbols on a capacitor plate. */
  positiveChargeColorProperty: new ProfileColorProperty(ACPhasorNamespace, "positiveCharge", {
    default: "#ff5252",
    projector: "#d32f2f",
  }),

  /** Negative charge symbols on a capacitor plate. */
  negativeChargeColorProperty: new ProfileColorProperty(ACPhasorNamespace, "negativeCharge", {
    default: "#448aff",
    projector: "#1565c0",
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
