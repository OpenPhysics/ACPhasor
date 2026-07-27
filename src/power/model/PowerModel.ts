/**
 * PowerModel.ts
 *
 * Framework model for the Power-in-AC-circuits screen — computes instantaneous
 * power p(t) = v(t)·i(t), its average (real) component, and the power factor
 * cos φ. Physics state will be added here.
 */
import type { TModel } from "scenerystack/joist";

export class PowerModel implements TModel {
  public reset(): void {
    // TODO: reset Power Properties
  }

  public step(_dt: number): void {
    // TODO: advance Power physics
  }
}
