/**
 * PhasorChainNode.ts
 *
 * Draws an ordered set of phasors that are known to sum to a resultant, in
 * either of the two arrangements that make different things obvious:
 *
 *   • **head to tail** — each phasor starts where the previous one ended, so the
 *     run walks out to the tip of the resultant and closes the figure. This is
 *     the arrangement that makes a sum *visible*: in a series RLC circuit
 *     V_R + V_L + V_C = V is Kirchhoff's voltage law, and drawing it this way
 *     turns the law into a shape you can point at.
 *   • **from a common origin** — every phasor radiates from the center, which is
 *     the arrangement for comparing magnitudes and phase angles directly against
 *     each other.
 *
 * A Property switches between them, so one checkbox can show a learner the same
 * four quantities from both points of view. The resultant, when given, always
 * starts at the origin: in head-to-tail mode it is the closing side of the
 * figure, and in common-origin mode it sits alongside its own parts.
 *
 * Labels are `RichText`, so `V<sub>R</sub>` renders as a real subscript.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const chain = new PhasorChainNode(
 *     [ { property: displayVR, fill: resistorColor,  label: "V<sub>R</sub>" },
 *       { property: displayVL, fill: inductorColor,  label: "V<sub>L</sub>" },
 *       { property: displayVC, fill: capacitorColor, label: "V<sub>C</sub>" } ],
 *     diagram.modelViewTransform,
 *     {
 *       tipToTailProperty: tipToTailProperty,
 *       resultant: { property: displayV, fill: textColor, label: "V" },
 *     },
 *   );
 *   diagram.addChild( chain );
 */

import { DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Node, type TColor } from "scenerystack/scenery";
import type { Phasor } from "../model/Phasor.js";
import { PhasorNode, type PhasorNodeOptions } from "./PhasorNode.js";

/** One phasor in the chain, with the color and label it is drawn under. */
export type PhasorChainLink = {
  property: TReadOnlyProperty<Phasor>;
  fill: TColor;
  /** RichText markup, so subscripts work: `"V<sub>R</sub>"`. */
  label?: string | null;
  /** Extra arrow options for this link (line width, head size, …). */
  arrowOptions?: PhasorNodeOptions;
};

type PhasorChainNodeSelfOptions = {
  /**
   * True draws the links head to tail; false draws them all from the origin.
   * Omit for a chain that is always head to tail.
   */
  tipToTailProperty?: TReadOnlyProperty<boolean> | null;
  /**
   * The sum of the links, drawn from the origin in both arrangements. In
   * head-to-tail mode it closes the figure onto the last link's tip.
   */
  resultant?: PhasorChainLink | null;
};

export type PhasorChainNodeOptions = PhasorChainNodeSelfOptions;

export class PhasorChainNode extends Node {
  /** Properties this node created, and so is responsible for disposing. */
  private readonly ownedProperties: { dispose(): void }[] = [];
  private readonly phasorNodes: PhasorNode[] = [];

  public constructor(
    links: PhasorChainLink[],
    modelViewTransform: ModelViewTransform2,
    providedOptions?: PhasorChainNodeOptions,
  ) {
    const options = optionize<PhasorChainNodeOptions, PhasorChainNodeSelfOptions, EmptySelfOptions>()(
      {
        tipToTailProperty: null as TReadOnlyProperty<boolean> | null,
        resultant: null as PhasorChainLink | null,
      },
      providedOptions,
    );

    super();

    const tipToTailProperty = options.tipToTailProperty;

    // Each link starts at the running sum of the ones before it — which is the
    // origin for the first link, and for every link when the chain is collapsed
    // back to a common origin. The sum is accumulated one link at a time rather
    // than recomputed from the whole prefix, so every Property here has fixed
    // arity however long the chain gets. This is the seed of that running sum;
    // the first link's tail never moves off it.
    const originProperty = new Property(Vector2.ZERO);
    this.ownedProperties.push(originProperty);

    let previousTail: TReadOnlyProperty<Vector2> = originProperty;
    let previousLink: PhasorChainLink | null = null;

    for (const link of links) {
      let tailProperty: TReadOnlyProperty<Vector2> | null = null;
      if (previousLink) {
        const earlierTail: TReadOnlyProperty<Vector2> = previousTail;
        const earlier: TReadOnlyProperty<Phasor> = previousLink.property;
        tailProperty = tipToTailProperty
          ? new DerivedProperty(
              [tipToTailProperty, earlier, earlierTail],
              (chained, earlierPhasor, earlierTailValue) =>
                chained ? earlierTailValue.plus(earlierPhasor.toVector2()) : Vector2.ZERO,
            )
          : new DerivedProperty([earlier, earlierTail], (earlierPhasor, earlierTailValue) =>
              earlierTailValue.plus(earlierPhasor.toVector2()),
            );
        this.ownedProperties.push(tailProperty);
      }

      const phasorNode = new PhasorNode(link.property, modelViewTransform, {
        fill: link.fill,
        labelString: link.label ?? null,
        tailProperty: tailProperty,
        ...link.arrowOptions,
      });
      this.phasorNodes.push(phasorNode);
      this.addChild(phasorNode);

      previousTail = tailProperty ?? originProperty;
      previousLink = link;
    }

    // The resultant is added last so it reads on top where it overlaps a link —
    // at resonance the reactive links cancel and everything lands on one line.
    if (options.resultant) {
      const resultant = options.resultant;
      const resultantNode = new PhasorNode(resultant.property, modelViewTransform, {
        fill: resultant.fill,
        labelString: resultant.label ?? null,
        ...resultant.arrowOptions,
      });
      this.phasorNodes.push(resultantNode);
      this.addChild(resultantNode);
    }
  }

  public override dispose(): void {
    for (const phasorNode of this.phasorNodes) {
      phasorNode.dispose();
    }
    // Only the Properties this node created are disposed; the link Properties
    // themselves belong to the caller.
    for (const owned of this.ownedProperties) {
      owned.dispose();
    }
    super.dispose();
  }
}
