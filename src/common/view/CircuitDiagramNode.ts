/**
 * CircuitDiagramNode.ts
 *
 * A pictorial single-loop AC circuit — an AC source on the left edge and one or
 * more real-looking components along the top edge, wired together with rounded
 * copper-style wire — with animated charge carriers riding the wires. Because a
 * series loop carries the same current everywhere, all carriers share one
 * arc-length displacement:
 *
 *   • their velocity is proportional to the instantaneous current i(t), so the
 *     motion *is* the current, and
 *   • their displacement is proportional to the charge q(t) = ∫ i dt, so how far
 *     they slosh back and forth *is* the charge that has flowed.
 *
 * Components are drawn as parts rather than symbols ({@link ResistorNode},
 * {@link InductorNode}, {@link CapacitorNode}); pass each slot the model
 * Properties for its value and the voltage across it, and the picture follows
 * the physics — resistor color bands encode R, windings track L, and the
 * capacitor's plates grow with C while + / − charge piles up on them as
 * q = C·v swings through the cycle.
 *
 * Drive the animation each frame with {@link setState}, passing the current
 * phasor, angular frequency, and time; the mapping from amps to pixels is
 * handled internally (and stays finite as ω → 0).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Intro: one element whose type follows a Property
 *   const circuit = new CircuitDiagramNode( {
 *     sourceVoltageProperty: model.source.voltagePhasorProperty,
 *     slots: [ {
 *       typeProperty: model.elementTypeProperty,
 *       resistanceProperty: model.resistanceProperty,
 *       inductanceProperty: model.inductanceProperty,
 *       capacitanceProperty: model.capacitanceProperty,
 *       voltageProperty: model.voltagePhasorProperty,
 *     } ],
 *   } );
 *   // each frame:
 *   circuit.setState( model.currentPhasorProperty.value, omega, time );
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { type Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, type TColor, Text } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { CAPACITOR_SATURATION_CHARGE_C, INDUCTANCE_RANGE_H } from "../../ACPhasorConstants.js";
import type { CircuitElementType } from "../model/Impedance.js";
import type { Phasor } from "../model/Phasor.js";
import { ACSourceNode } from "./ACSourceNode.js";
import { CapacitorNode } from "./CapacitorNode.js";
import type { CircuitElementNode } from "./CircuitElementNode.js";
import { InductorNode } from "./InductorNode.js";
import { ResistorNode } from "./ResistorNode.js";

// Length of the conventional-current direction arrow, in pixels.
const CURRENT_ARROW_LENGTH = 26;

// Distance from an element's center to its wire terminals. Every element uses
// the same footprint so a slot's wire gap does not change when its type does.
const ELEMENT_HALF_WIDTH = 66;

/** Model Properties a slot can bind to, so the drawn part reflects its value. */
type SlotProperties = {
  /** Resistance (Ω) — sets the resistor's color bands. */
  resistanceProperty?: TReadOnlyProperty<number>;
  /** Inductance (H) — sets the number of windings. */
  inductanceProperty?: TReadOnlyProperty<number>;
  /** Inductance range the winding count is mapped over. */
  inductanceRange?: Range;
  /** Capacitance (F) — sets the plate area. */
  capacitanceProperty?: TReadOnlyProperty<number>;
  /** Capacitance range the plate area is mapped over. */
  capacitanceRange?: Range;
  /** Voltage phasor across this element — sets the capacitor's plate charge. */
  voltageProperty?: TReadOnlyProperty<Phasor>;
};

/** One position along the top edge, holding either a fixed element or a live selection. */
export type CircuitElementSlot = SlotProperties &
  ({ type: CircuitElementType } | { typeProperty: TReadOnlyProperty<CircuitElementType> });

type SelfOptions = {
  /**
   * Loop width in view pixels. Each slot takes 2·ELEMENT_HALF_WIDTH of the top
   * edge plus the corner arcs, so give a multi-element loop enough width for
   * its parts and some wire between them.
   */
  width?: number;
  /** Loop height in view pixels. */
  height?: number;
  /** Radius of the wire's rounded corners, in pixels. */
  cornerRadius?: number;
  /** Elements placed left-to-right along the top edge. */
  slots?: CircuitElementSlot[];
  /** Number of charge carriers riding the loop. */
  chargeCount?: number;
  /** Radius of each charge carrier, in pixels. */
  chargeRadius?: number;
  /** Pixels of carrier displacement per unit charge (amps·seconds). */
  chargeVisualScale?: number;
  /** Source voltage phasor — drives the source's terminal polarity marks. */
  sourceVoltageProperty?: TReadOnlyProperty<Phasor>;
  /**
   * How a capacitor's plate charge maps to the number of charge symbols:
   *
   *   "absolute" — against a fixed reference charge, so a bigger C or a bigger
   *     voltage really does put more charge on the plates. Use it where the
   *     element sees the source voltage directly.
   *   "peak" — against the peak charge of the present settings, so the plates
   *     always fill at the crest of the cycle. Use it in a series circuit,
   *     where the capacitor's share of the source voltage can be a tiny
   *     fraction of it and an absolute scale would leave the plates bare.
   */
  capacitorChargeScale?: "absolute" | "peak";
};

