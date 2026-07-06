const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const arch = { arm64: "arm64", x64: "x64" }[process.arch];

if (process.platform !== "linux" || !arch) {
  process.exit(0);
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const versionOf = (packageName) => {
  const entry = lock.packages?.[`node_modules/${packageName}`];
  if (!entry?.version) {
    throw new Error(`Cannot find ${packageName} in package-lock.json`);
  }
  return entry.version;
};

const packages = [
  `@rollup/rollup-linux-${arch}-gnu@${versionOf("rollup")}`,
  `@tailwindcss/oxide-linux-${arch}-gnu@${versionOf("@tailwindcss/oxide")}`,
  `lightningcss-linux-${arch}-gnu@${versionOf("lightningcss")}`,
  `@esbuild/linux-${arch}@${versionOf("esbuild")}`,
];

execFileSync("npm", ["install", "--no-save", "--package-lock=false", ...packages], {
  stdio: "inherit",
});
