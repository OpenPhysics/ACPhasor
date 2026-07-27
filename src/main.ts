/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import ACPhasorColors from "./ACPhasorColors.js";
import { StringManager } from "./i18n/StringManager.js";
import { IntroScreen } from "./intro/IntroScreen.js";
import { ParallelRlcScreen } from "./parallel-rlc/ParallelRlcScreen.js";
import { ACPhasorPreferencesModel } from "./preferences/ACPhasorPreferencesModel.js";
import { ACPhasorPreferencesNode } from "./preferences/ACPhasorPreferencesNode.js";
import { SeriesRlcScreen } from "./series-rlc/SeriesRlcScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const screenNames = stringManager.getScreenNames();

  // Simulation-specific preferences; initial values come from acPhasorQueryParameters.
  const simPreferences = new ACPhasorPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new IntroScreen({
      name: screenNames.introStringProperty,
      tandem: Tandem.ROOT.createTandem("introScreen"),
      backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
    }),
    new SeriesRlcScreen({
      name: screenNames.seriesRlcStringProperty,
      tandem: Tandem.ROOT.createTandem("seriesRlcScreen"),
      backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
    }),
    new ParallelRlcScreen({
      name: screenNames.parallelRlcStringProperty,
      tandem: Tandem.ROOT.createTandem("parallelRlcScreen"),
      backgroundColorProperty: ACPhasorColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new ACPhasorPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
