/**
 * IntroModel.ts
 *
 * Framework model for the Intro screen — explore a single AC circuit component
 * (resistor, inductor, or capacitor) and its phasor. Physics state will be
 * added here; for now this is an empty TModel shell.
 */
import type { TModel } from "scenerystack/joist";

export class IntroModel implements TModel {
  public reset(): void {
    // TODO: reset Intro-screen Properties
  }

  public step(_dt: number): void {
    // TODO: advance Intro-screen physics
  }
}
