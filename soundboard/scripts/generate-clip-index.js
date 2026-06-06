"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const clipsDirectory = path.join(projectRoot, "clips");
const outputPath = path.join(clipsDirectory, "index.json");
const audioFilePattern =
  /\.(aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/i;

function findAudioFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findAudioFiles(absolutePath);
    }
    if (!entry.isFile() || !audioFilePattern.test(entry.name)) {
      return [];
    }

    return [
      path.relative(projectRoot, absolutePath).split(path.sep).join("/")
    ];
  });
}

const clips = findAudioFiles(clipsDirectory).sort((left, right) =>
  left.localeCompare(right)
);

fs.writeFileSync(outputPath, `${JSON.stringify(clips, null, 2)}\n`);
console.log(`Indexed ${clips.length} clip(s) in clips/index.json`);
