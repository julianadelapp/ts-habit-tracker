# ts-habit-tracker

A tiny command-line habit tracker with streaks, written in TypeScript. No runtime dependencies.

```
$ habit add "read 20 minutes"
$ habit add "go for a run"
$ habit check "read 20 minutes"
[✓] read 20 minutes  □□□□□□■  streak 1 (best 1)
[ ] go for a run     □□□□□□□  streak 0 (best 0)
```

The strip shows the last 7 days, oldest first (■ done, □ missed).

## Use

```bash
npm install
npm run build
node dist/cli.js add "read 20 minutes"
node dist/cli.js check "read 20 minutes"
node dist/cli.js list
```

| Command | What it does |
|---|---|
| `add <name>` | Start tracking a habit |
| `check <name> [YYYY-MM-DD]` | Check a habit off for today, or for a past day you forgot to log |
| `list` | Show habits, the last 7 days and streaks (the default) |
| `rm <name>` | Stop tracking a habit |

Habits are saved in `~/.habits.json`. Set `HABITS_FILE` to use another file. Run `npm link` once if you'd rather type `habit` than `node dist/cli.js`.

## How streaks work

- The **current streak** counts consecutive days ending today. If you haven't checked in yet today, a streak that ended yesterday is still alive, so it only resets after a fully missed day.
- The **best streak** is the longest run of consecutive days ever.
- Future days can't be checked in, and checking the same day twice does nothing.
- Dates are plain calendar days, and day arithmetic runs in UTC so daylight-saving changes can't shift a streak.

## How it's organized

- `src/habits.ts`: pure functions (streaks, formatting, validation) that never touch the disk
- `src/cli.ts`: reads arguments, loads and saves the file, prints output
- `src/habits.test.ts`: unit tests, including month, year and leap-day boundaries, plus one end-to-end CLI test

## Test

```bash
npm test
```

## Ideas to extend

- Weekly goals (for example, 3 times a week) instead of daily only
- Export to CSV
- A `stats` command with completion rate per habit

## License

MIT
