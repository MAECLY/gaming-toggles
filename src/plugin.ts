import streamDeck from "@elgato/streamdeck";

import { ToggleControllerGameBarAction } from "./actions/toggle-controller-game-bar.js";
import { ToggleGameModeAction } from "./actions/toggle-game-mode.js";
import { WindowsRegistryClient } from "./windows-registry.js";

streamDeck.logger.setLevel("info");
streamDeck.logger.info("Iniciando Gaming Toggles for PC.");

const registry = new WindowsRegistryClient();
streamDeck.actions.registerAction(new ToggleGameModeAction(registry));
streamDeck.actions.registerAction(new ToggleControllerGameBarAction(registry));

await streamDeck.connect();
