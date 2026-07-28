/**
 * PhaseArcNode.ts
 *
 * The wedge between two phasors, with the angle it spans written inside it.
 *
 * A phase difference is a number in a readout and an angle in a diagram, and the
 * two are easy to hold apart in your head longer than you should. This node
 * closes that gap: it sweeps an arc from one angle to another and labels it, so
 * "the current lags the voltage by 90°" is a shape on the dial rather than a
 * claim in a panel.
 *
 * The arc always takes the short way round, and its sign follows the sweep: a
 * positive label means the second angle leads the first.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   diagram.addChild( new PhaseArcNode(
 *     voltageAngleProperty,      // from
 *     currentAngleProperty,      // to
 *     diagram.modelViewTransform,
 *     { modelRadius: 0.45, stroke: ACPhasorColors.textColorProperty },
 *   ) );
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Node, Path, RichText, type TColor } from "scenerystack/scenery";

type SelfOptions = {
  /** Radius of the arc in model units, measured from the complex-plane origin. */
  modelRadius?: number;
  /** Arc color; the label follows it. */
  stroke?: TColor;
  /** Line width of the arc in view pixels. */
  lineWidth?: number;
  /** Font of the angle label. */
  labelFont?: string;
  /** Whether to write the angle in degrees inside the wedge. */
  showLabel?: boolean;
  /**
   * Angles closer than this (in radians) hide the node entirely: a wedge of a
   * couple of degrees is a smudge, and hiding it makes "in phase" read as a
   * real state rather than as a rendering artifact.
   */
  minimumAngle?: number;
};

export class PhaseArcNode extends Node {
  private readonly updateMultilink: ReturnType<typeof Multilink.multilink>;

  public constructor(
    fromAngleProperty: TReadOnlyProperty<number>,
    toAngleProperty: TReadOnlyProperty<number>,
    modelViewTransform: ModelViewTransform2,
    providedOptions?: SelfOptions,
  ) {
    const options = {
      modelRadius: 0.45,
      stroke: "black" as TColor,
      lineWidth: 1.5,
      labelFont: "italic 13px sans-serif",
      showLabel: true,
      minimumAngle: (2 * Math.PI) / 180,
      ...providedOptions,
    };

    super();

    const arcPath = new Path(null, {
      stroke: options.stroke,
      lineWidth: options.lineWidth,
    });
    this.addChild(arcPath);

    const labelNode = options.showLabel ? new RichText("", { font: options.labelFont, fill: options.stroke }) : null;
    if (labelNode) {
      this.addChild(labelNode);
    }

    // The transform inverts y, so a counter-clockwise sweep in the model is a
    // clockwise one on screen; going through view coordinates for the endpoints
    // and the label keeps that conversion in one place.
    const viewOrigin = modelViewTransform.modelToViewPosition(Vector2.ZERO);
    const viewRadius = Math.abs(modelViewTransform.modelToViewDeltaX(options.modelRadius));

    this.updateMultilink = Multilink.multilink([fromAngleProperty, toAngleProperty], (fromAngle, toAngle) => {
      // Signed sweep, wrapped into (−π, π] so the arc takes the short way round.
      let sweep = toAngle - fromAngle;
      sweep = Math.atan2(Math.sin(sweep), Math.cos(sweep));

      if (Math.abs(sweep) < options.minimumAngle) {
        this.visible = false;
        return;
      }
      this.visible = true;

      const shape = new Shape();
      const pointAt = (angle: number): Vector2 =>
        viewOrigin.plus(new Vector2(viewRadius * Math.cos(angle), -viewRadius * Math.sin(angle)));
      const start = pointAt(fromAngle);
      shape.moveToPoint(start);
      // Sample the sweep rather than using Shape.arc: the y inversion flips the
      // sense of the sweep flag, and sampling sidesteps getting that backwards.
      const steps = Math.max(2, Math.ceil((Math.abs(sweep) / Math.PI) * 32));
      for (let i = 1; i <= steps; i++) {
        shape.lineToPoint(pointAt(fromAngle + (sweep * i) / steps));
      }
      arcPath.shape = shape;

      if (labelNode) {
        const degrees = (sweep * 180) / Math.PI;
        labelNode.string = `${degrees > 0 ? "+" : ""}${degrees.toFixed(0)}°`;
        // Sit just outside the middle of the wedge, where it clears both arrows.
        labelNode.center = viewOrigin.plus(
          new Vector2(
            (viewRadius + 14) * Math.cos(fromAngle + sweep / 2),
            -(viewRadius + 14) * Math.sin(fromAngle + sweep / 2),
          ),
        );
      }
    });
  }

  public override dispose(): void {
    this.updateMultilink.dispose();
    super.dispose();
  }
}
