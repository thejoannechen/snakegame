const GRID_SIZE = 16;
const BASE_TICK_MS = 220;
const MIN_TICK_MS = 110;
const SPEED_STEP_SCORE = 4;

const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const seasonEl = document.getElementById("season");
const overlay = document.getElementById("overlay");
const restartBtn = document.getElementById("restart");
const onboardingEl = document.getElementById("onboarding");
const onboardingText = document.getElementById("onboarding-text");
const onboardingNext = document.getElementById("onboarding-next");
const onboardingSkip = document.getElementById("onboarding-skip");

const btnUp = document.getElementById("up");
const btnDown = document.getElementById("down");
const btnLeft = document.getElementById("left");
const btnRight = document.getElementById("right");

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let cells = [];
let state = null;
let timer = null;
let currentTickMs = BASE_TICK_MS;
let onboardingIndex = 0;
let onboardingDone = false;

const SEASONS = [
  { name: "Spring", colors: ["#8ccf7a", "#c9e27c", "#f2d27a"] },
  { name: "Summer", colors: ["#8fcf6a", "#d9c262", "#f2b55a"] },
  { name: "Autumn", colors: ["#d8894a", "#c75d3a", "#f0a55b"] },
  { name: "Winter", colors: ["#9dc9e9", "#b8dff2", "#e9f3f7"] },
];

const FOODS_PER_SEASON = 5;
const ONBOARDING_STEPS = [
  "Use arrow keys or WASD to move the snake.",
  "Gray stone blocks are obstacles. Hitting them ends the game.",
  "Some foods are rainbow and make your snake rainbow too.",
];

function createBoard() {
  board.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;
  board.innerHTML = "";
  cells = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    board.appendChild(cell);
    cells.push(cell);
  }
}

function initialState() {
  const start = {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
  };
  const initialSnake = [start, { x: start.x - 1, y: start.y }];
  const seasonIndex = 0;
  const obstacles = generateObstacles(initialSnake, seasonIndex);
  const firstFood = makeFood(initialSnake, obstacles, seasonIndex);
  return {
    snake: initialSnake,
    direction: "right",
    nextDirection: "right",
    food: firstFood.pos,
    foodColor: firstFood.color,
    foodDynamic: firstFood.dynamic,
    score: 0,
    foodsEaten: 0,
    seasonIndex,
    obstacles,
    speedLevel: 1,
    snakeColor: "linear-gradient(135deg, #3b6238, #55824e)",
    snakeDynamic: false,
    status: "running",
  };
}

function toIndex(point) {
  return point.y * GRID_SIZE + point.x;
}

function reachableCells(snake, obstacles) {
  const blocked = new Set();
  snake.forEach((segment, index) => {
    if (index !== snake.length - 1) {
      blocked.add(toIndex(segment));
    }
  });
  obstacles.forEach((block) => blocked.add(toIndex(block)));

  const head = snake[0];
  const startIdx = toIndex(head);
  const visited = new Set([startIdx]);
  const queue = [head];
  const reachable = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ].filter(
      (cell) =>
        cell.x >= 0 &&
        cell.y >= 0 &&
        cell.x < GRID_SIZE &&
        cell.y < GRID_SIZE
    );

    neighbors.forEach((cell) => {
      const idx = toIndex(cell);
      if (blocked.has(idx) || visited.has(idx)) return;
      visited.add(idx);
      queue.push(cell);
      reachable.push(cell);
    });
  }

  return reachable;
}

function placeFood(snake, obstacles) {
  const reachable = reachableCells(snake, obstacles);
  if (reachable.length === 0) return null;
  return reachable[Math.floor(Math.random() * reachable.length)];
}

function randomFoodColor(seasonIndex) {
  const colors = SEASONS[seasonIndex].colors;
  return colors[Math.floor(Math.random() * colors.length)];
}

function makeFood(snake, obstacles, seasonIndex) {
  const pos = placeFood(snake, obstacles);
  const dynamic = Math.random() < 0.2;
  return {
    pos,
    dynamic,
    color: dynamic ? null : randomFoodColor(seasonIndex),
  };
}

