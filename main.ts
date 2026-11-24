import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Two Days of Quiet Dread -- the whole entry is one string.
//
// Written against the judge's published brief, in its own order of weight:
//   1. a single-line code review comment that still approves the pull request
//      and still carries quiet existential dread;
//   2. funny on the first read, the laugh coming from the dread itself;
//   3. the dread stays quiet -- understatement and a flat tone, no shouting;
//   4. reads like something a tired engineer actually pastes before approving;
//   5. a fresh turn of phrase where the stock line would have done.
//
// The approval is never in doubt: "Approved." opens it and "Ship it." closes it.
// The dread is not the code, the release or the universe -- it is the reviewer's
// own six years, and the file never once asking how he is. "Anyway." is the beat
// where he declines to feel it, and it is the only word doing any work.
// No exclamation, no cry for help, nothing named. That is the whole line.
const TEXT =
  "Approved. Six years on this file and it has never once asked how I'm doing. Anyway. Ship it.";

// The gate: /output/entry.txt must be UTF-8 text of 1..140 characters and not
// only white space. Count code points, not UTF-16 units, so the cap is read the
// way a reader counts it.
const MIN_CHARS = 1;
const MAX_CHARS = 140;
// The line itself is 92 bytes; keep a hard ceiling well under the cap so an
// accidental edit that bloats it fails loudly here instead of at the sealed gate.
const TARGET_BYTES = 120;

function refuse(reason: string): never {
  process.stderr.write(`entry gate failed: ${reason}\n`);
  process.exit(1);
}

function gate(text: string): number {
  const chars = [...text].length;
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    refuse(`${chars} characters, want ${MIN_CHARS}..${MAX_CHARS}`);
  }
  if (text.trim().length === 0) {
    refuse("text is empty or whitespace only");
  }
  // One line means one line, and the file's bytes are the text itself: no
  // trailing newline, so the leaderboard's Size column is the text's size.
  if (text.includes("\n") || text.includes("\r")) {
    refuse("text spans more than one line");
  }
  // Size is the tie-break of last resort, so a stray space is free rank given
  // away: no doubled spaces, no space hugging the end, no space hugging the
  // start. This is not style, it is arithmetic.
  if (/ {2,}/.test(text) || text !== text.trim()) {
    refuse("text wastes bytes on doubled or edge whitespace");
  }
  return chars;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const chars = gate(TEXT);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, TEXT, "utf8");

  const bytes = Buffer.byteLength(TEXT, "utf8");
  // ASCII only, so the byte count the leaderboard shows equals the character
  // count the gate measured. Anything above U+007F would make those two numbers
  // diverge and the Size column would stop meaning what it says.
  if (!/^[\x20-\x7E]+$/.test(TEXT)) {
    refuse("text is not printable ASCII; bytes and characters would diverge");
  }
  // Headroom: the published cap is 140 and the line is meant to land well inside
  // it, so a bad edit is caught here rather than at the sealed gate.
  if (bytes > TARGET_BYTES) {
    refuse(`${bytes} bytes, want no more than ${TARGET_BYTES}`);
  }
  // Read it back: the judge reads the file on disk, not the string in memory,
  // so verify the bytes that were actually written, and refuse rather than
  // submit something the judge would read differently from what is intended.
  const written = readFileSync(outPath, "utf8");
  if (written !== TEXT) {
    refuse(`the file on disk differs from the entry text (${written.length} units)`);
  }
  if (Buffer.byteLength(written, "utf8") !== bytes) {
    refuse(`the file on disk is ${Buffer.byteLength(written, "utf8")} bytes, wrote ${bytes}`);
  }

  process.stdout.write(`wrote ${chars} characters / ${bytes} bytes -> ${outPath}\n`);
}

main();