/** A capacitor in the diagram plus the model Properties that size and charge it. */
type ChargedCapacitor = {
  node: CapacitorNode;
  capacitanceProperty: TReadOnlyProperty<number> | undefined;
  voltageProperty: TReadOnlyProperty<Phasor> | undefined;
  /** Re-applies the plate area for the present capacitance. */
  updatePlateArea: () => void;
};

export class CircuitDiagramNode extends Node {
  private readonly x0: number;
  private readonly y0: number;
  private readonly x1: number;
  private readonly y1: number;
  private readonly cornerRadius: number;
  /** Straight-run lengths and the total path length around the rounded loop. */
  private readonly straightWidth: number;
  private readonly straightHeight: number;
  private readonly arcLength: number;
  private readonly perimeter: number;
  private readonly chargeVisualScale: number;
  private readonly maxSway: number;

  private readonly carriers: { dot: Circle; baseArc: number }[];
  /** Arc-length spans hidden behind the source and the components. */
  private readonly occludedSpans: { start: number; end: number }[] = [];

  private readonly capacitors: ChargedCapacitor[] = [];
  private readonly capacitorChargeScale: "absolute" | "peak";
  private readonly sourceNode: ACSourceNode;
  private readonly sourceVoltageProperty: TReadOnlyProperty<Phasor> | undefined;

