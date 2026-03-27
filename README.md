# NETRUNNER.EXE — Dystopian Hacking Arcade

A real-time top-down round-based high-score arcade game built with **Phaser 3 + TypeScript + Vite**.

Hack nodes, chain combos, manage heat, survive security drones — how many rounds can you last?

## Dev / Build

```bash
npm install
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # production build → dist/
npm run serve    # preview production build locally
```

## Deploy to GitHub Pages

After `npm run build`, push the `dist/` folder to the `gh-pages` branch, or configure GitHub Pages to serve from `dist/` in the repo settings. The build uses `base: './'` so relative paths work correctly.

## Controls

| Input | Action |
|-------|--------|
| **WASD** | Move |
| **SHIFT** | Dash (cooldown) |
| **E** (hold) | Hack nearby node |
| **ENTER / SPACE** | Start game (from menu) |
| **1 / 2 / 3** | Select upgrade (between rounds) |

## Game Loop

Each **run** is a sequence of increasingly difficult rounds:

1. **Round Intro** — 3…2…1 countdown
2. **Node Rush** — hack the required number of nodes before the timer runs out
3. **Upgrade** — pick 1 of 3 augments to carry into the next round
4. Repeat until you **die or time runs out** → **Game Over** screen with score + best score

## Scoring

- **+100 base points** per node hacked
- **Combo multiplier** — chain hacks within the combo window for bonus points
- **Score multiplier** — stackable via upgrades
- **Best score** stored in `localStorage`

## Heat System

- Heat rises with each hack and on taking damage
- High heat → more security drones, faster spawn rate, harder to survive
- Heat slowly decays over time

## Upgrades

| Upgrade | Effect |
|---------|--------|
| ⚡ FAST INJECT | +40% hack speed |
| 🏃 GHOST STEP | +35 move speed |
| ⚙️ QUICK BOOST | -35% dash cooldown |
| 💰 DATA BROKER | +0.5× score multiplier |
| 💉 NANO-PATCH | Restore 40 HP |
| 🔗 CHAIN HACK | +1.5s combo window |

## Legacy

The original vanilla-canvas CRIME.EXE game is preserved in the [`legacy/`](legacy/) directory.

## Screenshots

**Main Menu**
![Menu](https://github.com/user-attachments/assets/7e973959-2fd5-418a-b971-6db755e0efed)
