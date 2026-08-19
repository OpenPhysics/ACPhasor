/**
 * axisScale.ts
 *
 * The two pieces of axis arithmetic every chart in the sim shares: choosing a
 * round full-scale / tick spacing, and printing a value against that spacing
 * with just enough decimals.
 *
 * Both exist so that a chart which rescales itself — an auto-scaled
 * oscilloscope trace, a resonance curve whose peak moves with R — settles on
 * numbers a reader recognizes. Snapping to the 1–2–5 sequence means the axis
 * holds still through small changes and always lands on round labels when it
 * does move; continuous scaling would leave the ticks twitching at every frame.
 */

/**
 * Round a positive value up to the next entry of the 1–2–5 sequence
 * (…, 0.2, 0.5, 1, 2, 5, 10, …). Used both for auto-scaled full scales and for
 * tick spacing, so axis labels are always round numbers.
 */
export function niceStep(value: number): number {
  if (!(value > 0 && Number.isFinite(value))) {
    return 1;
  }
  const decade = 10 ** Math.floor(Math.log10(value));
  const normalized = value / decade; // in [1, 10)
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * decade;
}

/**
 * Apply a new model range and a new tick spacing in the order that never asks
 * bamboo's TickLabelSet to fill a large range with a leftover small spacing.
 *
 * TickLabelSet.update runs on every range or spacing change. Expanding the
 * range first (a capacitor current jumping from ~0.1 A to thousands of amps)
 * would generate tens of thousands of labels and overflow the stack. Shrink
 * the range first when the span falls, so the leftover large spacing simply
 * produces fewer ticks.
 */
export function applyChartRescale(
  oldSpan: number,
  newSpan: number,
  setRange: () => void,
  setSpacing: () => void,
): void {
  if (newSpan >= oldSpan) {
    setSpacing();
    setRange();
  } else {
    setRange();
    setSpacing();
  }
}

/**
 * Format an axis value with just enough decimals to distinguish neighbouring
 * ticks, trimming trailing zeros so labels stay short ("2.5", "0.05", "10").
 */
export function formatTickValue(value: number, spacing: number): string {
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(spacing)) + 1));
  return Number(value.toFixed(decimals)).toString();
}
