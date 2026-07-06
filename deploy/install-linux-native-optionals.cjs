const { execFileSync } = require("node:child_process");

const arch = { arm64: "arm64", x64: "x64" }[process.arch];

if (process.platform !== "linux" || !arch) {
  process.exit(0);
}

const versionOf = (packageName) => require(`${packageName}/package.json`).version;
const packages = [
  `@rollup/rollup-linux-${arch}-gnu@${versionOf("rollup")}`,
  `@tailwindcss/oxide-linux-${arch}-gnu@${versionOf("@tailwindcss/oxide")}`,
  `lightningcss-linux-${arch}-gnu@${versionOf("lightningcss")}`,
  `@esbuild/linux-${arch}@${versionOf("esbuild")}`,
];

execFileSync("npm", ["install", "--no-save", "--package-lock=false", ...packages], {
  stdio: "inherit",
});
