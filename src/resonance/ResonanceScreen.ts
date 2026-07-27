/**
 * ResonanceScreen.ts
 *
 * Resonance & frequency-sweep screen — the series RLC circuit driven across a
 * range of frequencies, showing the phase triangle collapsing flat at
 * resonance alongside impedance-vs-frequency and current-vs-frequency curves.
 * Framework only. (Shares the driven-oscillator math with the Resonance sim.)
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import { createResonanceIcon } from "../common/ACPhasorScreenIcons.js";
import { ResonanceModel } from "./model/ResonanceModel.js";
import { ResonanceKeyboardHelpContent } from "./view/ResonanceKeyboardHelpContent.js";
import { ResonanceScreenView } from "./view/ResonanceScreenView.js";

type ResonanceScreenOptions = ScreenOptions & { tandem: Tandem };

export class ResonanceScreen extends Screen<ResonanceModel, ResonanceScreenView> {
  public constructor(options: ResonanceScreenOptions) {
    super(
      () => new ResonanceModel(),
      (model) =>
        new ResonanceScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ResonanceScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ResonanceKeyboardHelpContent(),
          homeScreenIcon: createResonanceIcon(),
          navigationBarIcon: createResonanceIcon(),
        },
        options,
      ),
    );
  }
}
