import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTO_HDR_VALUE_NAME,
  InvalidDirectXGlobalSettingError,
  WINDOWED_OPTIMIZATIONS_VALUE_NAME,
  readDirectXGlobalBoolean,
  writeDirectXGlobalBoolean
} from "../src/labs/directx-global-settings.ts";

describe("DirectXUserGlobalSettings parser", () => {
  it("uses the requested default when a setting is absent", () => {
    assert.equal(readDirectXGlobalBoolean("", AUTO_HDR_VALUE_NAME), false);
    assert.equal(
      readDirectXGlobalBoolean("Unrelated=7;", AUTO_HDR_VALUE_NAME, true),
      true
    );
  });

  it("reads zero as disabled and any non-zero integer as enabled", () => {
    assert.equal(
      readDirectXGlobalBoolean("AutoHDREnable=0;", AUTO_HDR_VALUE_NAME),
      false
    );
    assert.equal(
      readDirectXGlobalBoolean("AutoHDREnable=12;", AUTO_HDR_VALUE_NAME),
      true
    );
  });

  it("matches field names without depending on casing", () => {
    assert.equal(
      readDirectXGlobalBoolean("autohdrenable=1;", AUTO_HDR_VALUE_NAME),
      true
    );
  });

  it("uses the last value when Windows contains duplicate fields", () => {
    assert.equal(
      readDirectXGlobalBoolean(
        "AutoHDREnable=1;Other=4;AutoHDREnable=0;",
        AUTO_HDR_VALUE_NAME
      ),
      false
    );
  });

  it("rejects empty, symbolic and signed values instead of guessing", () => {
    for (const invalid of ["", "yes", "-1", "+1", "0x1"]) {
      assert.throws(
        () => readDirectXGlobalBoolean(
          `AutoHDREnable=${invalid};`,
          AUTO_HDR_VALUE_NAME
        ),
        InvalidDirectXGlobalSettingError
      );
    }
  });

  it("rejects an invalid duplicate even when the final value is valid", () => {
    assert.throws(
      () => readDirectXGlobalBoolean(
        "AutoHDREnable=future;AutoHDREnable=1;",
        AUTO_HDR_VALUE_NAME
      ),
      /no es un entero válido/
    );
  });

  it("creates a canonical first field in an empty string", () => {
    assert.equal(
      writeDirectXGlobalBoolean("", AUTO_HDR_VALUE_NAME, true),
      "AutoHDREnable=1;"
    );
  });

  it("appends a missing field without altering existing content", () => {
    assert.equal(
      writeDirectXGlobalBoolean("VendorFlag=blue", AUTO_HDR_VALUE_NAME, false),
      "VendorFlag=blue;AutoHDREnable=0;"
    );
    assert.equal(
      writeDirectXGlobalBoolean(
        "VendorFlag=blue;",
        WINDOWED_OPTIMIZATIONS_VALUE_NAME,
        true
      ),
      "VendorFlag=blue;SwapEffectUpgradeEnable=1;"
    );
  });

  it("changes only the chosen field and preserves unknown tokens byte-for-byte", () => {
    const source =
      "  Vendor Flag = alpha=beta ;;AutoHDREnable=0;X-Future=🚀;" +
      "SwapEffectUpgradeEnable=1;trailer";

    assert.equal(
      writeDirectXGlobalBoolean(source, AUTO_HDR_VALUE_NAME, true),
      "  Vendor Flag = alpha=beta ;;AutoHDREnable=1;X-Future=🚀;" +
        "SwapEffectUpgradeEnable=1;trailer"
    );
  });

  it("preserves key casing and whitespace around the selected value", () => {
    assert.equal(
      writeDirectXGlobalBoolean(
        " autohdrenable  =  0  ;Other=1;",
        AUTO_HDR_VALUE_NAME,
        true
      ),
      " autohdrenable  =  1  ;Other=1;"
    );
  });

  it("updates every duplicate occurrence without reordering it", () => {
    assert.equal(
      writeDirectXGlobalBoolean(
        "AutoHDREnable=0;Middle=x;AUTOHDRENABLE= 2 ;",
        AUTO_HDR_VALUE_NAME,
        true
      ),
      "AutoHDREnable=1;Middle=x;AUTOHDRENABLE= 1 ;"
    );
  });

  it("is byte-for-byte idempotent when every occurrence already matches", () => {
    const source = "Unknown=09;AutoHDREnable= 1 ;AutoHDREnable=1;";
    assert.equal(
      writeDirectXGlobalBoolean(source, AUTO_HDR_VALUE_NAME, true),
      source
    );
  });
});