function generateObstacles(snake, seasonIndex) {
  const targetCells = 3 + seasonIndex * 2;
  const occupied = new Set(snake.map((segment) => toIndex(segment)));
  const obstacles = [];
  const obstacleSet = new Set();

  function addCell(cell) {
    const idx = toIndex(cell);
    if (occupied.has(idx) || obstacleSet.has(idx)) return false;
    obstacleSet.add(idx);
    obstacles.push({ ...cell });
    return true;
  }

  while (obstacles.length < targetCells) {
    const origin = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!addCell(origin)) continue;

    const clusterSize = Math.min(3, targetCells - obstacles.length + 1);
    for (let i = 1; i < clusterSize; i += 1) {
      const prev = obstacles[obstacles.length - 1];
      const options = [
        { x: prev.x + 1, y: prev.y },
        { x: prev.x - 1, y: prev.y },
        { x: prev.x, y: prev.y + 1 },
        { x: prev.x, y: prev.y - 1 },
      ].filter(
        (cell) =>
          cell.x >= 0 &&
          cell.y >= 0 &&
          cell.x < GRID_SIZE &&
          cell.y < GRID_SIZE
      );
      if (options.length === 0) break;
      const pick = options[Math.floor(Math.random() * options.length)];
      addCell(pick);
    }
  }
  return obstacles;
}

function isOpposite(a, b) {
  if (!a || !b) return false;
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function step(current) {
  if (current.status !== "running") return current;

  const direction = current.nextDirection;
  const delta = DIRECTIONS[direction];
  const head = current.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y >= GRID_SIZE
  ) {
    return { ...current, status: "gameover" };
  }

  const hitsSelf = current.snake.some(
    (segment, index) =>
      index !== current.snake.length - 1 &&
      segment.x === nextHead.x &&
      segment.y === nextHead.y
  );
  if (hitsSelf) {
    return { ...current, status: "gameover" };
  }

  const hitsObstacle = current.obstacles.some(
    (block) => block.x === nextHead.x && block.y === nextHead.y
  );
  if (hitsObstacle) {
    return { ...current, status: "gameover" };
  }

  const nextSnake = [nextHead, ...current.snake];
  let nextFood = current.food;
  let nextFoodColor = current.foodColor;
  let nextFoodDynamic = current.foodDynamic;
  let nextScore = current.score;
  let nextFoodsEaten = current.foodsEaten;
  let nextSeasonIndex = current.seasonIndex;
  let nextObstacles = current.obstacles;
  let nextSnakeColor = current.snakeColor;
  let nextSnakeDynamic = current.snakeDynamic;

  const ateFood = nextFood && nextHead.x === nextFood.x && nextHead.y === nextFood.y;
  if (ateFood) {
    nextScore += 1;
    nextFoodsEaten += 1;
    if (nextFoodsEaten % FOODS_PER_SEASON === 0) {
      nextSeasonIndex = (current.seasonIndex + 1) % SEASONS.length;
      nextObstacles = generateObstacles(nextSnake, nextSeasonIndex);
    }
    const next = makeFood(nextSnake, nextObstacles, nextSeasonIndex);
    nextFood = next.pos;
    nextFoodColor = next.color;
    nextFoodDynamic = next.dynamic;
    if (current.foodDynamic) {
      nextSnakeDynamic = true;
    } else {
      nextSnakeDynamic = false;
      nextSnakeColor = current.foodColor || nextSnakeColor;
    }
  } else {
    nextSnake.pop();
  }

  return {
    ...current,
    snake: nextSnake,
    direction,
    food: nextFood,
    foodColor: nextFoodColor,
    foodDynamic: nextFoodDynamic,
    score: nextScore,
    foodsEaten: nextFoodsEaten,
    seasonIndex: nextSeasonIndex,
    obstacles: nextObstacles,
    snakeColor: nextSnakeColor,
    snakeDynamic: nextSnakeDynamic,
  };
}

