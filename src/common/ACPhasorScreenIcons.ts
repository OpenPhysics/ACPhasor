/**
 * ACPhasorScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each AC Phasor screen.
 * Drawn on the standard PhET 548 × 373 canvas using ACPhasorColors.
 *
 *   Intro       — single component (resistor zigzag)
 *   Series RLC  — three components in a horizontal chain
 *   Resonance   — a sharp resonance-peak curve
 *   Power       — an instantaneous-power p(t) waveform with shaded lobes
 */
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import ACPhasorColors from "../ACPhasorColors.js";
import { createCapacitorSymbol, createInductorSymbol, createResistorSymbol } from "./view/CircuitSymbols.js";

const W = 548;
const H = 373;

/** Stroke weight for the element glyphs at icon scale. */
const ICON_LINE_WIDTH = 8;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: ACPhasorColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: ACPhasorColors.backgroundColorProperty,
  });
}

/**
 * Places one of the shared {@link CircuitSymbols} glyphs with its wire line on
 * (cx, cy). The icons draw the same symbols the element picker does, just
 * heavier — one glyph per element, wherever it appears.
 */
function motif(symbol: Node, cx: number, cy: number): Node {
  symbol.translation = new Vector2(cx, cy);
  return symbol;
}

/** Zigzag resistor motif centered at (cx, cy). */
function resistorMotif(cx: number, cy: number, width: number): Node {
  return motif(
    createResistorSymbol({ width: width, height: 36, lineWidth: ICON_LINE_WIDTH, showLeads: false }),
    cx,
    cy,
  );
}

/** Coil (inductor) motif centered at (cx, cy). */
function inductorMotif(cx: number, cy: number, width: number): Node {
  return motif(
    createInductorSymbol({ width: width, height: 16, lineWidth: ICON_LINE_WIDTH, showLeads: false }),
    cx,
    cy,
  );
}

/** Parallel-plate capacitor motif centered at (cx, cy). */
function capacitorMotif(cx: number, cy: number): Node {
  return motif(createCapacitorSymbol({ width: 100, height: 70, lineWidth: 10, showLeads: false }), cx, cy);
}

export function createIntroIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [background(), resistorMotif(W / 2, H / 2, 220)],
    }),
  );
}

export function createSeriesRlcIcon(): ScreenIcon {
  const y = H / 2;
  const wireY = y;
  const wire = new Path(new Shape().moveTo(40, wireY).lineTo(W - 40, wireY), {
    stroke: ACPhasorColors.accentColorProperty,
    lineWidth: 4,
  });
  return iconFrom(
    new Node({
      children: [background(), wire, resistorMotif(150, y, 100), inductorMotif(274, y, 100), capacitorMotif(410, y)],
    }),
  );
}

/** Resonance-peak curve (current vs. frequency) with a marked baseline. */
export function createResonanceIcon(): ScreenIcon {
  const left = 60;
  const right = W - 60;
  const baseY = 300;
  const peakX = W / 2;
  const peakY = 80;

  // Axes.
  const axes = new Path(new Shape().moveTo(left, 60).lineTo(left, baseY).lineTo(right, baseY), {
    stroke: ACPhasorColors.textColorProperty,
    lineWidth: 4,
  });

  // A sharp Lorentzian-style resonance peak sampled across the frequency axis.
  const curveShape = new Shape();
  const gamma = 46; // half-width controlling sharpness
  const span = right - left;
  const samples = 80;
  for (let i = 0; i <= samples; i++) {
    const x = left + (span * i) / samples;
    const d = (x - peakX) / gamma;
    const amp = 1 / (1 + d * d);
    const y = baseY - amp * (baseY - peakY);
    if (i === 0) {
      curveShape.moveTo(x, y);
    } else {
      curveShape.lineTo(x, y);
    }
  }
  const curve = new Path(curveShape, {
    stroke: ACPhasorColors.accentColorProperty,
    lineWidth: 8,
    lineJoin: "round",
    lineCap: "round",
  });

  // Dashed marker at the resonance frequency.
  const marker = new Path(new Shape().moveTo(peakX, peakY).lineTo(peakX, baseY), {
    stroke: ACPhasorColors.inductorColorProperty,
    lineWidth: 3,
    lineDash: [10, 8],
  });

  return iconFrom(new Node({ children: [background(), axes, marker, curve] }));
}

/** Instantaneous-power p(t) = v·i waveform with its positive lobes shaded. */
export function createPowerIcon(): ScreenIcon {
  const left = 60;
  const right = W - 60;
  const midY = H / 2;
  const amp = 110;
  const offset = 30; // p(t) average is shifted above zero for a typical load
  const span = right - left;
  const samples = 96;
  const cycles = 2;

  // Axis at the p = 0 line.
  const axis = new Path(new Shape().moveTo(left, midY).lineTo(right, midY), {
    stroke: ACPhasorColors.textColorProperty,
    lineWidth: 4,
  });

  // p(t) ∝ offset + cos(2ωt): sample once, reuse for the fill and the stroke.
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const x = left + (span * i) / samples;
    const phase = (cycles * 2 * Math.PI * i) / samples;
    const y = midY - offset - amp * Math.cos(phase);
    points.push({ x, y });
  }

  // Shaded region between the curve and the zero line.
  const fillShape = new Shape().moveTo(left, midY);
  for (const p of points) {
    fillShape.lineTo(p.x, p.y);
  }
  fillShape.lineTo(right, midY).close();
  const fill = new Path(fillShape, { fill: ACPhasorColors.capacitorColorProperty });

  const curveShape = new Shape();
  points.forEach((p, i) => {
    if (i === 0) {
      curveShape.moveTo(p.x, p.y);
    } else {
      curveShape.lineTo(p.x, p.y);
    }
  });
  const curve = new Path(curveShape, {
    stroke: ACPhasorColors.accentColorProperty,
    lineWidth: 8,
    lineJoin: "round",
    lineCap: "round",
  });

  return iconFrom(new Node({ children: [background(), fill, axis, curve] }));
}
