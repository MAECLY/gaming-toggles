/**
 * Parser for DirectXUserGlobalSettings.
 *
 * Windows stores this value as a semicolon-separated list. It is not a public
 * schema and other Windows versions or GPU vendors may add fields, so edits
 * deliberately retain every byte outside the selected field's value.
 */

export type DirectXGlobalSettingName =
  | "AutoHDREnable"
  | "SwapEffectUpgradeEnable";

export const AUTO_HDR_VALUE_NAME: DirectXGlobalSettingName = "AutoHDREnable";
export const WINDOWED_OPTIMIZATIONS_VALUE_NAME: DirectXGlobalSettingName =
  "SwapEffectUpgradeEnable";

type MatchingToken = {
  readonly start: number;
  readonly end: number;
  readonly valueStart: number;
  readonly valueEnd: number;
  readonly value: string;
};

export class InvalidDirectXGlobalSettingError extends Error {
  public readonly setting: DirectXGlobalSettingName;
  public readonly value: string;

  public constructor(setting: DirectXGlobalSettingName, value: string) {
    super(`El valor ${setting} no es un entero válido: ${JSON.stringify(value)}.`);
    this.name = "InvalidDirectXGlobalSettingError";
    this.setting = setting;
    this.value = value;
  }
}

function findMatchingTokens(
  source: string,
  settingName: DirectXGlobalSettingName
): MatchingToken[] {
  const matches: MatchingToken[] = [];
  let tokenStart = 0;

  for (let cursor = 0; cursor <= source.length; cursor += 1) {
    if (cursor < source.length && source[cursor] !== ";") {
      continue;
    }

    const tokenEnd = cursor;
    const token = source.slice(tokenStart, tokenEnd);
    const equalsIndex = token.indexOf("=");

    if (equalsIndex >= 0) {
      const key = token.slice(0, equalsIndex).trim();
      if (key.localeCompare(settingName, undefined, { sensitivity: "accent" }) === 0) {
        const rawValue = token.slice(equalsIndex + 1);
        const leadingWhitespace = rawValue.match(/^\s*/u)?.[0].length ?? 0;
        const trailingWhitespace = rawValue.match(/\s*$/u)?.[0].length ?? 0;
        const valueStart = tokenStart + equalsIndex + 1 + leadingWhitespace;
        const valueEnd = Math.max(valueStart, tokenEnd - trailingWhitespace);

        matches.push({
          start: tokenStart,
          end: tokenEnd,
          valueStart,
          valueEnd,
          value: source.slice(valueStart, valueEnd)
        });
      }
    }

    tokenStart = cursor + 1;
  }

  return matches;
}

/**
 * Returns the effective boolean value. When duplicate fields exist, the last
 * occurrence wins, matching the conventional interpretation of settings lists.
 */
export function readDirectXGlobalBoolean(
  source: string,
  settingName: DirectXGlobalSettingName,
  defaultEnabled = false
): boolean {
  const matches = findMatchingTokens(source, settingName);
  const last = matches.at(-1);
  if (last === undefined) {
    return defaultEnabled;
  }

  let enabled = defaultEnabled;
  for (const match of matches) {
    if (!/^\d+$/u.test(match.value)) {
      throw new InvalidDirectXGlobalSettingError(settingName, match.value);
    }
    enabled = Number.parseInt(match.value, 10) !== 0;
  }
  return enabled;
}

/**
 * Updates only the selected field. Unknown fields, their order, whitespace,
 * casing and delimiters are preserved. Duplicate selected fields are all set to
 * the same value so Windows cannot observe an ambiguous result.
 */
export function writeDirectXGlobalBoolean(
  source: string,
  settingName: DirectXGlobalSettingName,
  enabled: boolean
): string {
  const replacement = enabled ? "1" : "0";
  const matches = findMatchingTokens(source, settingName);

  if (matches.length === 0) {
    if (source.length === 0) {
      return `${settingName}=${replacement};`;
    }

    const separator = source.endsWith(";") ? "" : ";";
    return `${source}${separator}${settingName}=${replacement};`;
  }

  let result = source;
  for (const match of matches.toReversed()) {
    if (match.value === replacement) {
      continue;
    }
    result =
      result.slice(0, match.valueStart) +
      replacement +
      result.slice(match.valueEnd);
  }
  return result;
}
