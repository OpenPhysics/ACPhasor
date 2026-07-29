/**
 * Interface for a property that can be plotted on a graph.
 * This allows the graph to be configured with any numeric property from the model.
 *
 * Ported from Resonance; the `subStepAccessor` high-resolution-data hook was
 * removed because ACPhasor's models are single-step (no RK4 sub-step integrator),
 * so the graph samples each property's current value once per frame.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";

export type PlottableProperty = {
  // The name to display in the selector (can be a string or a localized string property)
  name: string | TReadOnlyProperty<string>;

  // The property to read values from
  property: TReadOnlyProperty<number>;

  // Optional unit string for axis label (e.g., "V", "A", "Hz")
  unit?: string;
};
