import { execSync } from "child_process";
import { readFileSync } from "fs";

function getVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    const tag = execSync("git describe --tags --abbrev=0").toString().trim();
    return tag.startsWith("v") ? tag.slice(1) : tag;
  } catch {
    const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
    return pkg.version;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: getVersion(),
  },
};

export default nextConfig;
