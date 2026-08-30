import { readFile } from "node:fs/promises";

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error(
    "La etiqueta debe tener el formato estable vMAJOR.MINOR.PATCH; por ejemplo, v1.0.1."
  );
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const manifest = JSON.parse(
  await readFile(
    "com.maecly.gamingtoggles.sdPlugin/manifest.json",
    "utf8"
  )
);
const expectedPackageVersion = tag.slice(1);
const expectedManifestVersion = `${expectedPackageVersion}.0`;

const versions = [
  ["package.json", packageJson.version, expectedPackageVersion],
  ["package-lock.json", packageLock.version, expectedPackageVersion],
  [
    "package-lock.json packages['']",
    packageLock.packages?.[""]?.version,
    expectedPackageVersion
  ],
  ["manifest.json", manifest.Version, expectedManifestVersion]
];

const mismatches = versions.filter(([, actual, expected]) => actual !== expected);
if (mismatches.length > 0) {
  const details = mismatches
    .map(([file, actual, expected]) => `${file}: ${actual ?? "ausente"} (esperado ${expected})`)
    .join("\n");
  throw new Error(`Las versiones no coinciden con ${tag}:\n${details}`);
}

console.log(`Versión coherente: ${tag} (manifest ${expectedManifestVersion}).`);
