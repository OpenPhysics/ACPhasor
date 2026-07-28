/**
 * ResistorNode.ts
 *
 * A pictorial axial resistor: a ceramic body with a specular highlight, metal
 * end caps, and color bands. When a resistance Property is supplied the bands
 * are the real EIA color code for that value (two significant digits plus a
 * decade multiplier, closed by a gold tolerance band), so dragging the
 * resistance control repaints the part the way swapping a real resistor would.
 *
 * {@link setDissipationFraction} adds the one thing the inductor and capacitor
 * never do: a heat glow that follows p(t) = i²R. It peaks twice per cycle and
 * never goes negative, so a resistor visibly *spends* energy while the other two
 * are visibly storing and returning it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const resistor = new ResistorNode( { resistanceProperty: model.resistanceProperty } );
 *   resistor.setDissipationFraction( 0.7 );   // 70% of peak power right now
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import ACPhasorColors from "../../ACPhasorColors.js";
import { CircuitElementNode } from "./CircuitElementNode.js";

type SelfOptions = {
  /** Length of the ceramic body in pixels. */
  bodyLength?: number;
  /** Diameter of the ceramic body in pixels. */
  bodyDiameter?: number;
  /**
   * Distance from the center to each terminal. When it exceeds the body, the
   * part grows metal leads to reach it — this is how every element in a slot
   * ends up with the same footprint.
   */
  terminalHalfWidth?: number;
  /** Resistance in ohms; when given, the color bands encode this value. */
  resistanceProperty?: TReadOnlyProperty<number>;
};

/** EIA band colors for digits 0–9. */
const DIGIT_BAND_COLORS = [
  "#1c1c1c", // 0 black
  "#6d4c41", // 1 brown
  "#e53935", // 2 red
  "#fb8c00", // 3 orange
  "#fdd835", // 4 yellow
  "#43a047", // 5 green
  "#1e88e5", // 6 blue
  "#8e24aa", // 7 violet
  "#9e9e9e", // 8 gray
  "#fafafa", // 9 white
] as const;

const GOLD_BAND_COLOR = "#d4af37";
const SILVER_BAND_COLOR = "#c0c0c0";

/** The color for one digit band, defensive against out-of-range input. */
function digitColor(digit: number): string {
  return DIGIT_BAND_COLORS[Math.max(0, Math.min(9, digit))] ?? DIGIT_BAND_COLORS[0];
}

/** The multiplier band color for 10^exponent (gold/silver for negative decades). */
function multiplierColor(exponent: number): string {
  if (exponent === -1) {
    return GOLD_BAND_COLOR;
  }
  if (exponent <= -2) {
    return SILVER_BAND_COLOR;
  }
  return digitColor(exponent);
}

/**
 * The three value bands for a resistance: two significant digits and the decade
 * multiplier, e.g. 47 Ω → yellow, violet, black.
 */
function bandColorsFor(resistance: number): [string, string, string] {
  if (!(resistance > 0)) {
    return [digitColor(0), digitColor(0), digitColor(0)];
  }
  const decade = Math.floor(Math.log10(resistance));
  let twoDigits = Math.round(resistance / 10 ** (decade - 1));
  let exponent = decade - 1;
  if (twoDigits >= 100) {
    // Rounding pushed us into the next decade (e.g. 99.6 → 100).
    twoDigits = Math.round(twoDigits / 10);
    exponent += 1;
  }
  return [digitColor(Math.floor(twoDigits / 10)), digitColor(twoDigits % 10), multiplierColor(exponent)];
}

/** Padding of the heat glow beyond the body outline, in pixels. */
const GLOW_PADDING = 6;

export class ResistorNode extends CircuitElementNode {
  public readonly connectionHalfWidth: number;