function render(current) {
  cells.forEach((cell) => {
    cell.className = "cell";
    cell.style.background = "";
  });

  current.snake.forEach((segment) => {
    const idx = toIndex(segment);
    if (cells[idx]) {
      cells[idx].classList.add("snake");
    }
  });

  current.obstacles.forEach((block) => {
    const idx = toIndex(block);
    if (cells[idx]) {
      cells[idx].classList.add("obstacle");
    }
  });

  if (current.food) {
    const foodIdx = toIndex(current.food);
    if (cells[foodIdx]) {
      cells[foodIdx].classList.add("food");
      if (current.foodDynamic) {
        cells[foodIdx].classList.add("dynamic");
      } else {
        cells[foodIdx].style.background = current.foodColor;
      }
    }
  }

  scoreEl.textContent = String(current.score);
  speedEl.textContent = `${current.speedLevel}x`;
  seasonEl.textContent = SEASONS[current.seasonIndex].name;
  board.style.setProperty("--snake-color", current.snakeColor);
  board.classList.toggle("dynamic-snake", current.snakeDynamic);
  board.classList.remove("season-spring", "season-summer", "season-autumn", "season-winter");
  board.classList.add(
    ["season-spring", "season-summer", "season-autumn", "season-winter"][
      current.seasonIndex
    ]
  );
  if (current.status === "gameover") {
    restartBtn.textContent = "Restart";
  } else if (!timer) {
    restartBtn.textContent = "Start";
  } else {
    restartBtn.textContent = "Restart";
  }
  overlay.hidden = current.status !== "gameover";
  onboardingEl.hidden = onboardingDone;
}

function computeSpeedLevel(score) {
  return Math.min(1 + Math.floor(score / SPEED_STEP_SCORE), 6);
}

function speedToTickMs(speedLevel) {
  const step = (BASE_TICK_MS - MIN_TICK_MS) / 5;
  return Math.round(BASE_TICK_MS - step * (speedLevel - 1));
}

function loop() {
  state = step(state);
  maybeUpdateSpeed();
  render(state);
  if (state.status === "gameover") {
    stop();
  }
}

function start() {
  if (!onboardingDone) return;
  stop();
  state = initialState();
  state.speedLevel = computeSpeedLevel(state.score);
  render(state);
  currentTickMs = speedToTickMs(state.speedLevel);
  timer = setInterval(loop, currentTickMs);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function setDirection(next) {
  if (!state || state.status !== "running") return;
  if (isOpposite(state.direction, next)) return;
  state.nextDirection = next;
}

function maybeUpdateSpeed() {
  const nextLevel = computeSpeedLevel(state.score);
  if (nextLevel !== state.speedLevel) {
    state.speedLevel = nextLevel;
    const nextTick = speedToTickMs(nextLevel);
    if (nextTick !== currentTickMs) {
      stop();
      currentTickMs = nextTick;
      timer = setInterval(loop, currentTickMs);
    }
  }
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") {
    setDirection("up");
  } else if (key === "arrowdown" || key === "s") {
    setDirection("down");
  } else if (key === "arrowleft" || key === "a") {
    setDirection("left");
  } else if (key === "arrowright" || key === "d") {
    setDirection("right");
  } else if (key === "r") {
    start();
  } else if (key === " " || key === "enter") {
    if (!timer) {
      start();
    }
  }
}

btnUp.addEventListener("click", () => setDirection("up"));
btnDown.addEventListener("click", () => setDirection("down"));
btnLeft.addEventListener("click", () => setDirection("left"));
btnRight.addEventListener("click", () => setDirection("right"));
restartBtn.addEventListener("click", () => start());
onboardingNext.addEventListener("click", () => {
  onboardingIndex += 1;
  if (onboardingIndex >= ONBOARDING_STEPS.length) {
    onboardingDone = true;
    onboardingEl.hidden = true;
    restartBtn.disabled = false;
    restartBtn.textContent = "Start";
    start();
  } else {
    onboardingText.textContent = ONBOARDING_STEPS[onboardingIndex];
    if (onboardingIndex === ONBOARDING_STEPS.length - 1) {
      onboardingNext.textContent = "Start";
    }
  }
});

onboardingSkip.addEventListener("click", () => {
  onboardingDone = true;
  onboardingEl.hidden = true;
  restartBtn.disabled = false;
  restartBtn.textContent = "Start";
  start();
});

window.addEventListener("keydown", handleKey);

createBoard();
state = initialState();
state.status = "ready";
render(state);
onboardingText.textContent = ONBOARDING_STEPS[0];
onboardingNext.textContent = "Next";
onboardingEl.hidden = false;
restartBtn.disabled = true;
