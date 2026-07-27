/**
 * SeriesRlcScreen.ts
 *
 * Series RLC screen — resistor, inductor, and capacitor in series with an AC
 * source, plus the combined impedance phasor diagram. Framework only.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "../ACPhasorColors.js";
import { createSeriesRlcIcon } from "../common/ACPhasorScreenIcons.js";
import { SeriesRlcModel } from "./model/SeriesRlcModel.js";
import { SeriesRlcKeyboardHelpContent } from "./view/SeriesRlcKeyboardHelpContent.js";
import { SeriesRlcScreenView } from "./view/SeriesRlcScreenView.js";

type SeriesRlcScreenOptions = ScreenOptions & { tandem: Tandem };

export class SeriesRlcScreen extends Screen<SeriesRlcModel, SeriesRlcScreenView> {
  public constructor(options: SeriesRlcScreenOptions) {
    super(
      () => new SeriesRlcModel(),
      (model) =>
        new SeriesRlcScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SeriesRlcScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SeriesRlcKeyboardHelpContent(),
          homeScreenIcon: createSeriesRlcIcon(),
          navigationBarIcon: createSeriesRlcIcon(),
        },
        options,
      ),
    );
  }
}
