import streamDeck from "@elgato/streamdeck";

import { ToggleControllerGameBarAction } from "./actions/toggle-controller-game-bar.js";
import {
  ToggleAutoHdrAction,
  ToggleWindowedOptimizationsAction
} from "./actions/toggle-directx-lab.js";
import { ToggleGameModeAction } from "./actions/toggle-game-mode.js";
import { TogglePointerPrecisionAction } from "./actions/toggle-pointer-precision.js";
import { TogglePowerPlanAction } from "./actions/toggle-power-plan.js";
import { TriggerXboxModeAction } from "./actions/trigger-xbox-mode.js";
import { WindowsNativeBridge } from "./platform/windows-native.js";
import { DirectXGamingSettingsClient } from "./services/directx-gaming-settings.js";
import { PointerPrecisionService } from "./services/pointer-precision.js";
import { PowerPlanService } from "./services/power-plan-service.js";
import { XboxFullScreenService } from "./services/xbox-full-screen.js";
import { WindowsRegistryClient } from "./windows-registry.js";

streamDeck.logger.setLevel("info");
streamDeck.logger.info("Iniciando Gaming Toggles for PC.");

const registry = new WindowsRegistryClient();
const native = new WindowsNativeBridge();
const directX = new DirectXGamingSettingsClient();
streamDeck.actions.registerAction(new ToggleGameModeAction(registry));
streamDeck.actions.registerAction(new ToggleControllerGameBarAction(registry));
streamDeck.actions.registerAction(
  new TriggerXboxModeAction(new XboxFullScreenService(native))
);
streamDeck.actions.registerAction(
  new TogglePointerPrecisionAction(new PointerPrecisionService(native))
);
streamDeck.actions.registerAction(new TogglePowerPlanAction(new PowerPlanService()));
streamDeck.actions.registerAction(new ToggleAutoHdrAction(directX));
streamDeck.actions.registerAction(new ToggleWindowedOptimizationsAction(directX));

await streamDeck.connect();
