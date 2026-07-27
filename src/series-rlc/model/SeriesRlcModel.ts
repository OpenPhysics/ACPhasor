/**
 * SeriesRlcModel.ts
 *
 * Framework model for the Series RLC screen — resistor, inductor, and
 * capacitor in series with an AC source. Physics state will be added here.
 */
import type { TModel } from "scenerystack/joist";

export class SeriesRlcModel implements TModel {
  public reset(): void {
    // TODO: reset Series RLC Properties
  }

  public step(_dt: number): void {
    // TODO: advance Series RLC physics
  }
}
