/**
 * ResonanceModel.ts
 *
 * Framework model for the Resonance & frequency-sweep screen — the series RLC
 * circuit swept across driving frequency. Reuses the driven-oscillator /
 * resonance-peak math (mechanical m, k, b → electrical L, C, R). Physics state
 * will be added here.
 */
import type { TModel } from "scenerystack/joist";

export class ResonanceModel implements TModel {
  public reset(): void {
    // TODO: reset Resonance Properties
  }

  public step(_dt: number): void {
    // TODO: advance Resonance frequency-sweep physics
  }
}
