/**
 * ParallelRlcScreen.ts
 *
 * Parallel RLC screen — resistor, inductor, and capacitor in parallel with an
 * AC source, plus the admittance / current phasor diagram. Framework only.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import { createParallelRlcIcon } from "../common/ACPhasorScreenIcons.js";
import { ParallelRlcModel } from "./model/ParallelRlcModel.js";
import { ParallelRlcKeyboardHelpContent } from "./view/ParallelRlcKeyboardHelpContent.js";
import { ParallelRlcScreenView } from "./view/ParallelRlcScreenView.js";

type ParallelRlcScreenOptions = ScreenOptions & { tandem: Tandem };

export class ParallelRlcScreen extends Screen<ParallelRlcModel, ParallelRlcScreenView> {
  public constructor(options: ParallelRlcScreenOptions) {
    super(
      () => new ParallelRlcModel(),
      (model) =>
        new ParallelRlcScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ParallelRlcScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ParallelRlcKeyboardHelpContent(),
          homeScreenIcon: createParallelRlcIcon(),
          navigationBarIcon: createParallelRlcIcon(),
        },
        options,
      ),
    );
  }
}