  private readonly valueBands: Rectangle[] = [];
  private readonly heatGlow: Rectangle;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      bodyLength: 56,
      bodyDiameter: 22,
      ...providedOptions,
    };

    super();

    const halfLength = options.bodyLength / 2;
    const halfDiameter = options.bodyDiameter / 2;
    const capLength = 7;
    this.connectionHalfWidth = Math.max(halfLength, options.terminalHalfWidth ?? halfLength);

    // Metal leads out to the terminals, drawn behind the body.
    if (this.connectionHalfWidth > halfLength) {
      this.addChild(
        new Path(
          new Shape()
            .moveTo(-this.connectionHalfWidth, 0)
            .lineTo(-halfLength, 0)
            .moveTo(halfLength, 0)
            .lineTo(this.connectionHalfWidth, 0),
          { stroke: ACPhasorColors.wireColorProperty, lineWidth: 3, lineCap: "round" },
        ),
      );
    }

    // Heat glow behind the body; its opacity is driven by setDissipationFraction.
    this.heatGlow = new Rectangle(
      -halfLength - GLOW_PADDING,
      -halfDiameter - GLOW_PADDING,
      options.bodyLength + 2 * GLOW_PADDING,
      options.bodyDiameter + 2 * GLOW_PADDING,
      {
        cornerRadius: halfDiameter,
        fill: ACPhasorColors.dissipationGlowColorProperty,
        opacity: 0,
      },
    );
    this.addChild(this.heatGlow);

    const bodyShape = Shape.roundRect(
      -halfLength,
      -halfDiameter,
      options.bodyLength,
      options.bodyDiameter,
      halfDiameter * 0.7,
      halfDiameter * 0.7,
    );

    // Ceramic body.
    this.addChild(
      new Rectangle(-halfLength, -halfDiameter, options.bodyLength, options.bodyDiameter, {
        cornerRadius: halfDiameter * 0.7,
        fill: ACPhasorColors.resistorBodyColorProperty,
        stroke: ACPhasorColors.componentShadeColorProperty,
        lineWidth: 1,
      }),
    );

    // Bands and shading are clipped to the body outline so they follow its curve.
    const bodyDetail = new Node({ clipArea: bodyShape });
    this.addChild(bodyDetail);

    // Metal end caps.
    for (const sign of [-1, 1]) {
      bodyDetail.addChild(
        new Rectangle(sign < 0 ? -halfLength : halfLength - capLength, -halfDiameter, capLength, options.bodyDiameter, {
          fill: ACPhasorColors.coreColorProperty,
        }),
      );
    }

    // Color bands: three value bands toward the left, tolerance band at the right.
    const bandWidth = 6;
    const bandXs = [-halfLength + capLength + 5, -halfLength + capLength + 16, -halfLength + capLength + 27];
    for (const x of bandXs) {
      const band = new Rectangle(x, -halfDiameter, bandWidth, options.bodyDiameter, {
        fill: DIGIT_BAND_COLORS[0],
      });
      this.valueBands.push(band);
      bodyDetail.addChild(band);
    }
    bodyDetail.addChild(
      new Rectangle(halfLength - capLength - 8, -halfDiameter, bandWidth - 1, options.bodyDiameter, {
        fill: GOLD_BAND_COLOR,
      }),
    );

    // Cylindrical shading: a lit stripe near the top, a shadow along the bottom.
    bodyDetail.addChild(
      new Rectangle(-halfLength, -halfDiameter + 2, options.bodyLength, 3, {
        fill: ACPhasorColors.componentHighlightColorProperty,
        opacity: 0.45,
      }),
    );
    bodyDetail.addChild(
      new Rectangle(-halfLength, halfDiameter - 4, options.bodyLength, 4, {
        fill: ACPhasorColors.componentShadeColorProperty,
        opacity: 0.4,
      }),
    );

    // Letter label above the part.
    this.addChild(
      new Text("R", {
        font: "italic bold 15px sans-serif",
        fill: ACPhasorColors.resistorColorProperty,
        centerX: 0,
        bottom: -halfDiameter - 6,
      }),
    );

    if (options.resistanceProperty) {
      options.resistanceProperty.link((resistance) => {
        const colors = bandColorsFor(resistance);
        this.valueBands.forEach((band, index) => {
          band.fill = colors[index] ?? DIGIT_BAND_COLORS[0];
        });
      });
    }
  }

  /**
   * Show the power the resistor is dissipating right now, as a fraction of its
   * peak: 0 leaves the part cold, 1 gives it the full heat glow. Power is never
   * negative, so this argument is unsigned.
   */
  public setDissipationFraction(fraction: number): void {
    this.heatGlow.opacity = 0.55 * Math.max(0, Math.min(1, fraction));
  }
}
