# Model - AC Phasor

Educator-facing description of the intended physics. **Framework only** — equations
and interactive behavior are not implemented yet.

## Goal

Help learners connect time-domain AC signals on R, L, and C to rotating phasors in
the complex plane, for single components and for series / parallel RLC circuits.

## Screens

1. **Intro** — one component at a time (resistor, inductor, or capacitor) driven by
   a sinusoidal AC source; voltage and current phasors.
2. **Series RLC** — R, L, and C in series; impedance phasors and the resultant.
3. **Parallel RLC** — R, L, and C in parallel; branch currents / admittance phasors.

## Planned relations (SI)

- Resistor: \(Z_R = R\), current in phase with voltage.
- Inductor: \(Z_L = j\omega L\), current lags voltage by \(90^\circ\).
- Capacitor: \(Z_C = 1/(j\omega C)\), current leads voltage by \(90^\circ\).
- Series: \(Z = Z_R + Z_L + Z_C\).
- Parallel: \(Y = 1/Z_R + 1/Z_L + 1/Z_C\), \(Z = 1/Y\).

Fill in ranges, defaults, and simplifications as the model is built.
