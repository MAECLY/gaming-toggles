export interface BooleanFeatureClient {
  readonly id: string;
  isEnabled(): Promise<boolean>;
  toggle(): Promise<boolean>;
}

export type FeatureStateTitles = {
  readonly disabled: string;
  readonly enabled: string;
  readonly unavailable?: string;
};

export interface FeatureActionTarget {
  readonly id: string;
  setState(state: number): Promise<void>;
  setTitle(title: string): Promise<void>;
  showAlert(): Promise<void>;
}

export interface FeatureLogger {
  info(message: string): void;
  error(message: string, error: unknown): void;
}

/** Keeps every visible copy of a boolean action synchronized with Windows. */
export class ToggleFeatureController {
  readonly #visibleActions = new Map<string, FeatureActionTarget>();
  readonly #feature: BooleanFeatureClient;
  readonly #titles: FeatureStateTitles;
  readonly #translate: (key: string) => string;
  readonly #logger: FeatureLogger;
  #refreshing = false;

  public constructor(
    feature: BooleanFeatureClient,
    titles: FeatureStateTitles,
    translate: (key: string) => string,
    logger: FeatureLogger
  ) {
    this.#feature = feature;
    this.#titles = titles;
    this.#translate = translate;
    this.#logger = logger;
  }

  public async willAppear(action: FeatureActionTarget): Promise<void> {
    this.#visibleActions.set(action.id, action);
    await this.#refreshAction(action);
  }

  public willDisappear(actionId: string): void {
    this.#visibleActions.delete(actionId);
  }

  public async keyDown(action: FeatureActionTarget): Promise<void> {
    try {
      const enabled = await this.#feature.toggle();
      await this.#renderAction(action, enabled);
      await this.refreshAll();
      this.#logger.info(
        `${this.#feature.id}=${enabled ? "enabled" : "disabled"} confirmed by Windows.`
      );
    } catch (error) {
      this.#logger.error(`Unable to toggle ${this.#feature.id}.`, error);
      await this.#renderUnavailable(action);
      await action.showAlert();
    }
  }

  public async refreshAll(): Promise<void> {
    if (this.#refreshing || this.#visibleActions.size === 0) {
      return;
    }

    this.#refreshing = true;
    try {
      const enabled = await this.#feature.isEnabled();
      await Promise.all(
        [...this.#visibleActions.values()].map((action) =>
          this.#renderAction(action, enabled)
        )
      );
    } catch (error) {
      this.#logger.error(`Unable to read ${this.#feature.id}.`, error);
      await Promise.all(
        [...this.#visibleActions.values()].map((action) =>
          this.#renderUnavailable(action)
        )
      );
    } finally {
      this.#refreshing = false;
    }
  }

  async #refreshAction(action: FeatureActionTarget): Promise<void> {
    try {
      const enabled = await this.#feature.isEnabled();
      await this.#renderAction(action, enabled);
    } catch (error) {
      this.#logger.error(`Unable to read ${this.#feature.id}.`, error);
      await this.#renderUnavailable(action);
      await action.showAlert();
    }
  }

  async #renderAction(action: FeatureActionTarget, enabled: boolean): Promise<void> {
    await action.setState(enabled ? 1 : 0);
    await action.setTitle(
      this.#translate(enabled ? this.#titles.enabled : this.#titles.disabled)
    );
  }

  async #renderUnavailable(action: FeatureActionTarget): Promise<void> {
    if (this.#titles.unavailable === undefined) return;
    await action.setState(2);
    await action.setTitle(this.#translate(this.#titles.unavailable));
  }
}
