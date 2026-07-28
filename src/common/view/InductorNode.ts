/**
 * InductorNode.ts
 *
 * A pictorial inductor: copper wire wound around a ferrite core. When an
 * inductance Property is supplied the number of turns tracks it, so raising L
 * visibly adds windings the way a larger real inductor would have more.
 *
 * Two live decorations make v = L·di/dt visible, and they are meant to be read
 * against each other:
 *
 *   • {@link setFieldFraction} — flux arrows through the core track the current
 *     itself (B ∝ i): they grow, collapse, and reverse with i(t).
 *   • {@link setEmfFraction} — polarity marks at the terminals track the induced
 *     voltage, which is the *rate of change* of that flux.
 *
 * Because the two are 90° apart, the arrows stand tallest exactly when the ±
 * marks vanish (current at its peak, momentarily not changing) and the ± marks
 * are strongest exactly as the arrows flip through zero (current changing
 * fastest). The lesson is the timing, so both are drawn relative to their own
 * peak rather than on a shared absolute scale.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const inductor = new InductorNode( {
 *     inductanceProperty: model.inductanceProperty,
 *     inductanceRange: INDUCTANCE_RANGE_H,
 *   } );
 *   inductor.setFieldFraction( 0.8 );   // +80% of full field, pointing right
 *   inductor.setEmfFraction( -0.2 );    // left terminal −, weakly
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, type Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { ArrowNode, MinusNode, PlusNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import { CircuitElementNode } from "./CircuitElementNode.js";

type SelfOptions = {
  /** Length of the wound section in pixels. */
  coilLength?: number;
  /** Radius of a winding in pixels (half the coil's height). */
  coilRadius?: number;
  /** Fewest / most windings drawn, mapped across the inductance range. */
  minTurns?: number;
  maxTurns?: number;
  /**
   * Distance from the center to each terminal. When it exceeds the core, the
   * part grows leads to reach it — this is how every element in a slot ends up
   * with the same footprint.
   */
  terminalHalfWidth?: number;
  /** Inductance in henries; when given, the number of turns follows it. */
  inductanceProperty?: TReadOnlyProperty<number>;
  /** Range the inductance is mapped over; required for `inductanceProperty` to matter. */
  inductanceRange?: Range;
  /** Flux arrows drawn through the core at full field. */
  fluxArrowCount?: number;
};

/** Shortest / longest a flux arrow is drawn, in pixels. */
const MIN_FLUX_ARROW_LENGTH = 9;
const MAX_FLUX_ARROW_LENGTH = 22;

export class InductorNode extends CircuitElementNode {
  public readonly connectionHalfWidth: number;

  private readonly coilLength: number;
  private readonly coilRadius: number;
  private readonly windings: Node;
  private drawnTurns = 0;

