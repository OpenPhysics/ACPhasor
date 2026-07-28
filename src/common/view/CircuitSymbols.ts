/**
 * CircuitSymbols.ts
 *
 * Schematic symbols for the three circuit elements — the zigzag resistor, the
 * coiled inductor, and the parallel-plate capacitor — built from one factory so
 * the element picker, the screen icons, and any legend all draw exactly the same
 * glyph. Symbols are the language of circuit diagrams; a student who learns the
 * glyph on a button reads it again on the schematic, on a worksheet, and on an
 * exam, which a word label never affords.
 *
 * Every symbol is centered on its local origin and drawn along the y = 0 wire
 * line, so it drops straight into a button, a wire run, or an icon canvas.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const glyph = createElementSymbol( "inductor", { width: 46 } );      // picker
 *   const motif = createResistorSymbol( { width: 220, lineWidth: 8,      // icon
 *     showLeads: false } );
 */

import { Shape } from "scenerystack/kite";
import { type Node, Path, type TColor } from "scenerystack/scenery";
import ACPhasorColors from "../../ACPhasorColors.js";
import type { CircuitElementType } from "../model/Impedance.js";

export type CircuitSymbolOptions = {
  /** Overall width of the symbol in pixels, leads included. */
  width?: number;
  /**
   * Vertical extent of the glyph in pixels: peak-to-peak for the resistor's
   * zigzag, winding radius for the inductor, plate length for the capacitor.
   * Defaults to a proportion of the width that keeps the three in step.
   */
  height?: number;
  /** Stroke width of the glyph in pixels. */
  lineWidth?: number;
  /** Stroke color; defaults to the element's accent color. */
  stroke?: TColor;
  /** Whether to draw the short wire stubs on either side of the glyph. */
  showLeads?: boolean;
};

const DEFAULT_WIDTH = 46;
const DEFAULT_LINE_WIDTH = 3;

/** Fraction of the total width taken by the lead on each side. */
const LEAD_FRACTION = 0.16;

/** Default glyph heights, as fractions of the total width. */
const ZIGZAG_HEIGHT_FRACTION = 0.34;
const COIL_RADIUS_FRACTION = 0.15;
const PLATE_HEIGHT_FRACTION = 0.52;

/** Number of windings in the inductor glyph. */
const COIL_LOOPS = 4;

/** Half the plate separation, as a fraction of the width. */
const PLATE_GAP_FRACTION = 0.09;

type ResolvedOptions = Required<Omit<CircuitSymbolOptions, "stroke">> & { stroke: TColor };

function resolve(
  defaultStroke: TColor,
  defaultHeightFraction: number,
  providedOptions?: CircuitSymbolOptions,
): ResolvedOptions {
  const width = providedOptions?.width ?? DEFAULT_WIDTH;
  return {
    width: width,
    height: width * defaultHeightFraction,
    lineWidth: DEFAULT_LINE_WIDTH,
    showLeads: true,
    stroke: defaultStroke,
    ...providedOptions,
  };
}

/** The x where the glyph itself starts; leads (when shown) run in from ±width/2. */
function bodyHalfWidth(options: ResolvedOptions): number {
  return options.width * (0.5 - (options.showLeads ? LEAD_FRACTION : 0));
}

function symbolPath(shape: Shape, options: ResolvedOptions): Node {
  return new Path(shape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    lineCap: "round",
    lineJoin: "round",
  });
}

/** Add the lead stubs from ±width/2 in to the glyph, when they are wanted. */
function addLeads(shape: Shape, options: ResolvedOptions): void {
  if (!options.showLeads) {
    return;
  }
  const half = options.width / 2;
  const body = bodyHalfWidth(options);
  shape.moveTo(-half, 0).lineTo(-body, 0);
  shape.moveTo(body, 0).lineTo(half, 0);
}

/** Resistor: the ANSI zigzag, the glyph PhET's circuit sims use. */
export function createResistorSymbol(providedOptions?: CircuitSymbolOptions): Node {
  const options = resolve(ACPhasorColors.resistorColorProperty, ZIGZAG_HEIGHT_FRACTION, providedOptions);
  const body = bodyHalfWidth(options);
  const amplitude = options.height / 2;

  // Six alternating peaks between the two terminals, opening and closing on the
  // wire line so the zigzag reads as an in-line part.
  const shape = new Shape().moveTo(-body, 0);
  const segments = 6;
  const step = (2 * body) / segments;
  for (let i = 0; i < segments; i++) {
    shape.lineTo(-body + (i + 0.5) * step, i % 2 === 0 ? -amplitude : amplitude);
  }
  shape.lineTo(body, 0);
  addLeads(shape, options);

  return symbolPath(shape, options);
}

/** Inductor: four windings drawn as bumps above the wire line. */
export function createInductorSymbol(providedOptions?: CircuitSymbolOptions): Node {
  const options = resolve(ACPhasorColors.inductorColorProperty, COIL_RADIUS_FRACTION, providedOptions);
  const body = bodyHalfWidth(options);
  const step = (2 * body) / COIL_LOOPS;
  // Windings taller than half their spacing overlap slightly, which is what
  // makes them read as a coil rather than as a row of humps.
  const radius = options.height;

  const shape = new Shape().moveTo(-body, 0);
  for (let i = 0; i < COIL_LOOPS; i++) {
    shape.arc(-body + (i + 0.5) * step, 0, radius, Math.PI, 0, false);
  }
  addLeads(shape, options);

  return symbolPath(shape, options);
}

/** Capacitor: two parallel plates with a dielectric gap the current cannot cross. */
export function createCapacitorSymbol(providedOptions?: CircuitSymbolOptions): Node {
  const options = resolve(ACPhasorColors.capacitorColorProperty, PLATE_HEIGHT_FRACTION, providedOptions);
  const gap = options.width * PLATE_GAP_FRACTION;
  const plateHalfHeight = options.height / 2;
  const half = options.width / 2;

  const shape = new Shape()
    .moveTo(-gap, -plateHalfHeight)
    .lineTo(-gap, plateHalfHeight)
    .moveTo(gap, -plateHalfHeight)
    .lineTo(gap, plateHalfHeight);

  // The leads run all the way in to the plates rather than stopping short of a
  // body, so the gap itself is the only break in the conductor.
  if (options.showLeads) {
    shape.moveTo(-half, 0).lineTo(-gap, 0);
    shape.moveTo(gap, 0).lineTo(half, 0);
  }

  return symbolPath(shape, options);
}

/** The symbol for whichever element type is asked for. */
export function createElementSymbol(type: CircuitElementType, providedOptions?: CircuitSymbolOptions): Node {
  if (type === "resistor") {
    return createResistorSymbol(providedOptions);
  }
  if (type === "inductor") {
    return createInductorSymbol(providedOptions);
  }
  return createCapacitorSymbol(providedOptions);
}
