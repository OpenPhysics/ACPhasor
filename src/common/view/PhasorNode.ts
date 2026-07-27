/**
 * PhasorNode.ts
 *
 * Draws a single {@link Phasor} as an arrow from the origin of the complex
 * plane, staying in sync with a `Property<Phasor>`. The mapping from model
 * coordinates (real, imaginary) to view pixels is supplied as a
 * {@link ModelViewTransform2}, so the same node works on any screen's diagram.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
 *     Vector2.ZERO, diagramCenter, pixelsPerUnit );
 *   const voltageArrow = new PhasorNode( model.voltagePhasorProperty, modelViewTransform, {
 *     fill: ACPhasorColors.resistorColorProperty,
 *     labelString: "V",
 *   } );
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Node, type TColor, Text } from "scenerystack/scenery";
import { ArrowNode, type ArrowNodeOptions } from "scenerystack/scenery-phet";
import type { Phasor } from "../model/Phasor.js";

type SelfOptions = {
  /** Fill color of the arrow (and its label). */
  fill?: TColor;
  /** Optional short label (e.g. "V", "I") drawn near the arrow tip. */
  labelString?: string | TReadOnlyProperty<string> | null;
  /** Font used for the label. */
  labelFont?: string;
  /** Explicit offset in view pixels from the tip to the label center; null auto-places it past the tip. */
  labelOffset?: Vector2 | null;
};

export type PhasorNodeOptions = SelfOptions & Omit<ArrowNodeOptions, "fill" | "stroke">;

export class PhasorNode extends Node {
  private readonly arrowNode: ArrowNode;
  private readonly phasorProperty: TReadOnlyProperty<Phasor>;
  private readonly updateListener: () => void;

  public constructor(
    phasorProperty: TReadOnlyProperty<Phasor>,
    modelViewTransform: ModelViewTransform2,
    providedOptions?: PhasorNodeOptions,
  ) {
    const options = {
      fill: "black" as TColor,
      labelString: null as string | TReadOnlyProperty<string> | null,
      labelFont: "bold 16px sans-serif",
      labelOffset: null as Vector2 | null,
      tailWidth: 3,
      headWidth: 12,
      headHeight: 12,
      ...providedOptions,
    };

    super();

    this.phasorProperty = phasorProperty;

    // The phasor tail is always pinned to the complex-plane origin.
    const viewOrigin = modelViewTransform.modelToViewPosition(Vector2.ZERO);

    this.arrowNode = new ArrowNode(viewOrigin.x, viewOrigin.y, viewOrigin.x, viewOrigin.y, {
      fill: options.fill,
      stroke: options.fill,
      tailWidth: options.tailWidth,
      headWidth: options.headWidth,
      headHeight: options.headHeight,
      // Keep a proportional head even when the arrow is short.
      isHeadDynamic: true,
      fractionalHeadHeight: 0.5,
    });
    this.addChild(this.arrowNode);

    let labelNode: Text | null = null;
    if (options.labelString !== null) {
      labelNode = new Text(options.labelString, {
        font: options.labelFont,
        fill: options.fill,
      });
      this.addChild(labelNode);
    }

    const labelOffset = options.labelOffset;

    this.updateListener = () => {
      const tip = modelViewTransform.modelToViewPosition(phasorProperty.value.toVector2());
      this.arrowNode.setTailAndTip(viewOrigin.x, viewOrigin.y, tip.x, tip.y);

      if (labelNode) {
        if (labelOffset) {
          labelNode.center = tip.plus(labelOffset);
        } else {
          // Nudge the label just beyond the tip, along the arrow direction.
          const direction = tip.minus(viewOrigin);
          const push = direction.magnitude > 1e-6 ? direction.normalized().timesScalar(14) : Vector2.ZERO;
          labelNode.center = tip.plus(push);
        }
      }
    };
    phasorProperty.link(this.updateListener);
  }

  public override dispose(): void {
    this.phasorProperty.unlink(this.updateListener);
    super.dispose();
  }
}

/**
 * Convenience: a derived Property that projects the tip of a phasor to view
 * coordinates, handy when other nodes must track the same point.
 */
export function phasorTipViewProperty(
  phasorProperty: TReadOnlyProperty<Phasor>,
  modelViewTransform: ModelViewTransform2,
): TReadOnlyProperty<Vector2> {
  return new DerivedProperty([phasorProperty], (phasor) => modelViewTransform.modelToViewPosition(phasor.toVector2()));
}