  private readonly fluxArrows: ArrowNode[];
  private readonly leftPlus: Node;
  private readonly leftMinus: Node;
  private readonly rightPlus: Node;
  private readonly rightMinus: Node;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      coilLength: 62,
      coilRadius: 13,
      minTurns: 4,
      maxTurns: 9,
      fluxArrowCount: 3,
      ...providedOptions,
    };

    super();

    this.coilLength = options.coilLength;
    this.coilRadius = options.coilRadius;
    const coreHalfLength = options.coilLength / 2 + 8;
    this.connectionHalfWidth = Math.max(coreHalfLength, options.terminalHalfWidth ?? coreHalfLength);

    // Leads out to the terminals, drawn behind the core.
    if (this.connectionHalfWidth > coreHalfLength) {
      this.addChild(
        new Path(
          new Shape()
            .moveTo(-this.connectionHalfWidth, 0)
            .lineTo(-coreHalfLength, 0)
            .moveTo(coreHalfLength, 0)
            .lineTo(this.connectionHalfWidth, 0),
          { stroke: ACPhasorColors.wireColorProperty, lineWidth: 3, lineCap: "round" },
        ),
      );
    }

    // Ferrite core the wire is wound around, poking out at both ends.
    const coreHeight = 11;
    this.addChild(
      new Rectangle(-coreHalfLength, -coreHeight / 2, 2 * coreHalfLength, coreHeight, {
        cornerRadius: 3,
        fill: ACPhasorColors.coreColorProperty,
        stroke: ACPhasorColors.plateEdgeColorProperty,
        lineWidth: 1,
      }),
    );

    this.windings = new Node();
    this.addChild(this.windings);

    // Flux arrows threading the core, drawn over the windings so they stay
    // legible where a turn crosses the axis.
    this.fluxArrows = [];
    for (let i = 0; i < options.fluxArrowCount; i++) {
      const arrow = new ArrowNode(0, 0, 1, 0, {
        fill: ACPhasorColors.magneticFieldColorProperty,
        stroke: null,
        tailWidth: 3,
        headWidth: 9,
        headHeight: 8,
        visible: false,
      });
      this.fluxArrows.push(arrow);
      this.addChild(arrow);
    }

    // Induced-EMF polarity marks at the terminals. Positive v_L makes the left
    // terminal — the one positive current flows into — the + terminal.
    const symbolSize = new Dimension2(11, 3);
    const markX = (coreHalfLength + this.connectionHalfWidth) / 2;
    const markY = -options.coilRadius - 1;
    const createMark = (node: Node, x: number): Node => {
      node.center = new Vector2(x, markY);
      node.visible = false;
      this.addChild(node);
      return node;
    };
    const plusFill = ACPhasorColors.positiveChargeColorProperty;
    const minusFill = ACPhasorColors.negativeChargeColorProperty;
    this.leftPlus = createMark(new PlusNode({ size: symbolSize, fill: plusFill }), -markX);
    this.leftMinus = createMark(new MinusNode({ size: symbolSize, fill: minusFill }), -markX);
    this.rightPlus = createMark(new PlusNode({ size: symbolSize, fill: plusFill }), markX);
    this.rightMinus = createMark(new MinusNode({ size: symbolSize, fill: minusFill }), markX);

    this.addChild(
      new Text("L", {
        font: "italic bold 15px sans-serif",
        fill: ACPhasorColors.inductorColorProperty,
        centerX: 0,
        bottom: -options.coilRadius - 6,
      }),
    );

    if (options.inductanceProperty && options.inductanceRange) {
      const range = options.inductanceRange;
      options.inductanceProperty.link((inductance) => {
        const fraction = Math.max(0, Math.min(1, (inductance - range.min) / Math.max(range.getLength(), 1e-9)));
        // Turns scale with √L so the low end of the range still shows a change.
        this.setTurns(Math.round(options.minTurns + Math.sqrt(fraction) * (options.maxTurns - options.minTurns)));
      });
    } else {
      this.setTurns(options.minTurns + 2);
    }
  }

  /**
   * Show the magnetic field in the core as a signed fraction of full field:
   * +1 draws the longest arrows pointing right (the direction positive current
   * enters the element), −1 the same pointing left, 0 no field at all.
   */
  public setFieldFraction(signedFraction: number): void {
    const magnitude = Math.min(1, Math.abs(signedFraction));
    const direction = signedFraction >= 0 ? 1 : -1;
    const length = MIN_FLUX_ARROW_LENGTH + magnitude * (MAX_FLUX_ARROW_LENGTH - MIN_FLUX_ARROW_LENGTH);
    const spacing = this.coilLength / this.fluxArrows.length;

    this.fluxArrows.forEach((arrow, index) => {
      // Below this the arrow is a smudge; hiding it makes the zero crossing —
      // the instant the field reverses — read as a real event.
      if (magnitude < 0.06) {
        arrow.visible = false;
        return;
      }
      const centerX = -this.coilLength / 2 + spacing * (index + 0.5);
      arrow.setTailAndTip(centerX - (direction * length) / 2, 0, centerX + (direction * length) / 2, 0);
      arrow.opacity = 0.35 + 0.65 * magnitude;
      arrow.visible = true;
    });
  }

  /**
   * Show the induced EMF as a signed fraction of full scale: +1 marks the left
   * terminal + and the right terminal −, at full strength. The marks fade with
   * |v_L|, so they disappear at the peaks of the current and are strongest as it
   * races through zero.
   */
  public setEmfFraction(signedFraction: number): void {
    const magnitude = Math.min(1, Math.abs(signedFraction));
    const positive = signedFraction >= 0;
    const visible = magnitude > 0.06;

    this.leftPlus.visible = visible && positive;
    this.rightMinus.visible = visible && positive;
    this.leftMinus.visible = visible && !positive;
    this.rightPlus.visible = visible && !positive;

    const opacity = 0.25 + 0.75 * magnitude;
    for (const mark of [this.leftPlus, this.leftMinus, this.rightPlus, this.rightMinus]) {
      mark.opacity = opacity;
    }
  }

  /** Redraw the winding with the given number of turns (no-op if unchanged). */
  private setTurns(turns: number): void {
    if (turns === this.drawnTurns) {
      return;
    }
    this.drawnTurns = turns;
    this.windings.removeAllChildren();

    const spacing = this.coilLength / turns;
    const turnRadiusX = spacing * 0.62;
    for (let i = 0; i < turns; i++) {
      const centerX = -this.coilLength / 2 + spacing * (i + 0.5);
      const loop = new Shape().ellipse(centerX, 0, turnRadiusX, this.coilRadius, 0);
      // Copper wire, with a lit edge on the near side of each turn.
      this.windings.addChild(new Path(loop, { stroke: ACPhasorColors.coilColorProperty, lineWidth: 4.5 }));
      this.windings.addChild(
        new Path(loop, {
          stroke: ACPhasorColors.coilHighlightColorProperty,
          lineWidth: 1.4,
        }),
      );
    }
  }
}
