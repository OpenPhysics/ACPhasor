/**
 * CircuitElementNode.ts
 *
 * Base class for the pictorial circuit elements that sit in a
 * {@link CircuitDiagramNode} slot — {@link ResistorNode}, {@link InductorNode},
 * and {@link CapacitorNode}. Each subclass draws a component that looks like the
 * real part rather than a schematic symbol, plus its own italic letter label.
 *
 * Coordinate convention: the element's local origin (0, 0) sits on the wire
 * line, centered on the body, and {@link connectionHalfWidth} is the distance
 * from that origin to each terminal. The diagram runs wire up to ±
 * `connectionHalfWidth` and lets the element bridge the gap however its shape
 * requires (the capacitor, for example, routes leads up and down to its plates).
 */

import { Node } from "scenerystack/scenery";

export abstract class CircuitElementNode extends Node {
  /** Distance in pixels from the element's center to each wire terminal. */
  public abstract readonly connectionHalfWidth: number;
}
