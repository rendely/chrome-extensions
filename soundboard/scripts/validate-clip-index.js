"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const indexPath = path.join(projectRoot, "clips", "index.json");
const clips = JSON.parse(fs.readFileSync(indexPath, "utf8"));

if (!Array.isArray(clips)) {
  throw new Error("clips/index.json must contain an array");
}

for (const clip of clips) {
  if (typeof clip !== "string" || !clip.startsWith("clips/")) {
    throw new Error(`Invalid clip path: ${JSON.stringify(clip)}`);
  }

  const absolutePath = path.resolve(projectRoot, clip);
  if (!absolutePath.startsWith(`${path.join(projectRoot, "clips")}${path.sep}`)) {
    throw new Error(`Clip path escapes clips directory: ${clip}`);
  }
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Indexed clip does not exist: ${clip}`);
  }
}

console.log(`Validated ${clips.length} indexed clip(s)`);
