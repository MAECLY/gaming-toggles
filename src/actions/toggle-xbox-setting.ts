import type {
  KeyDownEvent,
  WillAppearEvent,
  WillDisappearEvent
} from "@elgato/streamdeck";
import streamDeck, { SingletonAction } from "@elgato/streamdeck";

import type { RegistryClient, XboxSetting } from "../windows-registry.js";
import {
  ToggleSettingController,
  type LocalizedStateTitles
} from "../toggle-setting-controller.js";

type EmptySettings = Record<string, never>;

export abstract class ToggleXboxSettingAction extends SingletonAction<EmptySettings> {
  readonly #controller: ToggleSettingController;
  readonly #refreshTimer: NodeJS.Timeout;

  protected constructor(
    registry: RegistryClient,
    setting: XboxSetting,
    titles: LocalizedStateTitles
  ) {
    super();
    this.#controller = new ToggleSettingController(
      registry,
      setting,
      titles,
      (key) => streamDeck.i18n.translate(key),
      streamDeck.logger
    );
    this.#refreshTimer = setInterval(
      () => void this.#controller.refreshAll(),
      2500
    );
    this.#refreshTimer.unref();
  }

  public override async onWillAppear(ev: WillAppearEvent<EmptySettings>): Promise<void> {
    if (!ev.action.isKey()) {
      return;
    }
    await this.#controller.willAppear(ev.action);
  }

  public override onWillDisappear(ev: WillDisappearEvent<EmptySettings>): void {
    this.#controller.willDisappear(ev.action.id);
  }

  public override async onKeyDown(ev: KeyDownEvent<EmptySettings>): Promise<void> {
    await this.#controller.keyDown(ev.action);
  }
}
