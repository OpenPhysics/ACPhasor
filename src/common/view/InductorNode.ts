/**
 * InductorNode.ts
 *
 * A pictorial inductor: copper wire wound around a ferrite core. When an
 * inductance Property is supplied the number of turns tracks it, so raising L
 * visibly adds windings the way a larger real inductor would have more.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const inductor = new InductorNode( {
 *     inductanceProperty: model.inductanceProperty,
 *     inductanceRange: INDUCTANCE_RANGE_H,
 *   } );
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
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
};

export class InductorNode extends CircuitElementNode {
  public readonly connectionHalfWidth: number;

  private readonly coilLength: number;
  private readonly coilRadius: number;
  private readonly windings: Node;
  private drawnTurns = 0;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      coilLength: 62,
      coilRadius: 13,
      minTurns: 4,
      maxTurns: 9,
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
