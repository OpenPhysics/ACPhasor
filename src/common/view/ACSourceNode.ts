/**
 * ACSourceNode.ts
 *
 * The AC voltage source on the left edge of a {@link CircuitDiagramNode}: the
 * standard circle-with-a-sine symbol, dressed as a physical part with a metal
 * ring and terminal markings. The terminal signs are live — call
 * {@link setVoltage} each frame and the + / − marks swap as the source reverses
 * polarity, with a halo that brightens with the instantaneous voltage.
 *
 * The local origin (0, 0) is the center of the body; leads run vertically to
 * ±{@link connectionHalfHeight}, where the diagram's wire meets it.
 */

import { Dimension2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import { MinusNode, PlusNode } from "scenerystack/scenery-phet";
import ACPhasorColors from "../../ACPhasorColors.js";

type SelfOptions = {
  /** Radius of the source body in pixels. */
  radius?: number;
};

export class ACSourceNode extends Node {
  /** Distance from the center to each terminal, in pixels. */
  public readonly connectionHalfHeight: number;

  private readonly halo: Circle;
  private readonly topPlus: Node;
  private readonly topMinus: Node;
  private readonly bottomPlus: Node;
  private readonly bottomMinus: Node;

  public constructor(providedOptions?: SelfOptions) {
    const options = {
      radius: 19,
      ...providedOptions,
    };

    super();

    const radius = options.radius;
    this.connectionHalfHeight = radius;

    // Halo brightens with |v(t)| so the source visibly "drives" the loop.
    this.halo = new Circle(radius + 5, {
      fill: ACPhasorColors.chargeColorProperty,
      opacity: 0,
    });
    this.addChild(this.halo);

    this.addChild(
      new Circle(radius, {
        fill: ACPhasorColors.panelBackgroundColorProperty,
        stroke: ACPhasorColors.wireColorProperty,
        lineWidth: 3,
      }),
    );
    this.addChild(
      new Circle(radius - 4, {
        stroke: ACPhasorColors.coreColorProperty,
        lineWidth: 1,
      }),
    );

    // One full sine cycle across the body.
    const half = radius - 6;
    const sine = new Shape();
    const samples = 24;
    for (let i = 0; i <= samples; i++) {
      const fraction = i / samples;
      const x = -half + fraction * 2 * half;
      const y = -Math.sin(fraction * 2 * Math.PI) * (radius - 9);
      i === 0 ? sine.moveTo(x, y) : sine.lineTo(x, y);
    }
    this.addChild(new Path(sine, { stroke: ACPhasorColors.wireColorProperty, lineWidth: 2, lineCap: "round" }));

    // Terminal polarity marks, just outside the body next to each lead.
    const symbolSize = new Dimension2(11, 3);
    const markX = radius - 1;
    const createMark = (node: Node, y: number): Node => {
      node.center = new Vector2(markX, y);
      node.visible = false;
      this.addChild(node);
      return node;
    };
    const plusFill = ACPhasorColors.positiveChargeColorProperty;
    const minusFill = ACPhasorColors.negativeChargeColorProperty;
    this.topPlus = createMark(new PlusNode({ size: symbolSize, fill: plusFill }), -radius - 8);
    this.topMinus = createMark(new MinusNode({ size: symbolSize, fill: minusFill }), -radius - 8);
    this.bottomPlus = createMark(new PlusNode({ size: symbolSize, fill: plusFill }), radius + 8);
    this.bottomMinus = createMark(new MinusNode({ size: symbolSize, fill: minusFill }), radius + 8);
  }

  /**
   * Show the source's instantaneous polarity.
   *
   * @param instantaneous - v(t), signed.
   * @param amplitude - peak voltage, used to normalize the halo.
   */
  public setVoltage(instantaneous: number, amplitude: number): void {
    const positive = instantaneous >= 0;
    this.topPlus.visible = positive;
    this.bottomMinus.visible = positive;
    this.topMinus.visible = !positive;
    this.bottomPlus.visible = !positive;

    const fraction = amplitude > 1e-9 ? Math.min(1, Math.abs(instantaneous) / amplitude) : 0;
    this.halo.opacity = 0.3 * fraction;
  }
}
