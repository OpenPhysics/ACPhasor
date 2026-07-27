/**
 * CircuitDiagramNode.ts
 *
 * A schematic of a single-loop AC circuit — an AC source on the left edge and
 * one or more passive elements along the top edge — with animated charge
 * carriers riding the wires. Because a series loop carries the same current
 * everywhere, all carriers share one arc-length displacement:
 *
 *   • their velocity is proportional to the instantaneous current i(t), so the
 *     motion *is* the current, and
 *   • their displacement is proportional to the charge q(t) = ∫ i dt, so how far
 *     they slosh back and forth *is* the charge that has flowed.
 *
 * Drive the animation each frame with {@link setCurrent}, passing the current
 * phasor, angular frequency, and time; the mapping from amps to pixels is
 * handled internally (and stays finite as ω → 0).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Intro: one element whose type follows a Property
 *   const circuit = new CircuitDiagramNode({
 *     slots: [{ typeProperty: model.elementTypeProperty }],
 *   });
 *   // Series RLC: a fixed R–L–C chain
 *   const circuit = new CircuitDiagramNode({
 *     slots: [{ type: "resistor" }, { type: "inductor" }, { type: "capacitor" }],
 *   });
 *   // each frame:
 *   circuit.setCurrent(model.currentPhasorProperty.value, omega, time);
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, type TColor, Text } from "scenerystack/scenery";
import ACPhasorColors from "../../ACPhasorColors.js";
import type { CircuitElementType } from "../model/Impedance.js";
import type { Phasor } from "../model/Phasor.js";

/** One position along the top edge, holding either a fixed element or a live selection. */
export type CircuitElementSlot = { type: CircuitElementType } | { typeProperty: TReadOnlyProperty<CircuitElementType> };

type SelfOptions = {
  /** Loop width in view pixels. */
  width?: number;
  /** Loop height in view pixels. */
  height?: number;
  /** Elements placed left-to-right along the top edge. */
  slots?: CircuitElementSlot[];
  /** Number of charge carriers riding the loop. */
  chargeCount?: number;
  /** Radius of each charge carrier, in pixels. */
  chargeRadius?: number;
  /** Pixels of carrier displacement per unit charge (amps·seconds). */
  chargeVisualScale?: number;
};

const ELEMENT_COLORS: Record<CircuitElementType, () => TColor> = {
  resistor: () => ACPhasorColors.resistorColorProperty,
  inductor: () => ACPhasorColors.inductorColorProperty,
  capacitor: () => ACPhasorColors.capacitorColorProperty,
};
const ELEMENT_LETTERS: Record<CircuitElementType, string> = {
  resistor: "R",
  inductor: "L",
  capacitor: "C",
};

export class CircuitDiagramNode extends Node {
  private readonly x0: number;
  private readonly y0: number;
  private readonly x1: number;
  private readonly y1: number;
  private readonly loopWidth: number;
  private readonly loopHeight: number;
  private readonly perimeter: number;
  private readonly chargeVisualScale: number;

