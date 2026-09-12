#!/usr/bin/env node
'use strict';

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const CHANGELOG_PATH = path.join(ROOT, 'src', 'assets', 'changelog.json');

const COMMIT_SEPARATOR = '\x1e';

const HIGHLIGHT_LABELS = {
  feat: 'Nueva Funcionalidad',
  fix: 'Corrección de Error',
};

const CONVENTIONAL_HEADER =
  /^(feat|fix|chore|refactor|style|ci|docs|perf|build|test|revert)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i;

function run(command) {
  return execSync(command, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}).trim();
}

function getLastVersionTag() {
  try {
    const tag = run('git describe --tags --abbrev=0 --match "v[0-9]*"');
    return parseVersion(tag) ? tag : null;
  } catch {
    return null;
  }
}

function getCommitMessages(sinceTag) {
  const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD';
  try {
    const raw = execSync(`git log ${range} --no-merges --pretty=format:${COMMIT_SEPARATOR}%B`, {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    return raw
      .split(COMMIT_SEPARATOR)
      .map((message) => message.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseVersion(input) {
  const match = String(input)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])} : null;
}

function parseCommit(message) {
  const firstLine = message.split('\n').find((line) => line.trim().length > 0) ?? '';
  const match = firstLine.match(CONVENTIONAL_HEADER);
  if (!match) {
    return null;
  }
  return {
    type: match[1].toLowerCase(),
    breaking: Boolean(match[3]) || /^BREAKING[ -]CHANGE:/im.test(message),
    summary: match[4].trim().replace(/\.$/, ''),
  };
}

function classify(commits) {
  let breaking = false;
  let features = 0;
  let fixes = 0;
  for (const message of commits) {
    const parsed = parseCommit(message);
    if (!parsed) {
      continue;
    }
    if (parsed.breaking) {
      breaking = true;
    }
    if (parsed.type === 'feat') {
      features += 1;
    } else if (parsed.type === 'fix') {
      fixes += 1;
    }
  }
  return {breaking, features, fixes};
}

function nextVersion(current, classification) {
  if (classification.breaking) {
    return {major: current.major + 1, minor: 0, patch: 0};
  }
  if (classification.features > 0) {
    return {major: current.major, minor: current.minor + 1, patch: 0};
  }
  return {major: current.major, minor: current.minor, patch: current.patch + 1};
}

function buildHighlights(commits) {
  const highlights = [];
  for (const message of commits) {
    const parsed = parseCommit(message);
    if (!parsed || (parsed.type !== 'feat' && parsed.type !== 'fix')) {
      continue;
    }
    highlights.push(`${HIGHLIGHT_LABELS[parsed.type]}: ${parsed.summary}`);
  }
  return [...new Set(highlights)];
}

function readChangelog() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

  const lastTag = getLastVersionTag();
  const baseVersion = parseVersion(lastTag) ??
    parseVersion(packageJson.version) ?? {major: 0, minor: 0, patch: 0};
  const commits = getCommitMessages(lastTag);
  const classification = classify(commits);

  if (!classification.breaking && classification.features === 0 && classification.fixes === 0) {
    console.log('[changelog] No feat/fix/breaking commits since the last tag. Nothing to release.');
    return;
  }

  const version = nextVersion(baseVersion, classification);
  const tagName = `v${version.major}.${version.minor}.${version.patch}`;
  const today = new Date().toISOString().slice(0, 10);

  const entries = readChangelog().filter((entry) => entry.version !== tagName);
  entries.unshift({version: tagName, fecha: today, highlights: buildHighlights(commits)});

  fs.mkdirSync(path.dirname(CHANGELOG_PATH), {recursive: true});
  fs.writeFileSync(CHANGELOG_PATH, `${JSON.stringify(entries, null, 2)}\n`);

  packageJson.version = `${version.major}.${version.minor}.${version.patch}`;
  fs.writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

  const bump = classification.breaking ? 'major' : classification.features > 0 ? 'minor' : 'patch';
  console.log(
    `[changelog] Release ${tagName} ready (${bump} bump) with ${entries[0].highlights.length} highlight(s).`,
  );
}

main();
