/**
 * PhasorDiagramNode.ts
 *
 * The complex-plane backdrop for phasor arrows: real (horizontal) and imaginary
 * (vertical) axes through a central origin, an optional square grid, and an
 * optional reference circle. It builds and exposes the
 * {@link ModelViewTransform2} that {@link PhasorNode}s should draw against, so a
 * screen can lay out its diagram once and share the mapping.
 *
 * The node's local origin (0, 0) is its top-left corner; the complex-plane
 * origin sits at the node's center. Position the whole node with the usual
 * layout accessors (`center`, `left`, …).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const diagram = new PhasorDiagramNode( { modelRadius: 12, viewRadius: 120 } );
 *   diagram.addChild( new PhasorNode( vProperty, diagram.modelViewTransform, { … } ) );
 */

import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, Node, Path, type TColor, Text } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";

type SelfOptions = {
  /** Half-extent of the plane in model units (the value mapped to the diagram edge). */
  modelRadius?: number;
  /** Half-extent of the plane in view pixels (center to edge). */
  viewRadius?: number;
  /** Grid line spacing in model units; 0 hides the grid. */
  gridSpacing?: number;
  /** Radius of a reference circle in model units; 0 hides it. */
  referenceCircleRadius?: number;
  /** Axis (and axis-label) color. */
  axisColor?: TColor;
  /** Grid line color. */
  gridColor?: TColor;
  /** Labels for the +real and +imaginary axis ends; null hides them. */
  realAxisLabel?: string | null;
  imaginaryAxisLabel?: string | null;
};

export class PhasorDiagramNode extends Node {
  /** Maps model (real, imaginary) coordinates to view pixels (y inverted). */
  public readonly modelViewTransform: ModelViewTransform2;

  /** Half-extent in view pixels; the diagram spans 2·viewRadius in each dimension. */
  public readonly viewRadius: number;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      modelRadius: 10,
      viewRadius: 120,
      gridSpacing: 0,
      referenceCircleRadius: 0,
      axisColor: ACPhasorColors.textColorProperty as TColor,
      gridColor: ACPhasorColors.panelBorderColorProperty as TColor,
      // Math notation, deliberately not localized: "Re" and "Im" are the
      // international symbols for the two axes of the complex plane, the same
      // way "V" and "I" label the phasors drawn on it. Pass null to drop them,
      // or a different string for a screen that wants other axis names.
      realAxisLabel: "Re" as string | null,
      imaginaryAxisLabel: "Im" as string | null,
      ...providedOptions,
    };

    super();

    this.viewRadius = options.viewRadius;

    const center = new Vector2(options.viewRadius, options.viewRadius);
    const pixelsPerUnit = options.viewRadius / options.modelRadius;

    // Inverted Y so +imaginary points up the screen, matching a math complex plane.
    this.modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      Vector2.ZERO,
      center,
      pixelsPerUnit,
    );

    // Grid (drawn first, underneath everything).
    if (options.gridSpacing > 0) {
      const gridShape = new Shape();
      for (let u = options.gridSpacing; u <= options.modelRadius + 1e-9; u += options.gridSpacing) {
        const dx = u * pixelsPerUnit;
        // Vertical lines at ±u, horizontal lines at ±u.
        gridShape.moveTo(center.x + dx, 0).lineTo(center.x + dx, 2 * options.viewRadius);
        gridShape.moveTo(center.x - dx, 0).lineTo(center.x - dx, 2 * options.viewRadius);
        gridShape.moveTo(0, center.y + dx).lineTo(2 * options.viewRadius, center.y + dx);
        gridShape.moveTo(0, center.y - dx).lineTo(2 * options.viewRadius, center.y - dx);
      }
      this.addChild(new Path(gridShape, { stroke: options.gridColor, lineWidth: 0.5 }));
    }

    // Reference circle (e.g. the amplitude a rotating phasor traces).
    if (options.referenceCircleRadius > 0) {
      this.addChild(
        new Circle(options.referenceCircleRadius * pixelsPerUnit, {
          center: center,
          stroke: options.gridColor,
          lineWidth: 1,
          lineDash: [4, 4],
        }),
      );
    }

    // Axes: double-headed arrows spanning the full diagram.
    const axisOptions = {
      fill: options.axisColor,
      stroke: options.axisColor,
      doubleHead: true,
      tailWidth: 1,
      headWidth: 8,
      headHeight: 8,
    };
    this.addChild(new ArrowNode(0, center.y, 2 * options.viewRadius, center.y, axisOptions));
    this.addChild(new ArrowNode(center.x, 2 * options.viewRadius, center.x, 0, axisOptions));

    // Axis labels near the positive ends.
    if (options.realAxisLabel !== null) {
      this.addChild(
        new Text(options.realAxisLabel, {
          font: "italic 14px sans-serif",
          fill: options.axisColor,
          rightCenter: new Vector2(2 * options.viewRadius - 4, center.y - 12),
        }),
      );
    }
    if (options.imaginaryAxisLabel !== null) {
      this.addChild(
        new Text(options.imaginaryAxisLabel, {
          font: "italic 14px sans-serif",
          fill: options.axisColor,
          leftTop: new Vector2(center.x + 6, 2),
        }),
      );
    }
  }
}
