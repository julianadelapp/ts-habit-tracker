export interface Habit {
  name: string;
  createdAt: string;
  /** Sorted, unique days in YYYY-MM-DD form. */
  checkins: string[];
}

export interface Store {
  habits: Habit[];
}

export const emptyStore = (): Store => ({ habits: [] });

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day for a Date, as YYYY-MM-DD. */
export function toDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function dayToUtc(day: string): number {
  if (!DAY_RE.test(day)) throw new Error(`Invalid date "${day}". Use YYYY-MM-DD.`);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  if (new Date(ms).toISOString().slice(0, 10) !== day) throw new Error(`Invalid date "${day}".`);
  return ms;
}

export function addDays(day: string, n: number): string {
  return new Date(dayToUtc(day) + n * DAY_MS).toISOString().slice(0, 10);
}

function find(store: Store, name: string): Habit {
  const habit = store.habits.find((h) => h.name.toLowerCase() === name.trim().toLowerCase());
  if (!habit) throw new Error(`No habit named "${name.trim()}"`);
  return habit;
}

export function addHabit(store: Store, name: string, now = new Date()): Store {
  const clean = name.trim();
  if (!clean) throw new Error("Habit name cannot be empty");
  if (clean.length > 60) throw new Error("Habit name is too long (60 characters max)");
  if (store.habits.some((h) => h.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error(`"${clean}" already exists`);
  }
  return { habits: [...store.habits, { name: clean, createdAt: now.toISOString(), checkins: [] }] };
}

export function checkIn(store: Store, name: string, day: string, today: string): Store {
  const target = find(store, name);
  if (dayToUtc(day) > dayToUtc(today)) throw new Error("You can't check in for a future day");
  const checkins = [...new Set([...target.checkins, day])].sort();
  return { habits: store.habits.map((h) => (h === target ? { ...h, checkins } : h)) };
}

export function removeHabit(store: Store, name: string): Store {
  const target = find(store, name);
  return { habits: store.habits.filter((h) => h !== target) };
}

/** Consecutive days ending today. If today isn't checked yet, a streak ending yesterday is still alive. */
export function currentStreak(checkins: string[], today: string): number {
  const days = new Set(checkins);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function longestStreak(checkins: string[]): number {
  const sorted = [...new Set(checkins)].sort();
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const day of sorted) {
    run = prev !== undefined && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** A strip of the last n days, oldest first: ■ done, □ missed. */
export function lastDays(checkins: string[], today: string, n = 7): string {
  const days = new Set(checkins);
  let out = "";
  for (let i = n - 1; i >= 0; i--) out += days.has(addDays(today, -i)) ? "■" : "□";
  return out;
}

export function formatList(store: Store, today: string): string {
  if (store.habits.length === 0) return 'No habits yet. Add one with: habit add "read 20 minutes"';
  const width = Math.max(...store.habits.map((h) => h.name.length));
  return store.habits
    .map((h) => {
      const done = h.checkins.includes(today) ? "✓" : " ";
      const streak = currentStreak(h.checkins, today);
      const best = longestStreak(h.checkins);
      return `[${done}] ${h.name.padEnd(width)}  ${lastDays(h.checkins, today)}  streak ${streak} (best ${best})`;
    })
    .join("\n");
}

/** Validates data read from disk so a damaged file can't crash the app. */
export function parseStore(raw: string): Store {
  const data = JSON.parse(raw) as Partial<Store>;
  if (!data || !Array.isArray(data.habits)) throw new Error("Invalid habits file");
  const habits: Habit[] = [];
  for (const h of data.habits) {
    if (!h || typeof h.name !== "string" || !Array.isArray(h.checkins)) continue;
    const checkins = h.checkins.filter((d): d is string => typeof d === "string" && DAY_RE.test(d));
    habits.push({ name: h.name, createdAt: typeof h.createdAt === "string" ? h.createdAt : "", checkins: [...new Set(checkins)].sort() });
  }
  return { habits };
}
