const TOTAL_LAPS = 12;
const BASE_LAP_TIME = 90;
const PIT_LOSS = 21;
const WET_PENALTY = 6;

const compounds = {
  soft: { pace: -1.2, wear: 1.4, wetPenalty: 8 },
  medium: { pace: -0.5, wear: 1.0, wetPenalty: 6 },
  hard: { pace: 0.4, wear: 0.7, wetPenalty: 5 },
  inter: { pace: 2.2, wear: 1.2, wetPenalty: -2 },
};

const paceModes = {
  conserve: { delta: 0.9, wear: 0.8, overtake: -6 },
  balanced: { delta: 0, wear: 1.0, overtake: 0 },
  push: { delta: -0.9, wear: 1.26, overtake: 10 },
};

const aiProfiles = [
  { name: "Apex Voss", pace: 92, tire: 85, wet: 71, overtake: 89, consistency: 86, compound: "soft" },
  { name: "Mira Kane", pace: 90, tire: 82, wet: 79, overtake: 83, consistency: 88, compound: "medium" },
  { name: "Ion Brega", pace: 88, tire: 91, wet: 76, overtake: 70, consistency: 90, compound: "hard" },
  { name: "Nova Zell", pace: 91, tire: 80, wet: 84, overtake: 86, consistency: 80, compound: "soft" },
  { name: "Taro Lin", pace: 87, tire: 89, wet: 88, overtake: 74, consistency: 92, compound: "medium" },
  { name: "Rex Monza", pace: 93, tire: 76, wet: 68, overtake: 91, consistency: 78, compound: "soft" },
  { name: "Vale Nix", pace: 86, tire: 90, wet: 82, overtake: 76, consistency: 91, compound: "hard" },
];

const ui = {
  startRace: document.getElementById("start-race"),
  runLap: document.getElementById("run-lap"),
  quickRace: document.getElementById("quick-race"),
  paceMode: document.getElementById("pace-mode"),
  pitCall: document.getElementById("pit-call"),
  raceSummary: document.getElementById("race-summary"),
  raceStatus: document.getElementById("race-status"),
  lapInfo: document.getElementById("lap-info"),
  leaderboard: document.getElementById("leaderboard"),
};

let race = null;

function seedWeather() {
  return Array.from({ length: TOTAL_LAPS }, (_, i) => {
    const baseline = i > 5 ? 0.34 : 0.18;
    return Math.random() < baseline;
  });
}

function makeDriver(name, stats, isPlayer = false) {
  return {
    name,
    isPlayer,
    stats,
    tire: { compound: stats.compound || "medium", age: 0 },
    total: 0,
    laps: [],
    pits: 0,
    penalties: 0,
    pushes: 0,
  };
}

function initRace() {
  const player = makeDriver(
    "Guest Driver",
    { pace: 89, tire: 84, wet: 77, overtake: 82, consistency: 85, compound: "medium" },
    true,
  );

  race = {
    lap: 0,
    weather: seedWeather(),
    overtakeWindows: [3, 5, 8, 10, 12],
    finished: false,
    drivers: [player, ...aiProfiles.map((p) => makeDriver(p.name, p))],
  };

  ui.runLap.disabled = false;
  ui.quickRace.disabled = false;
  ui.startRace.textContent = "Restart race";
  ui.raceStatus.textContent = "Lap 0/12";
  ui.raceSummary.textContent = "Race started. Set pace + pit call, then run the next lap.";

  render();
}

function pitDriver(driver, compound) {
  if (compound === "none") return 0;
  driver.tire.compound = compound;
  driver.tire.age = 0;
  driver.pits += 1;
  const safetyCarChance = Math.random() < 0.12;
  return safetyCarChance ? 12.5 : PIT_LOSS;
}

function lapTimeFor(driver, lapIndex, paceMode, pitChoice) {
  const weatherWet = race.weather[lapIndex];
  const comp = compounds[driver.tire.compound];
  const mode = paceModes[paceMode];

  if (paceMode === "push") driver.pushes += 1;

  const skillPace = (92 - driver.stats.pace) * 0.11;
  const tireWear = Math.max(0, driver.tire.age - 1) * comp.wear * (1.18 - driver.stats.tire / 100);
  const weatherPenalty = weatherWet
    ? Math.max(0, WET_PENALTY + comp.wetPenalty - driver.stats.wet * 0.06)
    : driver.tire.compound === "inter"
      ? 2.6
      : 0;

  const randomnessSpan = Math.max(0.28, 1.45 - driver.stats.consistency / 100);
  const consistencyNoise = (Math.random() - 0.5) * 2 * randomnessSpan;

  let lap = BASE_LAP_TIME + comp.pace + skillPace + tireWear + weatherPenalty + mode.delta + consistencyNoise;

  if (pitChoice && pitChoice !== "none") {
    lap += pitDriver(driver, pitChoice);
  }

  if (paceMode === "push" && driver.pushes >= 3 && Math.random() < 0.18) {
    lap += 1.6; // overheat / lockup risk
    driver.penalties += 1;
  }

  driver.tire.age += mode.wear;
  return lap;
}

function chooseAiMode(driver, lapIndex, weatherWet) {
  const tireAgeRisk = driver.tire.age > 4.2;
  const wetMismatch = weatherWet && driver.tire.compound !== "inter";
  if (wetMismatch || tireAgeRisk) return "push";
  if (lapIndex > 8 && driver.stats.overtake > 84) return "push";
  if (driver.stats.tire > 88) return "conserve";
  return "balanced";
}

