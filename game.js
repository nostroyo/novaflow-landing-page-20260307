const ui = {
  startRace: document.getElementById("start-race"),
  runTurn: document.getElementById("run-turn"),
  autoRace: document.getElementById("auto-race"),
  booster: document.getElementById("booster-card"),
  raceSummary: document.getElementById("race-summary"),
  raceStatus: document.getElementById("race-status"),
  turnInfo: document.getElementById("turn-info"),
  leaderboard: document.getElementById("leaderboard"),
  birdseyeGrid: document.getElementById("birdseye-grid"),
  focusBadge: document.getElementById("focus-badge"),
};

let race = null;

function refreshBoosterPicker() {
  if (!race) return;
  const player = race.cars.find((car) => car.isPlayer);
  const options = RaceCore.getAvailableBoosters(player);
  ui.booster.innerHTML = options
    .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
    .join("");
}

function initRace() {
  race = RaceCore.initRace();
  ui.runTurn.disabled = false;
  ui.autoRace.disabled = false;
  ui.startRace.textContent = "Restart race";
  ui.raceStatus.textContent = `Turn 0/${RaceCore.TOTAL_TURNS}`;
  ui.raceSummary.textContent = "Race started. Pick a booster card for each turn.";
  refreshBoosterPicker();
  render();
}

function runTurn() {
  if (!race || race.finished) return;
  const playerBooster = Number(ui.booster.value || 0);
  const focus = race.focuses[race.turn];
  RaceCore.resolveTurn(race, playerBooster);

  const playerPos = race.cars.findIndex((car) => car.isPlayer) + 1;
  const leader = race.cars[0];
  const player = race.cars.find((car) => car.isPlayer);
  const gap = leader.progress - player.progress;

  ui.raceStatus.textContent = race.finished ? "Finished" : `Turn ${race.turn}/${RaceCore.TOTAL_TURNS}`;
  ui.raceSummary.textContent = `Turn ${race.turn} (${focus}) — you are P${playerPos}. ${
    gap <= 0.05 ? "Leader" : `Gap to leader: ${gap.toFixed(2)}`
  }. ${race.swings.join(" • ")}`;

  if (race.finished) {
    ui.runTurn.disabled = true;
    ui.autoRace.disabled = true;
    ui.raceSummary.textContent = `Finish: P${playerPos}/${race.cars.length}. ${
      playerPos <= 3 ? "Podium!" : "Try a different booster timing."
    }`;
  }

  refreshBoosterPicker();
  render();
}

function renderBirdseye() {
  ui.birdseyeGrid.innerHTML = race.cars
    .map((car, i) => {
      const cls = car.isPlayer ? "car-dot player" : "car-dot";
      return `<li class="${cls}"><span>P${i + 1}</span><strong>${car.name}</strong></li>`;
    })
    .join("");
}

function render() {
  if (!race) {
    ui.turnInfo.innerHTML = "<div>Press <strong>Start instant race</strong> to begin.</div>";
    ui.leaderboard.innerHTML = "";
    ui.birdseyeGrid.innerHTML = "";
    ui.focusBadge.textContent = "-";
    return;
  }

  const nextFocus = race.turn < RaceCore.TOTAL_TURNS ? race.focuses[race.turn] : "complete";
  const player = race.cars.find((car) => car.isPlayer);

  ui.focusBadge.textContent = nextFocus;
  ui.turnInfo.innerHTML = [
    `<div><strong>Turn:</strong> ${race.turn}/${RaceCore.TOTAL_TURNS}</div>`,
    `<div><strong>Next segment focus:</strong> ${nextFocus}</div>`,
    `<div><strong>Your stats:</strong> straight ${player.straight}, curve ${player.curve}, reliability ${player.reliability}</div>`,
    `<div><strong>Boosters left:</strong> ${player.boosters.length ? player.boosters.join(", ") : "none"}</div>`,
  ].join("");

  const leaderProgress = race.cars[0]?.progress ?? 0;
  ui.leaderboard.innerHTML = race.cars
    .map((car, i) => {
      const gap = i === 0 ? "Leader" : `-${(leaderProgress - car.progress).toFixed(2)} pts`;
      return `<li><strong>P${i + 1} ${car.name}</strong> — ${gap} · S:${car.straight} C:${car.curve} R:${car.reliability} · boosters:${car.boosters.length}</li>`;
    })
    .join("");

  renderBirdseye();
}

ui.startRace.addEventListener("click", initRace);
ui.runTurn.addEventListener("click", runTurn);
ui.autoRace.addEventListener("click", () => {
  while (race && !race.finished) runTurn();
});

render();
