import type { KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";

import { XboxFullScreenService } from "../services/xbox-full-screen.js";

type EmptySettings = Record<string, never>;

/**
 * Triggers Windows' official Win+F11 command. Windows exposes no supported API
 * for reading whether the full-screen experience is currently active, so this
 * action is intentionally rendered as a command rather than a false ON/OFF.
 */
@action({ UUID: "com.maecly.gamingtoggles.xbox-mode" })
export class TriggerXboxModeAction extends SingletonAction<EmptySettings> {
  readonly #service: XboxFullScreenService;

  public constructor(service: XboxFullScreenService) {
    super();
    this.#service = service;
  }

  public override async onWillAppear(ev: WillAppearEvent<EmptySettings>): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setState(0);
    const probe = await this.#service.probe();
    await ev.action.setTitle(streamDeck.i18n.translate(
      probe.available ? "Xbox Mode\nWIN+F11" : "Xbox Mode\nSETUP"
    ));
  }

  public override async onKeyDown(ev: KeyDownEvent<EmptySettings>): Promise<void> {
    if (!ev.action.isKey()) return;
    try {
      await this.#service.trigger();
      await ev.action.showOk();
      streamDeck.logger.info("Win+F11 Xbox full-screen command accepted by Windows.");
    } catch (error) {
      streamDeck.logger.error("Unable to trigger Windows Xbox full-screen experience.", error);
      await ev.action.showAlert();
    }
  }
}
