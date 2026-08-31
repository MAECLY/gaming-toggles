import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PointerPrecisionService } from "../src/services/pointer-precision.ts";
import type {
  PointerPrecisionNativeApi,
  PointerPrecisionState
} from "../src/platform/windows-native.ts";

function createNative(
  initial: PointerPrecisionState
): PointerPrecisionNativeApi & { writes: boolean[] } {
  let state = initial;
  const writes: boolean[] = [];
  return {
    writes,
    async getPointerPrecision() {
      return state;
    },
    async setPointerPrecisionEnabled(enabled) {
      writes.push(enabled);
      state = {
        ...state,
        enabled,
        acceleration: enabled ? 1 : 0
      };
      return state;
    }
  };
}

describe("PointerPrecisionService", () => {
  it("reads and toggles pointer precision while preserving both thresholds", async () => {
    const native = createNative({
      enabled: true,
      threshold1: 6,
      threshold2: 10,
      acceleration: 2
    });
    const service = new PointerPrecisionService(native);

    assert.deepEqual(await service.toggle(), {
      enabled: false,
      threshold1: 6,
      threshold2: 10,
      acceleration: 0
    });
    assert.deepEqual(native.writes, [false]);
  });

  it("serializes simultaneous presses so two toggles return to the original state", async () => {
    const native = createNative({
      enabled: false,
      threshold1: 6,
      threshold2: 10,
      acceleration: 0
    });
    const service = new PointerPrecisionService(native);

    const states = await Promise.all([service.toggle(), service.toggle()]);

    assert.deepEqual(states.map((state) => state.enabled), [true, false]);
    assert.deepEqual(native.writes, [true, false]);
  });

  it("rejects a native write when Windows does not confirm the requested state", async () => {
    const native = createNative({
      enabled: false,
      threshold1: 6,
      threshold2: 10,
      acceleration: 0
    });
    native.setPointerPrecisionEnabled = async () => ({
      enabled: false,
      threshold1: 6,
      threshold2: 10,
      acceleration: 0
    });

    await assert.rejects(
      new PointerPrecisionService(native).setEnabled(true),
      /did not confirm/
    );
  });
});
