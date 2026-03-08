(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.RaceCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TOTAL_TURNS = 12;
  const PLAYER_BOOSTERS = [2, 2, 1];
  const FOCUS_TYPES = ["straight", "curve"];

  const CAR_ROSTER = [
    "Guest Driver", "Apex Voss", "Mira Kane", "Ion Brega", "Nova Zell", "Taro Lin", "Rex Monza", "Vale Nix",
    "Luca Drift", "Sena Volt", "Kai Torq", "Nia Pulse", "Bran Helix", "Juno Apex", "Orin Dash", "Zara Slip",
    "Mako Ridge", "Ivy Clutch", "Dax Spear", "Pia Flux", "Rho Stride", "Theo Arc",
  ];

  function createCar(name, straight, curve, reliability, isPlayer = false) {
    return {
      name,
      isPlayer,
      straight,
      curve,
      reliability,
      progress: 0,
      boosters: [...PLAYER_BOOSTERS],
      lastScore: 0,
    };
  }

  function seededCar(index) {
    const straight = 6 + (index * 3) % 5; // 6-10
    const curve = 6 + (index * 5) % 5; // 6-10
    const reliability = 65 + (index * 7) % 31; // 65-95
    return { straight, curve, reliability };
  }

  function createCars() {
    return CAR_ROSTER.map((name, i) => {
      if (i === 0) return createCar(name, 8, 8, 82, true);
      const stats = seededCar(i);
      return createCar(name, stats.straight, stats.curve, stats.reliability, false);
    });
  }

  function seedFocuses(random = Math.random) {
    return Array.from({ length: TOTAL_TURNS }, () => (random() < 0.5 ? "straight" : "curve"));
  }

  function getAvailableBoosters(car) {
    const counts = car.boosters.reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    return [
      { value: 0, label: "No booster" },
      ...(counts[1] ? [{ value: 1, label: `+1 (${counts[1]} left)` }] : []),
      ...(counts[2] ? [{ value: 2, label: `+2 (${counts[2]} left)` }] : []),
    ];
  }

  function consumeBooster(car, value) {
    if (!value) return 0;
    const idx = car.boosters.indexOf(value);
    if (idx === -1) return 0;
    car.boosters.splice(idx, 1);
    return value;
  }

  function movementScore(car, focus, booster = 0) {
    return car[focus] + booster;
  }

  function aiBoosterChoice(car, rankingIndex) {
    if (car.boosters.includes(2) && rankingIndex > 8) return 2;
    if (car.boosters.includes(1) && rankingIndex > 3) return 1;
    return 0;
  }

  function reliabilityNoise(reliability, random = Math.random) {
    const span = Math.max(0.35, 1.9 - reliability / 60);
    return (random() - 0.5) * 2 * span;
  }

  function applyMovementSwings(cars) {
    const swings = [];
    for (let i = 1; i < cars.length; i += 1) {
      const front = cars[i - 1];
      const back = cars[i];
      const gap = front.progress - back.progress;
      const momentum = back.lastScore - front.lastScore;
      if (gap <= 1.2 && momentum > 1.05) {
        cars[i - 1] = back;
        cars[i] = front;
        swings.push(`${back.name} moves up past ${front.name}`);
      }
    }
    return swings;
  }

  function initRace(random = Math.random) {
    return {
      turn: 0,
      focuses: seedFocuses(random),
      cars: createCars(),
      finished: false,
      swings: [],
    };
  }

  function resolveTurn(race, playerBooster = 0, random = Math.random) {
    if (!race || race.finished) return race;
    const focus = race.focuses[race.turn];

    race.cars.sort((a, b) => b.progress - a.progress);

    race.cars.forEach((car, index) => {
      const desiredBoost = car.isPlayer ? playerBooster : aiBoosterChoice(car, index);
      const usedBooster = consumeBooster(car, desiredBoost);
      const base = movementScore(car, focus, usedBooster);
      const score = base + reliabilityNoise(car.reliability, random);
      car.lastScore = score;
      car.progress += score;
    });

    race.cars.sort((a, b) => b.progress - a.progress);
    race.swings = applyMovementSwings(race.cars);

    race.turn += 1;
    if (race.turn >= TOTAL_TURNS) {
      race.finished = true;
    }

    return race;
  }

  return {
    TOTAL_TURNS,
    PLAYER_BOOSTERS,
    initRace,
    resolveTurn,
    getAvailableBoosters,
    movementScore,
  };
});