  // Conventional-current direction indicator on the bottom wire (PhET-style).
  private readonly currentArrow: ArrowNode;
  private readonly arrowCenterX: number;
  private readonly arrowY: number;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      width: 340,
      height: 165,
      cornerRadius: 8,
      slots: [] as CircuitElementSlot[],
      chargeCount: 18,
      chargeRadius: 4,
      chargeVisualScale: 900,
      capacitorChargeScale: "absolute" as const,
      ...providedOptions,
    };

    super();

    const inset = options.chargeRadius + 3;
    this.x0 = inset;
    this.y0 = inset;
    this.x1 = options.width - inset;
    this.y1 = options.height - inset;
    this.cornerRadius = options.cornerRadius;
    this.straightWidth = this.x1 - this.x0 - 2 * this.cornerRadius;
    this.straightHeight = this.y1 - this.y0 - 2 * this.cornerRadius;
    this.arcLength = (Math.PI * this.cornerRadius) / 2;
    this.perimeter = 2 * (this.straightWidth + this.straightHeight) + 4 * this.arcLength;
    this.chargeVisualScale = options.chargeVisualScale;
    // Cap the sway so extreme currents (tiny |Z|) stay a legible oscillation
    // rather than a blur — roughly 1.5 carrier spacings.
    this.maxSway = (1.5 * this.perimeter) / options.chargeCount;
    this.sourceVoltageProperty = options.sourceVoltageProperty;
    this.capacitorChargeScale = options.capacitorChargeScale;

    const wireColor = ACPhasorColors.wireColorProperty as TColor;

    // ── AC source on the left edge ──────────────────────────────────────────
    this.sourceNode = new ACSourceNode();
    const sourceCenterY = (this.y0 + this.y1) / 2;
    this.sourceNode.translation = new Vector2(this.x0, sourceCenterY);

    // ── Components along the top edge ───────────────────────────────────────
    // Centers are spread over the run of top wire that is actually available:
    // inside the corner arcs, with room for each part's footprint and a little
    // wire showing at both ends.
    const endPadding = this.cornerRadius + ELEMENT_HALF_WIDTH + 10;
    const firstCenter = this.x0 + endPadding;
    const lastCenter = this.x1 - endPadding;
    const slotCount = options.slots.length;
    const slotSpacing = slotCount > 1 ? (lastCenter - firstCenter) / (slotCount - 1) : 0;
    const topGaps: { left: number; right: number }[] = [];
    const elementNodes: Node[] = [];
    // Visibility bindings are applied after the layout bounds are frozen, so a
    // slot that switches type does not move the diagram around on screen.
    const pendingVisibility: (() => void)[] = [];

    options.slots.forEach((slot, index) => {
      const centerX = slotCount > 1 ? firstCenter + index * slotSpacing : (this.x0 + this.x1) / 2;
      const node = this.createSlot(slot, pendingVisibility);
      node.translation = new Vector2(centerX, this.y0);
      elementNodes.push(node);
      topGaps.push({ left: centerX - ELEMENT_HALF_WIDTH, right: centerX + ELEMENT_HALF_WIDTH });
      this.occludedSpans.push({
        start: centerX - ELEMENT_HALF_WIDTH - (this.x0 + this.cornerRadius),
        end: centerX + ELEMENT_HALF_WIDTH - (this.x0 + this.cornerRadius),
      });
    });

    // The source hides part of the left edge from the carriers too.
    const sourceHalfHeight = this.sourceNode.connectionHalfHeight;
    const leftEdgeStart = this.straightWidth + this.straightHeight + this.straightWidth + 3 * this.arcLength;
    const sourceArcCenter = leftEdgeStart + (this.y1 - this.cornerRadius - sourceCenterY);
    this.occludedSpans.push({
      start: sourceArcCenter - sourceHalfHeight,
      end: sourceArcCenter + sourceHalfHeight,
    });

    // ── Wire ────────────────────────────────────────────────────────────────
    this.addChild(
      new Path(this.createWireShape(topGaps, sourceCenterY - sourceHalfHeight, sourceCenterY + sourceHalfHeight), {
        stroke: wireColor,
        lineWidth: 3,
        lineCap: "round",
        lineJoin: "round",
      }),
    );

    // ── Charge carriers, then the parts they run behind ─────────────────────
    this.carriers = [];
    for (let i = 0; i < options.chargeCount; i++) {
      const baseArc = (i * this.perimeter) / options.chargeCount;
      const dot = new Circle(options.chargeRadius, {
        fill: ACPhasorColors.chargeColorProperty,
        center: this.arcToPoint(baseArc),
      });
      this.carriers.push({ dot, baseArc });
      this.addChild(dot);
    }

    this.addChild(this.sourceNode);
    for (const node of elementNodes) {
      this.addChild(node);
    }

    // ── Conventional-current direction arrow, below the bottom wire ─────────
    this.arrowCenterX = (this.x0 + this.x1) / 2;
    this.arrowY = this.y1 + 16;
    this.currentArrow = new ArrowNode(
      this.arrowCenterX + CURRENT_ARROW_LENGTH / 2,
      this.arrowY,
      this.arrowCenterX - CURRENT_ARROW_LENGTH / 2,
      this.arrowY,
      {
        fill: ACPhasorColors.chargeColorProperty,
        stroke: null,
        headWidth: 12,
        headHeight: 11,
        tailWidth: 4,
        opacity: 0,
      },
    );
    this.addChild(this.currentArrow);
    this.addChild(
      new Text("i", {
        font: "italic 13px sans-serif",
        fill: wireColor,
        left: this.arrowCenterX + CURRENT_ARROW_LENGTH / 2 + 6,
        centerY: this.arrowY,
      }),
    );

    // Freeze the layout footprint at its worst case — every element of every
    // slot visible, every capacitor at full plate size — so neither switching a
    // slot's type nor growing a capacitance moves the diagram on screen.
    for (const capacitor of this.capacitors) {
      capacitor.node.setPlateAreaFraction(1);
    }
    this.localBounds = this.localBounds.copy();
    for (const capacitor of this.capacitors) {
      capacitor.updatePlateArea();
    }
    for (const apply of pendingVisibility) {
      apply();
    }
  }

  /**
   * Update the diagram for the given current at time t: carrier positions,
   * current direction, source polarity, and capacitor plate charge.
   *
   * Carrier displacement is proportional to the charge q(t) = (|I|/ω)·sin(ωt + φ),
   * so carriers slosh with an amplitude that grows with current and shrinks with
   * frequency.
   */
  public setState(current: Phasor, angularFrequency: number, time: number): void {
    const phase = angularFrequency * time + current.phase;

    // Carrier displacement is the charge q(t) = (|I|/ω)·sin(phase).
    let offset = 0;
    if (angularFrequency > 1e-6) {
      const chargeAmplitude = current.amplitude / angularFrequency;
      const swayAmplitude = Math.min(chargeAmplitude * this.chargeVisualScale, this.maxSway);
      offset = swayAmplitude * Math.sin(phase);
    }
    for (const carrier of this.carriers) {
      const arc = this.normalizeArc(carrier.baseArc + offset);
      carrier.dot.center = this.arcToPoint(arc);
      carrier.dot.visible = !this.isOccluded(arc);
    }

    // Direction arrow: instantaneous current i(t) = |I|·cos(phase). Positive
    // (clockwise) current runs right→left along the bottom wire, so the arrow
    // points left; it flips for negative current and fades with |i|.
    const instantaneous = current.amplitude * Math.cos(phase);
    const half = CURRENT_ARROW_LENGTH / 2;
    const sign = instantaneous >= 0 ? 1 : -1;
    this.currentArrow.setTailAndTip(
      this.arrowCenterX + sign * half,
      this.arrowY,
      this.arrowCenterX - sign * half,
      this.arrowY,
    );
    const fraction = current.amplitude > 1e-9 ? Math.abs(instantaneous) / current.amplitude : 0;
    this.currentArrow.opacity = current.amplitude < 1e-9 ? 0 : 0.2 + 0.6 * fraction;

    // Source polarity.
    if (this.sourceVoltageProperty) {
      const sourceVoltage = this.sourceVoltageProperty.value;
      this.sourceNode.setVoltage(sourceVoltage.instantaneousValue(angularFrequency, time), sourceVoltage.amplitude);
    }

    // Capacitor plate charge q(t) = C·v(t), as a fraction of full scale.
    for (const capacitor of this.capacitors) {
      if (!(capacitor.capacitanceProperty && capacitor.voltageProperty)) {
        continue;
      }
      const voltagePhasor = capacitor.voltageProperty.value;
      const capacitance = capacitor.capacitanceProperty.value;
      const charge = capacitance * voltagePhasor.instantaneousValue(angularFrequency, time);
      const reference =
        this.capacitorChargeScale === "peak"
          ? Math.max(capacitance * voltagePhasor.amplitude, 1e-9)
          : CAPACITOR_SATURATION_CHARGE_C;
      capacitor.node.setChargeFraction(charge / reference);
    }
  }

  /** Wrap an arc length into [0, perimeter). */
  private normalizeArc(arc: number): number {
    return ((arc % this.perimeter) + this.perimeter) % this.perimeter;
  }

  /** Whether a carrier at this arc length is hidden behind a component. */
  private isOccluded(arc: number): boolean {
    for (const span of this.occludedSpans) {
      const start = this.normalizeArc(span.start);
      const end = this.normalizeArc(span.end);
      // A span that straddles the seam at arc 0 reads as start > end.
      const inside = start <= end ? arc >= start && arc <= end : arc >= start || arc <= end;
      if (inside) {
        return true;
      }
    }
    return false;
  }

  /**
   * Map an arc length (clockwise from the start of the top edge) to a point on
   * the rounded loop.
   */
  private arcToPoint(arc: number): Vector2 {
    const r = this.cornerRadius;
    let s = this.normalizeArc(arc);

    // Top straight, left→right.
    if (s <= this.straightWidth) {
      return new Vector2(this.x0 + r + s, this.y0);
    }
    s -= this.straightWidth;
    if (s <= this.arcLength) {
      return this.cornerPoint(this.x1 - r, this.y0 + r, -Math.PI / 2, s);
    }
    s -= this.arcLength;
    // Right straight, top→bottom.
    if (s <= this.straightHeight) {
      return new Vector2(this.x1, this.y0 + r + s);
    }
    s -= this.straightHeight;
    if (s <= this.arcLength) {
      return this.cornerPoint(this.x1 - r, this.y1 - r, 0, s);
    }
    s -= this.arcLength;
    // Bottom straight, right→left.
    if (s <= this.straightWidth) {
      return new Vector2(this.x1 - r - s, this.y1);
    }
    s -= this.straightWidth;
    if (s <= this.arcLength) {
      return this.cornerPoint(this.x0 + r, this.y1 - r, Math.PI / 2, s);
    }
    s -= this.arcLength;
    // Left straight, bottom→top.
    if (s <= this.straightHeight) {
      return new Vector2(this.x0, this.y1 - r - s);
    }
    s -= this.straightHeight;
    return this.cornerPoint(this.x0 + r, this.y0 + r, Math.PI, s);
  }

  /** A point `along` pixels into a quarter-circle corner starting at `startAngle`. */
  private cornerPoint(centerX: number, centerY: number, startAngle: number, along: number): Vector2 {
    const angle = startAngle + along / this.cornerRadius;
    return new Vector2(centerX + this.cornerRadius * Math.cos(angle), centerY + this.cornerRadius * Math.sin(angle));
  }

  /**
   * The wire outline: a rounded rectangle broken by the source on the left edge
   * and by each component along the top edge.
   */
  private createWireShape(
    topGaps: { left: number; right: number }[],
    sourceTopY: number,
    sourceBottomY: number,
  ): Shape {
    const r = this.cornerRadius;
    const shape = new Shape();

    // Top edge, in the pieces the components leave behind.
    let cursor = this.x0 + r;
    for (const gap of topGaps) {
      if (gap.left > cursor) {
        shape.moveTo(cursor, this.y0).lineTo(gap.left, this.y0);
      }
      cursor = Math.max(cursor, gap.right);
    }
    if (cursor < this.x1 - r) {
      shape.moveTo(cursor, this.y0).lineTo(this.x1 - r, this.y0);
    }

    // Right edge and bottom edge, corner to corner.
    shape
      .moveTo(this.x1 - r, this.y0)
      .arc(this.x1 - r, this.y0 + r, r, -Math.PI / 2, 0, false)
      .lineTo(this.x1, this.y1 - r)
      .arc(this.x1 - r, this.y1 - r, r, 0, Math.PI / 2, false)
      .lineTo(this.x0 + r, this.y1)
      .arc(this.x0 + r, this.y1 - r, r, Math.PI / 2, Math.PI, false)
      .lineTo(this.x0, sourceBottomY);

    // Left edge above the source.
    shape
      .moveTo(this.x0, sourceTopY)
      .lineTo(this.x0, this.y0 + r)
      .arc(this.x0 + r, this.y0 + r, r, Math.PI, 1.5 * Math.PI, false);

    return shape;
  }

  /**
   * Build one top-edge slot. A fixed slot draws a single part; a slot bound to a
   * `typeProperty` draws all three and shows the selected one (the visibility
   * binding is deferred so the caller can freeze layout bounds first).
   */
  private createSlot(slot: CircuitElementSlot, pendingVisibility: (() => void)[]): Node {
    if ("type" in slot) {
      return this.createElement(slot.type, slot);
    }
    const container = new Node();
    const types: CircuitElementType[] = ["resistor", "inductor", "capacitor"];
    for (const type of types) {
      const element = this.createElement(type, slot);
      container.addChild(element);
      pendingVisibility.push(() => {
        element.visibleProperty = new DerivedProperty([slot.typeProperty], (selected) => selected === type);
      });
    }
    return container;
  }

  /** One pictorial component, bound to whichever model Properties the slot supplies. */
  private createElement(type: CircuitElementType, slot: SlotProperties): CircuitElementNode {
    if (type === "resistor") {
      return new ResistorNode({
        terminalHalfWidth: ELEMENT_HALF_WIDTH,
        ...(slot.resistanceProperty ? { resistanceProperty: slot.resistanceProperty } : {}),
      });
    }
    if (type === "inductor") {
      return new InductorNode({
        terminalHalfWidth: ELEMENT_HALF_WIDTH,
        ...(slot.inductanceProperty
          ? {
              inductanceProperty: slot.inductanceProperty,
              inductanceRange: slot.inductanceRange ?? INDUCTANCE_RANGE_H,
            }
          : {}),
      });
    }

    const capacitorNode = new CapacitorNode({ terminalHalfWidth: ELEMENT_HALF_WIDTH });
    const capacitanceProperty = slot.capacitanceProperty;
    const range = slot.capacitanceRange;

    // Plate area grows with C, mapped geometrically across the range: these
    // ranges span two decades, and a linear map would leave everything below
    // the top decade pinned at the smallest plate.
    const updatePlateArea = (): void => {
      if (!(capacitanceProperty && range)) {
        return;
      }
      const capacitance = capacitanceProperty.value;
      capacitorNode.setPlateAreaFraction(
        range.min > 0 && range.max > range.min
          ? Math.log(capacitance / range.min) / Math.log(range.max / range.min)
          : (capacitance - range.min) / Math.max(range.getLength(), 1e-9),
      );
    };

    this.capacitors.push({
      node: capacitorNode,
      capacitanceProperty: capacitanceProperty,
      voltageProperty: slot.voltageProperty,
      updatePlateArea: updatePlateArea,
    });
    if (capacitanceProperty && range) {
      capacitanceProperty.link(() => updatePlateArea());
    }
    return capacitorNode;
  }
}
