#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { addHabit, checkIn, emptyStore, formatList, parseStore, removeHabit, toDay, type Store } from "./habits.js";

const file = process.env.HABITS_FILE ?? join(homedir(), ".habits.json");
// HABITS_TODAY exists so tests can pin the date; normal use never sets it.
const today = process.env.HABITS_TODAY ?? toDay(new Date());

const HELP = `Usage: habit <command>

  add <name>                 Start tracking a habit
  check <name> [YYYY-MM-DD]  Check a habit off for today (or a past day)
  list                       Show habits, the last 7 days and streaks (default)
  rm <name>                  Stop tracking a habit

Habits are stored in ${file} (override with HABITS_FILE).`;

function load(): Store {
  return existsSync(file) ? parseStore(readFileSync(file, "utf8")) : emptyStore();
}

function save(store: Store): void {
  writeFileSync(file, JSON.stringify(store, null, 2) + "\n");
}

function main(argv: string[]): void {
  const [command = "list", ...rest] = argv;
  switch (command) {
    case "add":
      save(addHabit(load(), rest.join(" ")));
      break;
    case "check": {
      // The last argument is a date only if it looks like one; everything before it is the name.
      const last = rest[rest.length - 1] ?? "";
      const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(last);
      const name = (hasDate ? rest.slice(0, -1) : rest).join(" ");
      save(checkIn(load(), name, hasDate ? last : today, today));
      break;
    }
    case "rm":
      save(removeHabit(load(), rest.join(" ")));
      break;
    case "list":
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;
    default:
      throw new Error(`Unknown command "${command}". Try: habit help`);
  }
  console.log(formatList(load(), today));
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
