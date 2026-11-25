import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_FIELDS = ['id', 'title', 'artist', 'composer', 'pitch', 'tj_num', 'ky_num'];
const PITCH_RE = /^(\d옥\s*[도레미파솔라시]#?|X)$/;

export function validateSongs(songs) {
  if (!Array.isArray(songs) || songs.length === 0) {
    return ['songs.json must be a non-empty array'];
  }
  const errors = [];
  const seenIds = new Set();
  const seenTj = new Set();

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      errors.push(`row ${i}: not an object`);
      continue;
    }
    for (const f of REQUIRED_FIELDS) {
      if (!(f in s)) errors.push(`row ${i} (id=${s.id}): missing field "${f}"`);
    }
    if (!Number.isInteger(s.id) || s.id <= 0) {
      errors.push(`row ${i}: invalid id "${s.id}"`);
    } else if (seenIds.has(s.id)) {
      errors.push(`row ${i}: duplicate id ${s.id}`);
    } else {
      seenIds.add(s.id);
    }

    for (const sf of ['title', 'artist', 'composer', 'pitch', 'tj_num', 'ky_num']) {
      if (typeof s[sf] !== 'string' || s[sf].trim() === '') {
        errors.push(`row ${i} (id=${s.id}): "${sf}" must be a non-empty string`);
      }
    }

    if (typeof s.pitch === 'string' && !PITCH_RE.test(s.pitch)) {
      errors.push(`row ${i} (id=${s.id}): invalid pitch "${s.pitch}"`);
    }

    if (typeof s.tj_num === 'string' && s.tj_num !== 'XXX' && s.tj_num !== '-') {
      const cleanTj = s.tj_num.split('<br>')[0].replace(/[ⓗⓢ]/g, '').trim();
      if (!/^\d+$/.test(cleanTj)) {
        errors.push(`row ${i} (id=${s.id}): invalid tj_num "${s.tj_num}"`);
      } else if (seenTj.has(cleanTj)) {
        errors.push(`row ${i} (id=${s.id}): duplicate tj_num "${cleanTj}"`);
      } else {
        seenTj.add(cleanTj);
      }
    }
  }
  return errors;
}

export async function writeSongsAtomically(filePath, songs, prevCount = 0) {
  const errors = validateSongs(songs);
  if (errors.length > 0) {
    throw new Error(`Song schema validation failed: ${errors.slice(0, 5).join('; ')}`);
  }
  if (prevCount > 0 && songs.length < prevCount) {
    throw new Error(`Refusing to shrink songs.json from ${prevCount} to ${songs.length}`);
  }
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(songs, null, 2), 'utf8');
  await fsp.rename(tmpPath, filePath);
}

export function writeSongsAtomicallySync(filePath, songs, prevCount = 0) {
  const errors = validateSongs(songs);
  if (errors.length > 0) {
    throw new Error(`Song schema validation failed: ${errors.slice(0, 5).join('; ')}`);
  }
  if (prevCount > 0 && songs.length < prevCount) {
    throw new Error(`Refusing to shrink songs.json from ${prevCount} to ${songs.length}`);
  }
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(songs, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export async function writeJsonAtomically(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmpPath, filePath);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const songsPath = path.join(rootDir, 'data', 'songs.json');
  const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
  const errors = validateSongs(songs);
  if (errors.length > 0) {
    console.error(`❌ Verification failed (${errors.length} errors):`);
    for (const err of errors.slice(0, 20)) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`✅ Verified ${songs.length} songs in data/songs.json (7-field schema, unique id/tj_num, valid pitch).`);
}
