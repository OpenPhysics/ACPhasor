/**
 * InductorNode.ts
 *
 * A pictorial inductor: copper wire wound around a ferrite core. When an
 * inductance Property is supplied the number of turns tracks it, so raising L
 * visibly adds windings the way a larger real inductor would have more.
 *
 * Three live decorations make v = L·di/dt visible, and they are meant to be read
 * against each other:
 *
 *   • {@link setFieldFraction} — flux arrows through the core track the current
 *     itself (B ∝ i): they grow, collapse, and reverse with i(t).
 *   • {@link setFluxState} — closed field loops around the coil, whose *radial
 *     motion* is the rate the field is changing. They drift outward as |i| grows
 *     and collapse inward as it falls.
 *   • {@link setEmfFraction} — polarity marks at the terminals track the induced
 *     voltage, which is that same rate of change.
 *
 * Because the field and its rate are 90° apart, the arrows stand tallest and the
 * loops hang motionless exactly when the ± marks vanish (current at its peak,
 * momentarily not changing), and the loops race inward or outward exactly as the
 * arrows flip through zero and the ± marks reach full strength (current changing
 * fastest). The lesson is that timing, so all three are drawn relative to their
 * own peak rather than on a shared absolute scale.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const inductor = new InductorNode( {
 *     inductanceProperty: model.inductanceProperty,
 *     inductanceRange: INDUCTANCE_RANGE_H,
 *   } );
 *   inductor.setFieldFraction( 0.8 );   // +80% of full field, pointing right
 *   inductor.setFluxState( 0.8 );       // loops sized and placed for that field
 *   inductor.setEmfFraction( -0.2 );    // left terminal −, weakly
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Dimension2, type Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { ArrowNode, MinusNode, PlusNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";
import {
  INDUCTOR_FLUX_INNER_RADIUS,
  INDUCTOR_FLUX_LOOP_COUNT,
  INDUCTOR_FLUX_LOOP_SPACING,
} from "../../ACPhasorConstants.js";
import { CircuitElementNode } from "./CircuitElementNode.js";

type InductorNodeSelfOptions = {
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
  terminalHalfWidth?: number | null;
  /** Inductance in henries; when given, the number of turns follows it. */
  inductanceProperty?: TReadOnlyProperty<number> | null;
  /** Range the inductance is mapped over; required for `inductanceProperty` to matter. */
  inductanceRange?: Range | null;
  /** Flux arrows drawn through the core at full field. */
  fluxArrowCount?: number;
  /** Closed field loops drawn around the coil at full field. */
  fluxLoopCount?: number;
  /** Radius of the innermost field loop, in pixels. */
  fluxInnerRadius?: number;
  /** Radial spacing between consecutive field loops, in pixels. */
  fluxLoopSpacing?: number;
};

export type InductorNodeOptions = InductorNodeSelfOptions;

/** Shortest / longest a flux arrow is drawn, in pixels. */
const MIN_FLUX_ARROW_LENGTH = 9;
const MAX_FLUX_ARROW_LENGTH = 22;

/**
 * How much of a field loop's radial position becomes vertical extent. A
 * solenoid's external field returns in long flat loops rather than circles, and
 * flattening them also keeps the decoration clear of the wire above the part.
 */
const FLUX_LOOP_ASPECT = 0.52;

/**
 * How much of a field loop's radial position becomes extra half-width, on top of
 * the coil's own half-length. Kept below 1 so the outermost loop stays inside the
 * footprint an element gets in a circuit diagram and cannot reach its neighbour.
 */
const FLUX_LOOP_WIDTH_GAIN = 0.55;

/** Length of the circulation arrowhead riding each loop, in pixels. */
const FLUX_LOOP_ARROW_LENGTH = 11;

