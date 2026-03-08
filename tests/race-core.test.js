const test = require("node:test");
const assert = require("node:assert/strict");
const RaceCore = require("../race-core.js");

test("initial race has 22 cars and 12 turns", () => {
  const race = RaceCore.initRace(() => 0.4);
  assert.equal(race.cars.length, 22);
  assert.equal(race.focuses.length, RaceCore.TOTAL_TURNS);
});

test("movement score uses focused stat + booster", () => {
  const car = { straight: 8, curve: 6 };
  assert.equal(RaceCore.movementScore(car, "straight", 2), 10);
  assert.equal(RaceCore.movementScore(car, "curve", 1), 7);
});

test("player has only 3 boosters total and consumes one when used", () => {
  const race = RaceCore.initRace(() => 0.4);
  const player = race.cars.find((c) => c.isPlayer);
  assert.deepEqual(player.boosters.sort(), [1, 2, 2]);

  RaceCore.resolveTurn(race, 2, () => 0.5);
  const playerAfter = race.cars.find((c) => c.isPlayer);
  assert.equal(playerAfter.boosters.length, 2);
});

test("race finishes after total turns", () => {
  const race = RaceCore.initRace(() => 0.4);
  for (let i = 0; i < RaceCore.TOTAL_TURNS; i += 1) {
    RaceCore.resolveTurn(race, 0, () => 0.5);
  }
  assert.equal(race.finished, true);
});