function chooseAiPit(driver, lapIndex, weatherWet) {
  if (weatherWet && driver.tire.compound !== "inter") return "inter";
  if (!weatherWet && driver.tire.compound === "inter") return "medium";
  if (driver.tire.age > 5.1 && lapIndex < TOTAL_LAPS - 1) {
    return driver.stats.pace > 90 ? "soft" : "medium";
  }
  return "none";
}

function applyOvertakes(lapNumber) {
  if (!race.overtakeWindows.includes(lapNumber)) return [];

  const swings = [];
  race.drivers.sort((a, b) => a.total - b.total);

  for (let i = 1; i < race.drivers.length; i += 1) {
    const front = race.drivers[i - 1];
    const back = race.drivers[i];
    const gap = back.total - front.total;
    if (gap > 1.45) continue;

    const attackScore = back.stats.overtake + Math.max(0, 4 - back.tire.age) * 2;
    const defendScore = front.stats.consistency + Math.max(0, 4 - front.tire.age);
    if (attackScore - defendScore > 3 && Math.random() < 0.56) {
      const temp = race.drivers[i - 1];
      race.drivers[i - 1] = race.drivers[i];
      race.drivers[i] = temp;
      swings.push(`${back.name} passes ${front.name}`);
    }
  }

  return swings;
}

function runLap() {
  if (!race || race.finished) return;

  const lapIndex = race.lap;
  const weatherWet = race.weather[lapIndex];
  const playerMode = ui.paceMode.value;
  const playerPit = ui.pitCall.value;

  race.drivers.forEach((driver) => {
    const mode = driver.isPlayer ? playerMode : chooseAiMode(driver, lapIndex, weatherWet);
    const pit = driver.isPlayer ? playerPit : chooseAiPit(driver, lapIndex, weatherWet);
    const lapTime = lapTimeFor(driver, lapIndex, mode, pit);
    driver.total += lapTime;
    driver.laps.push({ lap: lapIndex + 1, lapTime, mode, pit, weatherWet });
  });

  race.lap += 1;
  const swings = applyOvertakes(race.lap);

  race.drivers.sort((a, b) => a.total - b.total);

  const leader = race.drivers[0];
  const player = race.drivers.find((d) => d.isPlayer);
  const playerPos = race.drivers.findIndex((d) => d.isPlayer) + 1;
  const gap = player.total - leader.total;

  ui.raceStatus.textContent = `Lap ${race.lap}/${TOTAL_LAPS}`;
  ui.raceSummary.textContent = `Lap ${race.lap}: ${weatherWet ? "Wet" : "Dry"}. You are P${playerPos} (${gap <= 0.01 ? "Leader" : `+${gap.toFixed(2)}s`}). ${swings.join(" • ")}`;

  if (race.lap >= TOTAL_LAPS) {
    race.finished = true;
    ui.runLap.disabled = true;
    ui.quickRace.disabled = true;

    const best = Number(localStorage.getItem("racepactBestPos") || 99);
    if (playerPos < best) {
      localStorage.setItem("racepactBestPos", String(playerPos));
      ui.raceSummary.textContent += " New personal best saved locally.";
    }

    ui.raceStatus.textContent = "Finished";
    ui.raceSummary.textContent = `Finish: P${playerPos}/${race.drivers.length}. ${playerPos <= 3 ? "Podium!" : "Run it back instantly."} No login required.`;
  }

  render();
}

function render() {
  if (!race) {
    ui.lapInfo.innerHTML = "<div>Press <strong>Start instant race</strong> to play as guest.</div>";
    ui.leaderboard.innerHTML = "";
    return;
  }

  const lapN = race.lap;
  const wetLaps = race.weather.filter(Boolean).length;
  const nextLapWet = lapN < TOTAL_LAPS ? race.weather[lapN] : null;
  const bestPos = Number(localStorage.getItem("racepactBestPos") || 99);

  ui.lapInfo.innerHTML = [
    `<div><strong>Lap:</strong> ${lapN}/${TOTAL_LAPS}</div>`,
    `<div><strong>Weather trend:</strong> ${wetLaps} wet laps projected</div>`,
    `<div><strong>Next lap:</strong> ${nextLapWet === null ? "Race complete" : nextLapWet ? "Wet risk" : "Dry"}</div>`,
    `<div><strong>Best guest finish:</strong> ${bestPos === 99 ? "N/A" : `P${bestPos}`}</div>`,
  ].join("");

  const leaderTotal = race.drivers[0]?.total ?? 0;
  ui.leaderboard.innerHTML = race.drivers
    .map((driver, i) => {
      const gap = i === 0 ? "Leader" : `+${(driver.total - leaderTotal).toFixed(2)}s`;
      const tire = `${driver.tire.compound.toUpperCase()} (${driver.tire.age.toFixed(1)} laps)`;
      return `<li><strong>P${i + 1} ${driver.name}</strong> — ${gap} · ${tire} · pits: ${driver.pits}</li>`;
    })
    .join("");
}

ui.startRace.addEventListener("click", initRace);
ui.runLap.addEventListener("click", runLap);
ui.quickRace.addEventListener("click", () => {
  while (race && !race.finished) runLap();
});

render();