/** Below this fraction of full field the loops are gone entirely. */
const FLUX_VISIBILITY_THRESHOLD = 0.04;

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

  /** Closed field loops around the coil, innermost first. */
  private readonly fluxLoops: Path[];
  private readonly fluxLoopArrows: ArrowNode[];
  private readonly fluxInnerRadius: number;
  private readonly fluxLoopSpacing: number;

  /** Releases the caller's inductance Property; undefined when none was given. */
  private unlinkInductance: (() => void) | undefined;

  public constructor(providedOptions?: InductorNodeOptions) {
    const options = optionize<InductorNodeOptions, InductorNodeSelfOptions, EmptySelfOptions>()(
      {
        coilLength: 62,
        coilRadius: 13,
        minTurns: 4,
        maxTurns: 9,
        fluxArrowCount: 3,
        fluxLoopCount: INDUCTOR_FLUX_LOOP_COUNT,
        fluxInnerRadius: INDUCTOR_FLUX_INNER_RADIUS,
        fluxLoopSpacing: INDUCTOR_FLUX_LOOP_SPACING,
        terminalHalfWidth: null,
        inductanceProperty: null,
        inductanceRange: null,
      },
      providedOptions,
    );

    super();

    this.coilLength = options.coilLength;
    this.coilRadius = options.coilRadius;
    this.fluxInnerRadius = options.fluxInnerRadius;
    this.fluxLoopSpacing = options.fluxLoopSpacing;
    const coreHalfLength = options.coilLength / 2 + 8;
    this.connectionHalfWidth = Math.max(coreHalfLength, options.terminalHalfWidth ?? coreHalfLength);

    // The field loops are the outermost thing this part draws, and a slot in the
    // circuit diagram freezes its footprint from what the part reports. Compute
    // the extent the loops can ever reach up front so the frozen bounds already
    // allow for it and the diagram never resizes mid-cycle.
    const maxLoopRadius = options.fluxInnerRadius + options.fluxLoopCount * options.fluxLoopSpacing;

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

    // Closed field loops around the coil, added before the core so the part
    // itself reads on top of its own field.
    this.fluxLoops = [];
    this.fluxLoopArrows = [];
    for (let i = 0; i < options.fluxLoopCount; i++) {
      const loop = new Path(null, {
        stroke: ACPhasorColors.magneticFieldColorProperty,
        lineWidth: 1.5,
        visible: false,
      });
      const arrow = new ArrowNode(0, 0, 1, 0, {
        fill: ACPhasorColors.magneticFieldColorProperty,
        stroke: null,
        tailWidth: 1.5,
        headWidth: 7,
        headHeight: 6,
        visible: false,
      });
      this.fluxLoops.push(loop);
      this.fluxLoopArrows.push(arrow);
      this.addChild(loop);
      this.addChild(arrow);
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

    // The letter clears the widest the field can ever get, so a rising current
    // never crowds it.
    this.addChild(
      new Text("L", {
        font: "italic bold 15px sans-serif",
        fill: ACPhasorColors.inductorColorProperty,
        centerX: 0,
        bottom: -Math.max(options.coilRadius + 6, maxLoopRadius * FLUX_LOOP_ASPECT + 5),
      }),
    );

    if (options.inductanceProperty && options.inductanceRange) {
      const range = options.inductanceRange;
      const inductanceProperty = options.inductanceProperty;
      const windingListener = (inductance: number): void => {
        const fraction = Math.max(0, Math.min(1, (inductance - range.min) / Math.max(range.getLength(), 1e-9)));
        // Turns scale with √L so the low end of the range still shows a change.
        this.setTurns(Math.round(options.minTurns + Math.sqrt(fraction) * (options.maxTurns - options.minTurns)));
      };
      inductanceProperty.link(windingListener);
      this.unlinkInductance = () => inductanceProperty.unlink(windingListener);
    } else {
      this.setTurns(options.minTurns + 2);
    }

    // Freeze the footprint at the largest the field can ever get. The loops are
    // hidden at low current and hidden children are out of bounds, so without
    // this the part — and the whole circuit diagram that froze its own bounds
    // from it — would breathe with the cycle.
    this.localBounds = this.localBounds.union(
      new Bounds2(
        -(options.coilLength / 2 + maxLoopRadius * FLUX_LOOP_WIDTH_GAIN),
        -maxLoopRadius * FLUX_LOOP_ASPECT,
        options.coilLength / 2 + maxLoopRadius * FLUX_LOOP_WIDTH_GAIN,
        maxLoopRadius * FLUX_LOOP_ASPECT,
      ),
    );
  }

  /**
   * Show the magnetic field around the coil as a signed fraction of full field.
   *
   * The loops are placed at radius `inner + (k + |f|)·spacing`, so their radial
   * position follows |i| directly and their radial *speed* is
   * `spacing · d|i|/dt`, which is proportional to |v_L| = |L·di/dt|. The field
   * therefore expands while the current climbs, hangs motionless at the peak
   * where di/dt — and the induced EMF — pass through zero, and collapses fastest
   * through the current's zero crossing where the EMF is strongest.
   *
   * Being a pure function of the present field, it survives pause, step-forward
   * and reset without drifting, which an integrated scroll would not.
   */
  public setFluxState(signedFraction: number): void {
    const magnitude = Math.min(1, Math.abs(signedFraction));
    // The external field returns the opposite way to the field inside the core,
    // so a positive current — arrows pointing right through the core — sends the
    // loops leftward over the top of the coil.
    const direction = signedFraction >= 0 ? -1 : 1;
    const count = this.fluxLoops.length;

    this.fluxLoops.forEach((loop, index) => {
      const arrow = this.fluxLoopArrows[index];
      if (magnitude < FLUX_VISIBILITY_THRESHOLD) {
        loop.visible = false;
        if (arrow) {
          arrow.visible = false;
        }
        return;
      }

      const radius = this.fluxInnerRadius + (index + magnitude) * this.fluxLoopSpacing;
      const halfHeight = radius * FLUX_LOOP_ASPECT;
      const halfWidth = this.coilLength / 2 + radius * FLUX_LOOP_WIDTH_GAIN;
      loop.shape = Shape.roundRect(-halfWidth, -halfHeight, 2 * halfWidth, 2 * halfHeight, halfHeight, halfHeight);

      // Loops arrive one at a time from the inside as the field builds, each
      // fading in over its own slice of the range so none of them pops.
      const arrival = Math.max(0, Math.min(1, magnitude * count - index));
      loop.opacity = arrival * (0.3 + 0.6 * magnitude);
      loop.visible = loop.opacity > 0.02;

      if (arrow) {
        // One circulation arrowhead per loop, riding the straight top run. They
        // are fanned out along it rather than stacked at the center, so four
        // nested loops read as four separate paths.
        const spread = count > 1 ? -0.5 + index / (count - 1) : 0;
        const centerX = halfWidth * spread;
        const half = (direction * FLUX_LOOP_ARROW_LENGTH) / 2;
        arrow.setTailAndTip(centerX - half, -halfHeight, centerX + half, -halfHeight);
        arrow.opacity = loop.opacity;
        arrow.visible = loop.visible;
      }
    });
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

  /** Let go of the inductance Property, which belongs to a longer-lived model. */
  public override dispose(): void {
    this.unlinkInductance?.();
    this.unlinkInductance = undefined;
    super.dispose();
  }
}
