import type {
  PointerPrecisionNativeApi,
  PointerPrecisionState
} from "../platform/windows-native.js";

export class PointerPrecisionService {
  readonly #native: PointerPrecisionNativeApi;
  #pending: Promise<PointerPrecisionState> = Promise.resolve({
    enabled: false,
    threshold1: 0,
    threshold2: 0,
    acceleration: 0
  });

  public constructor(native: PointerPrecisionNativeApi) {
    this.#native = native;
  }

  public getState(): Promise<PointerPrecisionState> {
    return this.#native.getPointerPrecision();
  }

  public async setEnabled(enabled: boolean): Promise<PointerPrecisionState> {
    const state = await this.#native.setPointerPrecisionEnabled(enabled);
    if (state.enabled !== enabled) {
      throw new Error("Windows did not confirm the requested pointer precision state.");
    }
    return state;
  }

  public toggle(): Promise<PointerPrecisionState> {
    const next = this.#pending
      .catch(() => this.#native.getPointerPrecision())
      .then(async () => {
        const current = await this.#native.getPointerPrecision();
        return this.setEnabled(!current.enabled);
      });

    this.#pending = next;
    return next;
  }
}
