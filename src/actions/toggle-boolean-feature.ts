import type {
  KeyDownEvent,
  WillAppearEvent,
  WillDisappearEvent
} from "@elgato/streamdeck";
import streamDeck, { SingletonAction } from "@elgato/streamdeck";

import {
  ToggleFeatureController,
  type BooleanFeatureClient,
  type FeatureStateTitles
} from "../toggle-feature-controller.js";

type EmptySettings = Record<string, never>;

export abstract class ToggleBooleanFeatureAction extends SingletonAction<EmptySettings> {
  readonly #controller: ToggleFeatureController;
  readonly #refreshTimer: NodeJS.Timeout;

  protected constructor(
    feature: BooleanFeatureClient,
    titles: FeatureStateTitles,
    refreshIntervalMs = 2500
  ) {
    super();
    this.#controller = new ToggleFeatureController(
      feature,
      titles,
      (key) => streamDeck.i18n.translate(key),
      streamDeck.logger
    );
    this.#refreshTimer = setInterval(
      () => void this.#controller.refreshAll(),
      refreshIntervalMs
    );
    this.#refreshTimer.unref();
  }

  public override async onWillAppear(ev: WillAppearEvent<EmptySettings>): Promise<void> {
    if (ev.action.isKey()) {
      await this.#controller.willAppear(ev.action);
    }
  }

  public override onWillDisappear(ev: WillDisappearEvent<EmptySettings>): void {
    this.#controller.willDisappear(ev.action.id);
  }

  public override async onKeyDown(ev: KeyDownEvent<EmptySettings>): Promise<void> {
    await this.#controller.keyDown(ev.action);
  }
}
