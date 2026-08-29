import { readFile, writeFile } from "node:fs/promises";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(
    "Indica una versión MAJOR.MINOR.PATCH; por ejemplo: npm run version:set -- 1.0.1"
  );
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const packagePath = "package.json";
const lockPath = "package-lock.json";
const manifestPath =
  "com.miguelangelstream.windows-xbox-settings.sdPlugin/manifest.json";

const packageJson = await readJson(packagePath);
const packageLock = await readJson(lockPath);
const manifest = await readJson(manifestPath);

packageJson.version = version;
packageLock.version = version;
packageLock.packages[""].version = version;
manifest.Version = `${version}.0`;

await Promise.all([
  writeJson(packagePath, packageJson),
  writeJson(lockPath, packageLock),
  writeJson(manifestPath, manifest)
]);

console.log(`Versión actualizada a ${version}; manifest ${version}.0.`);
console.log("Actualiza CHANGELOG.md antes de crear la etiqueta.");
