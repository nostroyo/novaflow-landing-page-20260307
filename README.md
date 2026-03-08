# RacePact MVP (Booster + 22 Car Bird's-eye Update)

This MVP is a static, browser-playable race simulation.

## Core rules (updated)

- **Pit stops are removed** from this MVP.
- Grid is **22 cars** in a stylized bird's-eye representation.
- Each car has 3 stats:
  - `straight` (car characteristic)
  - `curve` (car characteristic)
  - `reliability` (pilot characteristic)
- Each turn has a focus characteristic: `straight` or `curve`.
- Player has exactly **3 booster cards total** for the race.
  - Booster cards are `+1` or `+2`.
  - You can play **at most one** card per turn.

## Turn resolution formula

For each car:

`movementScore = focusedStat(straight|curve) + boosterUsed (+ reliability influence only via variance)`

- Reliability does **not** add a direct flat bonus.
- Reliability reduces volatility/noise in movement outcomes.

## Movement and ranking behavior (move up/down)

- Cars accumulate movement points every turn.
- Rankings are primarily sorted by cumulative movement.
- Then, close-gap momentum swings are applied:
  - if trailing car is close enough and has significantly better turn momentum,
    it moves up one place (front car moves down one place).
- This preserves the prior project behavior concept of dynamic ranking updates,
  now driven by turn movement instead of lap/pit strategy.

## Bird's-eye representation approach

- UI includes a **22-item stylized bird's-eye panel** (`#birdseye-grid`).
- Cars are rendered in current ranking order as compact "car dots".
- Player car is highlighted for instant readability.

## Project files

- `index.html` — page + game UI
- `styles.css` — styling (includes bird's-eye layout)
- `race-core.js` — race model and turn resolution engine
- `game.js` — DOM wiring + interactions
- `tests/race-core.test.js` — core logic tests

## Run locally

Open `index.html` in any modern browser.

## Run tests

```bash
node --test tests/race-core.test.js
```

## Deployment

Publish with GitHub Pages from repository root (or configured Pages source).
