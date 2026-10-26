import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addDays, addHabit, checkIn, currentStreak, emptyStore, formatList, lastDays, longestStreak, parseStore, removeHabit, toDay,
} from "./habits.js";

const T = "2026-03-10";

test("addDays crosses month, year and leap-day boundaries", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.throws(() => addDays("2026-02-30", 1), /Invalid date/);
  assert.throws(() => addDays("March 5", 1), /Invalid date/);
});

test("toDay uses the local calendar day", () => {
  assert.equal(toDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("currentStreak counts back from today", () => {
  assert.equal(currentStreak(["2026-03-08", "2026-03-09", "2026-03-10"], T), 3);
});

test("currentStreak stays alive if today isn't checked yet, but dies after a missed day", () => {
  assert.equal(currentStreak(["2026-03-08", "2026-03-09"], T), 2);
  assert.equal(currentStreak(["2026-03-07", "2026-03-08"], T), 0);
  assert.equal(currentStreak([], T), 0);
});

test("a gap resets the current streak", () => {
  assert.equal(currentStreak(["2026-03-05", "2026-03-06", "2026-03-09", "2026-03-10"], T), 2);
});

test("longestStreak finds the best run even when it's in the past", () => {
  const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-03-09", "2026-03-10"];
  assert.equal(longestStreak(days), 4);
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(["2026-01-01", "2026-01-01"]), 1);
});

test("lastDays draws the last seven days oldest first", () => {
  assert.equal(lastDays(["2026-03-04", "2026-03-09", "2026-03-10"], T), "■□□□□■■");
});

test("addHabit trims, rejects empty, long and duplicate names (case-insensitive)", () => {
  const s = addHabit(emptyStore(), "  Read ");
  assert.equal(s.habits[0]?.name, "Read");
  assert.throws(() => addHabit(s, "read"), /already exists/);
  assert.throws(() => addHabit(s, "   "), /empty/);
  assert.throws(() => addHabit(s, "x".repeat(61)), /too long/);
});

test("checkIn is idempotent, sorted, case-insensitive and rejects future days", () => {
  let s = addHabit(emptyStore(), "Read");
  s = checkIn(s, "read", "2026-03-10", T);
  s = checkIn(s, "READ", "2026-03-08", T);
  s = checkIn(s, "Read", "2026-03-10", T);
  assert.deepEqual(s.habits[0]?.checkins, ["2026-03-08", "2026-03-10"]);
  assert.throws(() => checkIn(s, "Read", "2026-03-11", T), /future/);
  assert.throws(() => checkIn(s, "Nope", T, T), /No habit/);
});

test("removeHabit removes only the named habit", () => {
  const s = addHabit(addHabit(emptyStore(), "a"), "b");
  assert.deepEqual(removeHabit(s, "A").habits.map((h) => h.name), ["b"]);
});

test("formatList shows tick, strip and streaks, or an empty hint", () => {
  assert.match(formatList(emptyStore(), T), /No habits yet/);
  let s = addHabit(addHabit(emptyStore(), "Read"), "Run");
  s = checkIn(checkIn(s, "Read", T, T), "Read", "2026-03-09", T);
  assert.equal(formatList(s, T), "[✓] Read  □□□□□■■  streak 2 (best 2)\n[ ] Run   □□□□□□□  streak 0 (best 0)");
});

test("parseStore rejects bad files and drops malformed entries", () => {
  assert.throws(() => parseStore("{}"), /Invalid/);
  const s = parseStore('{"habits":[{"name":"ok","checkins":["2026-03-10","junk","2026-03-10"]},{"nope":1}]}');
  assert.deepEqual(s.habits.map((h) => [h.name, h.checkins]), [["ok", ["2026-03-10"]]]);
});

test("CLI end to end", () => {
  const cli = fileURLToPath(new URL("./cli.js", import.meta.url));
  const env = { ...process.env, HABITS_FILE: join(mkdtempSync(join(tmpdir(), "habits-")), "h.json"), HABITS_TODAY: T };
  const run = (...args: string[]) => execFileSync("node", [cli, ...args], { env, encoding: "utf8" });
  run("add", "Read", "20", "minutes");
  run("check", "Read", "20", "minutes", "2026-03-09");
  assert.match(run("check", "read", "20", "minutes"), /\[✓\] Read 20 minutes {2}□□□□□■■ {2}streak 2 \(best 2\)/);
  const bad = spawnSync("node", [cli, "check", "ghost"], { env, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /No habit named "ghost"/);
  assert.doesNotMatch(run("rm", "Read 20 minutes"), /Read/);
});
