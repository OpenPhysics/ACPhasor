/**
 * CapacitorNode.ts
 *
 * A pictorial parallel-plate capacitor in the style of PhET's Capacitor Lab:
 * Basics — two metal plates drawn in perspective, wired into the circuit from
 * above and below, with the accumulated charge shown as + and − symbols spread
 * over the plate surfaces and electric-field arrows in the gap between them.
 *
 * Two quantities drive the picture, and both mirror the physics:
 *
 *   • {@link setPlateAreaFraction} — plate size follows the capacitance
 *     (C = εA/d), so turning the capacitance control up grows the plates.
 *   • {@link setChargeFraction} — the number of charge symbols follows the
 *     plate charge q = C·v, and their sign follows its polarity, so over one AC
 *     cycle the plates fill, empty, and refill with the opposite sign.
 *
 * The local origin (0, 0) sits on the wire line, midway between the plates; the
 * node draws its own leads out to ±{@link connectionHalfWidth}, where the
 * diagram's wire meets it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const capacitor = new CapacitorNode();
 *   capacitor.setPlateAreaFraction( 0.4 );   // 0 = smallest plates, 1 = largest
 *   capacitor.setChargeFraction( 0.8 );      // +80% charge: top plate positive
 */

import { Dimension2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, MinusNode, PlusNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { CircuitElementNode } from "./CircuitElementNode.js";

type SelfOptions = {
  /** Plate width in pixels at zero / full plate-area fraction. */
  minPlateWidth?: number;
  maxPlateWidth?: number;
  /** Thickness of a plate (its visible front edge) in pixels. */
  plateThickness?: number;
  /** Gap between the facing plate surfaces in pixels. */
  plateSeparation?: number;
  /** Perspective offset of the back edge of a plate, in pixels (right and up). */
  depthX?: number;
  depthY?: number;
  /** Charge symbols on each plate at full charge. */
  maxCharges?: number;
  /** Field arrows drawn in the gap at full charge. */
  maxFieldLines?: number;
  /** Distance from the center to each terminal; the leads stretch to reach it. */
  terminalHalfWidth?: number;
};

// Fraction of the plate surface kept clear of charge symbols on each side.
const CHARGE_MARGIN = 0.14;

// Closest the charge symbols are allowed to sit, in pixels. It caps how many a
// plate can hold, so a small plate reads as "full" instead of as a solid block.
const MIN_CHARGE_PITCH = 10;

export class CapacitorNode extends CircuitElementNode {
  public readonly connectionHalfWidth: number;

  private readonly plateThickness: number;
  private readonly plateSeparation: number;
  private readonly depthX: number;
  private readonly depthY: number;
  private readonly maxCharges: number;
  private readonly minPlateWidth: number;
  private readonly maxPlateWidth: number;

  private readonly leads: Path;
  private readonly topPlateFaces: Path[];
  private readonly bottomPlateFaces: Path[];
  private readonly topPlusNodes: Node[] = [];
  private readonly topMinusNodes: Node[] = [];
  private readonly bottomPlusNodes: Node[] = [];
  private readonly bottomMinusNodes: Node[] = [];
  private readonly fieldArrows: ArrowNode[] = [];

  private plateWidth: number;
  private chargeCount = 0;
  private topPlatePositive = true;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      minPlateWidth: 40,
      maxPlateWidth: 76,
      plateThickness: 7,
      plateSeparation: 44,
      depthX: 26,
      depthY: 15,
      maxCharges: 16,
      maxFieldLines: 5,
      ...providedOptions,
    };

    super();

    this.minPlateWidth = options.minPlateWidth;
    this.maxPlateWidth = options.maxPlateWidth;
    this.plateThickness = options.plateThickness;
    this.plateSeparation = options.plateSeparation;
    this.depthX = options.depthX;
    this.depthY = options.depthY;
    this.maxCharges = options.maxCharges;
    this.plateWidth = options.minPlateWidth;
    // Wide enough that the plates' perspective overhang stays inside the footprint.
    const naturalHalfWidth = options.maxPlateWidth / 2 + options.depthX + 2;
    this.connectionHalfWidth = Math.max(naturalHalfWidth, options.terminalHalfWidth ?? naturalHalfWidth);

    // Leads: down from the wire on the left to the top plate, and from the
    // bottom plate back up to the wire on the right.
    this.leads = new Path(null, {
      stroke: ACPhasorColors.wireColorProperty,
      lineWidth: 3,
      lineCap: "round",
      lineJoin: "round",
    });
    this.addChild(this.leads);

    // Bottom plate, then the field it shares with the top plate, then the top
    // plate — so the nearer plate paints over the gap contents.
    this.bottomPlateFaces = this.createPlateFaces();
    for (const face of this.bottomPlateFaces) {
      this.addChild(face);
    }
    const bottomCharges = new Node();
    this.addChild(bottomCharges);

    const fieldLayer = new Node();
    this.addChild(fieldLayer);

    this.topPlateFaces = this.createPlateFaces();
    for (const face of this.topPlateFaces) {
      this.addChild(face);
    }
    const topCharges = new Node();
    this.addChild(topCharges);

    // Pre-build every charge symbol once; updates only toggle visibility and
    // move them, so an animating cycle allocates nothing.
    const symbolSize = new Dimension2(8, 2.4);
    for (let i = 0; i < options.maxCharges; i++) {
      const makeSymbols = (target: Node, plusList: Node[], minusList: Node[]): void => {
        const plus = new PlusNode({ size: symbolSize, fill: ACPhasorColors.positiveChargeColorProperty });
        const minus = new MinusNode({ size: symbolSize, fill: ACPhasorColors.negativeChargeColorProperty });
        plus.visible = false;
        minus.visible = false;
        plusList.push(plus);
        minusList.push(minus);
        target.addChild(plus);
        target.addChild(minus);
      };
      makeSymbols(topCharges, this.topPlusNodes, this.topMinusNodes);
      makeSymbols(bottomCharges, this.bottomPlusNodes, this.bottomMinusNodes);
    }

    for (let i = 0; i < options.maxFieldLines; i++) {
      const arrow = new ArrowNode(0, 0, 0, 1, {
        fill: ACPhasorColors.electricFieldColorProperty,
        stroke: null,
        tailWidth: 2,
        headWidth: 8,
        headHeight: 8,
        visible: false,
      });
      this.fieldArrows.push(arrow);
      fieldLayer.addChild(arrow);
    }

    this.addChild(
      new Text("C", {
        font: "italic bold 15px sans-serif",
        fill: ACPhasorColors.capacitorColorProperty,
        centerX: 0,
        bottom: this.topPlateTopY - this.depthY - 5,
      }),
    );

    this.updateGeometry();
    this.updateCharges();
  }

  /** Y of the top plate's front-top edge. */
  private get topPlateTopY(): number {
    return -this.plateSeparation / 2 - this.plateThickness;
  }

  /** Y of the bottom plate's front-top edge. */
  private get bottomPlateTopY(): number {
    return this.plateSeparation / 2;
  }

  /**
   * Set the plate size from a 0–1 fraction: 0 draws the smallest plates, 1 the
   * largest. The drawn footprint never exceeds `maxPlateWidth`, so the
   * surrounding circuit layout stays put however big the capacitance gets.
   */
  public setPlateAreaFraction(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    const width = this.minPlateWidth + clamped * (this.maxPlateWidth - this.minPlateWidth);
    if (Math.abs(width - this.plateWidth) < 0.25) {
      return;
    }
    this.plateWidth = width;
    this.updateGeometry();
    this.updateCharges();
  }

  /**
   * Set the plate charge as a signed fraction of full scale: +1 means the top
   * plate (the one wired to the left terminal) carries the maximum positive
   * charge, −1 the maximum negative charge.
   */
  public setChargeFraction(signedFraction: number): void {
    const magnitude = Math.max(0, Math.min(1, Math.abs(signedFraction)));
    const count = Math.round(magnitude * this.maxCharges);
    const positive = signedFraction >= 0;
    if (count === this.chargeCount && positive === this.topPlatePositive) {
      return;
    }
    this.chargeCount = count;
    this.topPlatePositive = positive;
    this.updateCharges();
  }

  /** Three Paths — top face, front face, right face — that make up one plate. */
  private createPlateFaces(): Path[] {
    const faceColors = [
      ACPhasorColors.plateTopColorProperty,
      ACPhasorColors.plateFrontColorProperty,
      ACPhasorColors.plateSideColorProperty,
    ];
    return faceColors.map(
      (fill) =>
        new Path(null, {
          fill: fill,
          stroke: ACPhasorColors.plateEdgeColorProperty,
          lineWidth: 0.75,
        }),
    );
  }

  /** Rebuild plate outlines and leads for the current plate width. */
  private updateGeometry(): void {
    const halfWidth = this.plateWidth / 2;
    const thickness = this.plateThickness;
    const { depthX, depthY } = this;

    const setPlateShapes = (faces: Path[], topY: number): void => {
      const [top, front, side] = faces;
      if (!(top && front && side)) {
        return;
      }
      top.shape = new Shape()
        .moveTo(-halfWidth, topY)
        .lineTo(halfWidth, topY)
        .lineTo(halfWidth + depthX, topY - depthY)
        .lineTo(-halfWidth + depthX, topY - depthY)
        .close();
      front.shape = Shape.rect(-halfWidth, topY, this.plateWidth, thickness);
      side.shape = new Shape()
        .moveTo(halfWidth, topY)
        .lineTo(halfWidth + depthX, topY - depthY)
        .lineTo(halfWidth + depthX, topY - depthY + thickness)
        .lineTo(halfWidth, topY + thickness)
        .close();
    };
    setPlateShapes(this.topPlateFaces, this.topPlateTopY);
    setPlateShapes(this.bottomPlateFaces, this.bottomPlateTopY);

    const topLeadY = this.topPlateTopY + thickness / 2;
    const bottomLeadY = this.bottomPlateTopY + thickness / 2;
    this.leads.shape = new Shape()
      .moveTo(-this.connectionHalfWidth, 0)
      .lineTo(-this.connectionHalfWidth, topLeadY)
      .lineTo(-halfWidth, topLeadY)
      .moveTo(halfWidth, bottomLeadY)
      .lineTo(this.connectionHalfWidth, bottomLeadY)
      .lineTo(this.connectionHalfWidth, 0);
  }

  /** Re-place the charge symbols and field arrows for the current charge. */
  private updateCharges(): void {
    this.layoutPlateCharges(
      this.topPlateTopY,
      this.topPlatePositive ? this.topPlusNodes : this.topMinusNodes,
      this.topPlatePositive ? this.topMinusNodes : this.topPlusNodes,
    );
    this.layoutPlateCharges(
      this.bottomPlateTopY,
      this.topPlatePositive ? this.bottomMinusNodes : this.bottomPlusNodes,
      this.topPlatePositive ? this.bottomPlusNodes : this.bottomMinusNodes,
    );
    this.updateFieldArrows();
  }

  /**
   * Spread `chargeCount` symbols over one plate's top surface in a grid that
   * follows the surface's perspective, hiding the unused ones.
   */
  private layoutPlateCharges(plateTopY: number, shown: Node[], hidden: Node[]): void {
    for (const node of hidden) {
      node.visible = false;
    }
    for (const node of shown) {
      node.visible = false;
    }
    // Grid proportioned to the surface so the symbols stay evenly spaced as the
    // plate grows: more columns across the width than rows into the depth, and
    // never packed tighter than MIN_CHARGE_PITCH.
    const depthLength = Math.hypot(this.depthX, this.depthY);
    const usableWidth = this.plateWidth * (1 - 2 * CHARGE_MARGIN);
    const usableDepth = depthLength * (1 - 2 * CHARGE_MARGIN);
    const columnLimit = Math.max(1, Math.floor(usableWidth / MIN_CHARGE_PITCH));
    const rowLimit = Math.max(1, Math.floor(usableDepth / MIN_CHARGE_PITCH) + 1);

    const count = Math.min(this.chargeCount, columnLimit * rowLimit);
    if (count === 0) {
      return;
    }

    const aspect = this.plateWidth / Math.max(depthLength, 1);
    const columns = Math.max(1, Math.min(count, columnLimit, Math.round(Math.sqrt(count * aspect))));
    const rows = Math.ceil(count / columns);

    const halfWidth = this.plateWidth / 2;
    const span = 1 - 2 * CHARGE_MARGIN;
    for (let k = 0; k < count; k++) {
      const node = shown[k];
      if (!node) {
        break;
      }
      const column = k % columns;
      const row = Math.floor(k / columns);
      const alongWidth = CHARGE_MARGIN + ((column + 0.5) / columns) * span;
      const alongDepth = CHARGE_MARGIN + ((row + 0.5) / rows) * span;
      node.center = new Vector2(
        -halfWidth + alongWidth * this.plateWidth + alongDepth * this.depthX,
        plateTopY - alongDepth * this.depthY,
      );
      node.visible = true;
    }
  }

  /** Field arrows in the gap: more of them, and more opaque, as charge builds. */
  private updateFieldArrows(): void {
    const fraction = this.chargeCount / this.maxCharges;
    const visibleCount = Math.min(this.fieldArrows.length, Math.ceil(fraction * this.fieldArrows.length));
    const gapTop = -this.plateSeparation / 2;
    const gapBottom = this.plateSeparation / 2;
    // The field points from the positive plate to the negative one.
    const tailY = this.topPlatePositive ? gapTop : gapBottom;
    const tipY = this.topPlatePositive ? gapBottom : gapTop;

    this.fieldArrows.forEach((arrow, index) => {
      if (index >= visibleCount) {
        arrow.visible = false;
        return;
      }
      const x = -this.plateWidth / 2 + ((index + 0.5) / visibleCount) * this.plateWidth;
      arrow.setTailAndTip(x, tailY, x, tipY);
      arrow.opacity = 0.35 + 0.5 * fraction;
      arrow.visible = true;
    });
  }
}