  private readonly charges: Circle[];
  private readonly baseArcs: number[];

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      width: 300,
      height: 180,
      slots: [] as CircuitElementSlot[],
      chargeCount: 16,
      chargeRadius: 4,
      chargeVisualScale: 900,
      ...providedOptions,
    };

    super();

    const inset = options.chargeRadius + 2;
    this.x0 = inset;
    this.y0 = inset;
    this.x1 = options.width - inset;
    this.y1 = options.height - inset;
    this.loopWidth = this.x1 - this.x0;
    this.loopHeight = this.y1 - this.y0;
    this.perimeter = 2 * (this.loopWidth + this.loopHeight);
    this.chargeVisualScale = options.chargeVisualScale;

    const wireColor = ACPhasorColors.wireColorProperty as TColor;

    // Right and bottom edges are plain wire.
    this.addChild(new Line(this.x1, this.y0, this.x1, this.y1, { stroke: wireColor, lineWidth: 2 }));
    this.addChild(new Line(this.x1, this.y1, this.x0, this.y1, { stroke: wireColor, lineWidth: 2 }));

    // Left edge: AC source between the two left corners.
    this.addChild(this.createAcSource(wireColor));

    // Top edge: one segment per slot, symbols centered with connecting leads.
    const slotCount = Math.max(options.slots.length, 1);
    const segmentWidth = this.loopWidth / slotCount;
    options.slots.forEach((slot, index) => {
      const segLeft = this.x0 + index * segmentWidth;
      const segRight = segLeft + segmentWidth;
      this.addChild(this.createSlot(slot, segLeft, segRight, this.y0, wireColor));
    });
    if (options.slots.length === 0) {
      // No elements: plain wire across the top.
      this.addChild(new Line(this.x0, this.y0, this.x1, this.y0, { stroke: wireColor, lineWidth: 2 }));
    }

    // Charge carriers ride on top of the wires.
    this.charges = [];
    this.baseArcs = [];
    for (let i = 0; i < options.chargeCount; i++) {
      const arc = (i * this.perimeter) / options.chargeCount;
      this.baseArcs.push(arc);
      const dot = new Circle(options.chargeRadius, {
        fill: ACPhasorColors.chargeColorProperty,
        center: this.arcToPoint(arc),
      });
      this.charges.push(dot);
      this.addChild(dot);
    }
  }

  /**
   * Update carrier positions for the given current at time t. Displacement is
   * proportional to the charge q(t) = (|I|/ω)·sin(ωt + φ), so carriers slosh with
   * an amplitude that grows with current and shrinks with frequency.
   */
  public setCurrent(current: Phasor, angularFrequency: number, time: number): void {
    let offset = 0;
    if (angularFrequency > 1e-6) {
      const chargeAmplitude = current.amplitude / angularFrequency;
      offset = chargeAmplitude * this.chargeVisualScale * Math.sin(angularFrequency * time + current.phase);
    }
    for (let i = 0; i < this.charges.length; i++) {
      this.charges[i].center = this.arcToPoint(this.baseArcs[i] + offset);
    }
  }

  /** Map an arc length (clockwise from the top-left corner) to a point on the loop. */
  private arcToPoint(arc: number): Vector2 {
    let s = ((arc % this.perimeter) + this.perimeter) % this.perimeter;
    if (s <= this.loopWidth) {
      return new Vector2(this.x0 + s, this.y0); // top, left→right
    }
    s -= this.loopWidth;
    if (s <= this.loopHeight) {
      return new Vector2(this.x1, this.y0 + s); // right, top→bottom
    }
    s -= this.loopHeight;
    if (s <= this.loopWidth) {
      return new Vector2(this.x1 - s, this.y1); // bottom, right→left
    }
    s -= this.loopWidth;
    return new Vector2(this.x0, this.y1 - s); // left, bottom→top
  }

  /** A top-edge slot: a fixed element, or all three overlaid with visibility bound to a Property. */
  private createSlot(slot: CircuitElementSlot, segLeft: number, segRight: number, y: number, wireColor: TColor): Node {
    if ("type" in slot) {
      return this.createElementSymbol(slot.type, segLeft, segRight, y, wireColor);
    }
    const container = new Node();
    const types: CircuitElementType[] = ["resistor", "inductor", "capacitor"];
    for (const type of types) {
      const symbol = this.createElementSymbol(type, segLeft, segRight, y, wireColor);
      symbol.visibleProperty = new DerivedProperty([slot.typeProperty], (selected) => selected === type);
      container.addChild(symbol);
    }
    return container;
  }

  /** Draw one element symbol with connecting leads over [segLeft, segRight] at height y. */
  private createElementSymbol(
    type: CircuitElementType,
    segLeft: number,
    segRight: number,
    y: number,
    wireColor: TColor,
  ): Node {
    const node = new Node();
    const color = ELEMENT_COLORS[type]();
    const center = (segLeft + segRight) / 2;
    const symbolWidth = Math.min(segRight - segLeft - 16, 56);
    const left = center - symbolWidth / 2;
    const right = center + symbolWidth / 2;

    // Leads from the segment ends up to the symbol.
    node.addChild(new Line(segLeft, y, left, y, { stroke: wireColor, lineWidth: 2 }));
    node.addChild(new Line(right, y, segRight, y, { stroke: wireColor, lineWidth: 2 }));

    if (type === "resistor") {
      const zig = new Shape().moveTo(left, y);
      const teeth = 6;
      const amplitude = 7;
      for (let k = 0; k < teeth; k++) {
        const x = left + ((k + 0.5) / teeth) * symbolWidth;
        zig.lineTo(x, y + (k % 2 === 0 ? -amplitude : amplitude));
      }
      zig.lineTo(right, y);
      node.addChild(new Path(zig, { stroke: color, lineWidth: 2.5 }));
    } else if (type === "inductor") {
      const bumps = 4;
      const radius = symbolWidth / (2 * bumps);
      const coils = new Shape();
      for (let k = 0; k < bumps; k++) {
        const cx = left + radius * (2 * k + 1);
        coils.arc(cx, y, radius, Math.PI, 0, false); // upward semicircle
      }
      node.addChild(new Path(coils, { stroke: color, lineWidth: 2.5 }));
    } else {
      // Capacitor: two plates with a gap (no wire between them).
      const gap = 8;
      const plateHalf = 11;
      node.addChild(new Line(left, y, center - gap / 2, y, { stroke: wireColor, lineWidth: 2 }));
      node.addChild(new Line(center + gap / 2, y, right, y, { stroke: wireColor, lineWidth: 2 }));
      node.addChild(
        new Line(center - gap / 2, y - plateHalf, center - gap / 2, y + plateHalf, {
          stroke: color,
          lineWidth: 2.5,
        }),
      );
      node.addChild(
        new Line(center + gap / 2, y - plateHalf, center + gap / 2, y + plateHalf, {
          stroke: color,
          lineWidth: 2.5,
        }),
      );
    }

    // Element letter above the symbol.
    node.addChild(
      new Text(ELEMENT_LETTERS[type], {
        font: "italic bold 14px sans-serif",
        fill: color,
        centerX: center,
        bottom: y - 16,
      }),
    );
    return node;
  }

  /** AC source symbol: a circle with a sine wave, centered on the left edge. */
  private createAcSource(wireColor: TColor): Node {
    const node = new Node();
    const cx = this.x0;
    const cy = (this.y0 + this.y1) / 2;
    const radius = 16;

    node.addChild(new Line(cx, this.y0, cx, cy - radius, { stroke: wireColor, lineWidth: 2 }));
    node.addChild(new Line(cx, cy + radius, cx, this.y1, { stroke: wireColor, lineWidth: 2 }));
    node.addChild(new Circle(radius, { center: new Vector2(cx, cy), stroke: wireColor, lineWidth: 2 }));

    // Sine squiggle inside the circle.
    const sine = new Shape();
    const half = radius - 5;
    for (let i = 0; i <= 20; i++) {
      const fraction = i / 20;
      const x = cx - half + fraction * 2 * half;
      const yy = cy - Math.sin(fraction * 2 * Math.PI) * (radius - 7);
      i === 0 ? sine.moveTo(x, yy) : sine.lineTo(x, yy);
    }
    node.addChild(new Path(sine, { stroke: wireColor, lineWidth: 1.5 }));
    return node;
  }
}
