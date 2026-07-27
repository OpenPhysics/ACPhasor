/**
 * ACPhasorScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each AC Phasor screen.
 * Drawn on the standard PhET 548 × 373 canvas using ACPhasorColors.
 *
 *   Intro         — single component (resistor zigzag)
 *   Series RLC    — three components in a horizontal chain
 *   Parallel RLC  — three components stacked between shared rails
 */
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import ACPhasorColors from "../ACPhasorColors.js";

const W = 548;
const H = 373;

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

/** Zigzag resistor motif centered at (cx, cy). */
function resistorPath(cx: number, cy: number, width: number): Path {
  const half = width / 2;
  const amp = 18;
  const shape = new Shape().moveTo(cx - half, cy);
  const segments = 6;
  const step = width / segments;
  for (let i = 0; i < segments; i++) {
    const x = cx - half + (i + 0.5) * step;
    const y = cy + (i % 2 === 0 ? -amp : amp);
    shape.lineTo(x, y);
  }
  shape.lineTo(cx + half, cy);
  return new Path(shape, {
    stroke: ACPhasorColors.resistorColorProperty,
    lineWidth: 8,
    lineCap: "round",
    lineJoin: "round",
  });
}

/** Coil (inductor) motif centered at (cx, cy). */
function inductorPath(cx: number, cy: number, width: number): Path {
  const half = width / 2;
  const r = 16;
  const shape = new Shape().moveTo(cx - half, cy);
  const loops = 4;
  const step = width / loops;
  for (let i = 0; i < loops; i++) {
    const x0 = cx - half + i * step;
    shape.arc(x0 + step / 2, cy, r, Math.PI, 0, false);
  }
  return new Path(shape, {
    stroke: ACPhasorColors.inductorColorProperty,
    lineWidth: 8,
    lineCap: "round",
  });
}

/** Parallel-plate capacitor motif centered at (cx, cy). */
function capacitorNode(cx: number, cy: number): Node {
  const plateH = 70;
  const gap = 18;
  const plateW = 10;
  return new Node({
    children: [
      new Rectangle(cx - gap / 2 - plateW, cy - plateH / 2, plateW, plateH, {
        fill: ACPhasorColors.capacitorColorProperty,
        cornerRadius: 2,
      }),
      new Rectangle(cx + gap / 2, cy - plateH / 2, plateW, plateH, {
        fill: ACPhasorColors.capacitorColorProperty,
        cornerRadius: 2,
      }),
    ],
  });
}

export function createIntroIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [background(), resistorPath(W / 2, H / 2, 220)],
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
      children: [background(), wire, resistorPath(150, y, 100), inductorPath(274, y, 100), capacitorNode(410, y)],
    }),
  );
}

export function createParallelRlcIcon(): ScreenIcon {
  const leftX = 160;
  const rightX = 388;
  const topY = 90;
  const botY = 283;
  const rails = new Path(
    new Shape()
      .moveTo(leftX, topY)
      .lineTo(rightX, topY)
      .moveTo(leftX, botY)
      .lineTo(rightX, botY)
      .moveTo(leftX, topY)
      .lineTo(leftX, botY)
      .moveTo(rightX, topY)
      .lineTo(rightX, botY),
    {
      stroke: ACPhasorColors.accentColorProperty,
      lineWidth: 4,
    },
  );
  return iconFrom(
    new Node({
      children: [
        background(),
        rails,
        resistorPath(W / 2, 130, 140),
        inductorPath(W / 2, 186, 140),
        capacitorNode(W / 2, 250),
      ],
    }),
  );
}
