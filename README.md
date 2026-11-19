# Leonida Ledger — GTA 6 Trophy Guide & Tracker

![make.fun badge](https://make.fun/badge/gta6-trophy-guide-01.svg)
![rank](https://make.fun/badge/gta6-trophy-guide-01/qsc985/gta6-trophy-guide/rank.svg)
![reward](https://make.fun/badge/gta6-trophy-guide-01/qsc985/gta6-trophy-guide/reward.svg)

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of
Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze). Static files only:
open it in a desktop browser with the network off and everything still works.

- **Bounty:** https://make.fun/bounty/gta6-trophy-guide-01
- **Repository:** https://github.com/qsc985/gta6-trophy-guide

## What it does

- **Checklist tracker** — every trophy with its official name, description and
  grade, a checkbox per trophy, and a progress bar (earned X/55, split by grade).
  Progress is saved in `localStorage` and survives reloads.
- **Export / import** — save progress to a JSON file and import it back, so you
  can move between browsers or keep a backup.
- **Filters** — by grade (platinum / gold / silver / bronze), by type (story,
  missable, collectibles, activities, online, other), free-text search, and
  unearned-only. The list has no online trophies — the Online filter is there
  because the list was checked for them.
- **Spoiler mode** — hides the names and descriptions of story trophies until
  you earn them.
- **Platinum roadmap** — five stages in order: story, strangers & partners,
  activities & challenges, collectibles & exploration, then money, cleanup and
  the platinum. Each stage lists its trophies with a per-stage count.
- **Missable watch-list** — every missable trophy flagged in the list and in a
  dedicated section. Only one trophy is reported as possibly missable
  (Positive Mental Attitude — the Chapter 1 meditation), with the full warning
  and the save advice.
- **A guide for every trophy** — click any trophy for its guide in our own
  words (what to do, where, how, and when it can be missed), with its sources
  named beside it. Where the launch guides have not confirmed a method yet,
  the guide says so plainly and goes by the official description.

## Data and sources

Names, descriptions and grades are the official PlayStation list exactly as
published, as listed by Exophase and PSNProfiles. The guides are written in
our own words and cite their sources per trophy, including PowerPyx's GTA 6
Trophy Guide & Roadmap, GTABase, KeenGamer, Output Lag, Beebom's meditation
spot guide and HowToVideoGame. Nothing is copied from another guide.

## Usage

Serve `app/` with any static server and open `index.html`:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `app/index.html` directly from the files — the app loads nothing from
the network. URL parameters drive the views, which is how the screenshots were
taken:

- `?view=roadmap` — the platinum roadmap
- `?view=missable` — the missable watch-list
- `?trophy=<id>` — open one trophy's guide (e.g. `?trophy=28`)
- `?grade=silver` — filter by grade
- `?kind=missable` — show only missable trophies
- `?spoiler=on` — spoiler mode on

## Layout

- `app/index.html`, `app/app.js`, `app/style.css` — the tracker
- `app/data/trophies.json` — the 55 trophies: official name, description and
  grade, plus kind, missable flag, roadmap stage, guide and sources
- `screenshots/` — four real renders of the app (cover first)
- `main.ts` — the entry program (Node 22, standard library only): copies
  `app/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored make.fun library
- `vendor/makefun-frontend.ts` — the kit's library, unchanged

## Build / verify

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/app`, `out/screenshots` and `out/dossier.json`.

## License

MIT — see [LICENSE](LICENSE). Unofficial fan guide, not affiliated with
Rockstar Games. No Rockstar logos, official artwork or game screenshots are
used.
