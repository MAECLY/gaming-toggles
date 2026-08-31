import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  WindowsNativeBridge,
  parsePointerPrecisionState,
  type WindowsNativeOperation
} from "../src/platform/windows-native.ts";

describe("WindowsNativeBridge", () => {
  it("parses all supported pointer acceleration levels", () => {
    assert.deepEqual(
      parsePointerPrecisionState("threshold1=6 threshold2=10 acceleration=0\r\n"),
      { enabled: false, threshold1: 6, threshold2: 10, acceleration: 0 }
    );
    assert.deepEqual(
      parsePointerPrecisionState("threshold1=4 threshold2=8 acceleration=2"),
      { enabled: true, threshold1: 4, threshold2: 8, acceleration: 2 }
    );
  });

  it("rejects malformed or unsupported native state", () => {
    assert.throws(
      () => parsePointerPrecisionState("MouseSpeed REG_SZ 1"),
      /invalid pointer precision state/
    );
    assert.throws(
      () => parsePointerPrecisionState("threshold1=6 threshold2=10 acceleration=3"),
      /outside the supported range/
    );
    assert.throws(
      () => parsePointerPrecisionState("threshold1=-1 threshold2=10 acceleration=1"),
      /outside the supported range/
    );
  });

  it("uses the native read and write operations without changing thresholds in TypeScript", async () => {
    const calls: Array<{ operation: WindowsNativeOperation; enabled?: boolean }> = [];
    const bridge = new WindowsNativeBridge(async (operation, enabled) => {
      calls.push({ operation, enabled });
      return enabled === false
        ? "threshold1=7 threshold2=11 acceleration=0"
        : "threshold1=7 threshold2=11 acceleration=1";
    });

    assert.equal((await bridge.getPointerPrecision()).enabled, true);
    assert.deepEqual(await bridge.setPointerPrecisionEnabled(false), {
      enabled: false,
      threshold1: 7,
      threshold2: 11,
      acceleration: 0
    });
    assert.deepEqual(calls, [
      { operation: "get-pointer-precision", enabled: undefined },
      { operation: "set-pointer-precision", enabled: false }
    ]);
  });

  it("requires all four Win+F11 input events to be accepted", async () => {
    const accepted = new WindowsNativeBridge(async () => "sent=4\r\n");
    await accepted.sendXboxFullScreenShortcut();

    const partial = new WindowsNativeBridge(async () => "sent=3\r\n");
    await assert.rejects(
      partial.sendXboxFullScreenShortcut(),
      /complete Win\+F11 shortcut/
    );
  });

  it("keeps pointer changes in the Win32 API and broadcasts the update", async () => {
    const source = await readFile(
      new URL(
        "../native/windows-settings-notifier/WindowsSettingsNotifier.cs",
        import.meta.url
      ),
      "utf8"
    );

    assert.match(source, /SPI_GETMOUSE/);
    assert.match(source, /SPI_SETMOUSE/);
    assert.match(source, /SPIF_UPDATEINIFILE\s*\|\s*SPIF_SENDCHANGE/);
    assert.match(source, /int\[\]\s+values\s*=\s*ReadMouseParameters\(\)/);
    assert.match(source, /values\[2\]\s*=\s*enabled\s*\?\s*1\s*:\s*0/);
    assert.doesNotMatch(source, /values\[0\]\s*=/);
    assert.doesNotMatch(source, /values\[1\]\s*=/);
  });
});
