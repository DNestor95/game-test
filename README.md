# CRIME.EXE — Dystopian Criminal Underground RPG

A browser-based top-down RPG set in a cyberpunk dystopian city. Play as a criminal operative navigating a dangerous urban underground — hack terminals, steal from civilians, bribe corrupt police, and stay one step ahead of the law.

## Screenshots

**Main Menu**
![Menu](https://github.com/user-attachments/assets/7e973959-2fd5-418a-b971-6db755e0efed)

**Gameplay — Procedural city with HUD**
![Gameplay](https://github.com/user-attachments/assets/758d14a0-81f3-464a-b81d-fa0e8b70d6cf)

**Breach Protocol — Hacking minigame**
![Hacking](https://github.com/user-attachments/assets/90e50b05-5459-41cb-a156-5b786e4b19c5)

**Inventory System**
![Inventory](https://github.com/user-attachments/assets/a2f33d4b-40db-481b-95bf-b13e491314e2)

## How to Play

Open `index.html` in a web browser (or serve the directory with any static file server).

### Controls

| Input | Action |
|-------|--------|
| **Click** | Move player to location |
| **1** | Hack nearby terminal (Breach Protocol minigame) |
| **2** | Steal from nearby civilian (+credits, +heat) |
| **3** | Bribe nearby police (-heat, costs $150) |
| **4** | Sprint (temporary speed boost) |
| **I** | Toggle inventory |
| **Escape** | Cancel movement / close hacking |
| **Enter** | Start / restart game |

### Gameplay

- **Explore** the procedurally-generated dystopian city
- **Hack** glowing green terminals with the Breach Protocol minigame
- **Collect items** automatically by walking over them
- **Manage your heat** (wanted level) — high heat makes police chase you
- **Survive** police encounters by bribing, disguising, or using your weapon
- **Win** by hacking 10 terminals before you're neutralised

### Items

| Item | Effect |
|------|--------|
| **Credits ($)** | +$50 credits (auto-collected) |
| **Hack Tool** | +0.5× hack speed (stackable) |
| **Disguise** | −35 heat, 30s duration (equip from inventory) |
| **Sidearm** | Resist arrest — fight back when caught |
| **Med-Kit** | Restore 40 HP |

### Heat System

Your **heat** (wanted level) rises when you steal or fail hacks. As it increases:
- **30%+** — Police become alert and notice you
- **60%+** — Police actively chase you on sight
- **100%** — Maximum wanted: officers everywhere

Heat slowly decays over time. Use a **Disguise** item or **Bribe** police to reduce it quickly.

## Features

- 🌆 **Procedural city generation** — unique map every game
- 🖱️ **Mouse-click movement** with BFS pathfinding
- 💻 **Breach Protocol** hacking minigame with symbol matching
- 🚔 **Dynamic police AI** — patrol, alert, and chase states
- 🎒 **4×5 grid inventory** with usable items
- 📊 **HUD** — health bar, heat meter, credits, ability cooldowns
- 🗺️ **Minimap** with live entity tracking
- 🏙️ **Named locations** — Black Market, Police Station, Hacker Den, and more

## File Structure

```
index.html          — Game page
css/style.css       — Cyberpunk dark theme
js/config.js        — Game constants (tiles, colours, speeds)
js/utils.js         — BFS pathfinding, camera helpers
js/world.js         — Procedural world generation + WorldItem class
js/player.js        — Player class (movement, abilities, heat)
js/npc.js           — NPC classes (Police, Civilian)
js/inventory.js     — Grid inventory system + item definitions
js/hacking.js       — Breach Protocol hacking minigame
js/ui.js            — HUD, minimap, ability bar, messages
js/game.js          — Game loop, state machine, event handling
js/main.js          — Entry point
```

