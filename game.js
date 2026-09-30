const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const ROAD_TOP = 80;
const ROAD_BOTTOM = canvas.height - 46;
const BOTTOM_Y = ROAD_BOTTOM;
const lanePositions = [canvas.width * 0.34, canvas.width * 0.5, canvas.width * 0.66];

const game = {
  state: 'ready',
  score: 0,
  best: Number(localStorage.getItem('bike-game-best') || 0),
  speed: 6,
  time: 0,
  frame: 0,
  spawnTimer: 0,
  obstacleStep: 120,
};

const bike = {
  x: lanePositions[1],
  y: BOTTOM_Y,
  width: 82,
  height: 42,
  laneIndex: 1,
  targetX: lanePositions[1],
  jumpVelocity: 0,
  jumpPower: 13,
  isJumping: false,
  rotation: 0,
};

const obstacles = [];
const coins = [];

function resetBike() {
  bike.laneIndex = 1;
  bike.x = lanePositions[1];
  bike.targetX = bike.x;
  bike.y = BOTTOM_Y;
  bike.jumpVelocity = 0;
  bike.isJumping = false;
  bike.rotation = 0;
}

function setBestScore() {
  if (game.score > game.best) {
    game.best = game.score;
    localStorage.setItem('bike-game-best', String(game.best));
  }
  bestEl.textContent = game.best;
}

function resetGame() {
  game.state = 'playing';
  game.score = 0;
  game.speed = 6;
  game.time = 0;
  game.frame = 0;
  game.spawnTimer = 0;
  game.obstacleStep = 120;
  obstacles.length = 0;
  coins.length = 0;
  resetBike();
  scoreEl.textContent = '0';
  setBestScore();
}

function startGame() {
  if (game.state === 'ready') {
    resetGame();
  }
}

function gameOver() {
  game.state = 'gameover';
  setBestScore();
}

function handleInput(event) {
  const key = event.key.toLowerCase();

  if (key === 'r' && game.state === 'gameover') {
    resetGame();
    return;
  }

  if (event.key === 'ArrowLeft' || key === 'a') {
    moveBike(-1);
  }

  if (event.key === 'ArrowRight' || key === 'd') {
    moveBike(1);
  }

  if (event.key === 'ArrowUp' || key === 'w' || event.code === 'Space') {
    if (!bike.isJumping && game.state !== 'gameover') {
      bike.isJumping = true;
      bike.jumpVelocity = -bike.jumpPower;
      event.preventDefault();
    }
  }

  if (game.state === 'ready' && (event.key === 'Enter' || key === ' ')) {
    resetGame();
  }
}

function moveBike(direction) {
  if (game.state === 'gameover') return;
  bike.laneIndex = Math.max(0, Math.min(2, bike.laneIndex + direction));
  bike.targetX = lanePositions[bike.laneIndex];
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanePositions.length);
  const obstacle = {
    lane,
    x: lanePositions[lane],
    y: ROAD_TOP - 20,
    width: 52,
    height: 52,
    type: Math.random() > 0.6 ? 'cone' : 'barrier',
  };
  obstacles.push(obstacle);
}

function spawnCoin() {
  const lane = Math.floor(Math.random() * lanePositions.length);
  const coin = {
    lane,
    x: lanePositions[lane],
    y: ROAD_TOP - 30,
    radius: 12,
    value: 10,
  };
  coins.push(coin);
}

function update(delta) {
  if (game.state !== 'playing') return;

  game.frame += delta;
  game.time += delta;
  game.score += delta * 0.05;
  game.speed += delta * 0.002;
  game.spawnTimer += delta;

  if (game.spawnTimer > Math.max(55, game.obstacleStep - game.speed * 2)) {
    game.spawnTimer = 0;
    spawnObstacle();

    if (Math.random() > 0.4) {
      spawnCoin();
    }
  }

  bike.x += (bike.targetX - bike.x) * 0.18;
  bike.rotation = (bike.targetX - bike.x) * 0.05;

  if (bike.isJumping) {
    bike.jumpVelocity += 0.65;
    bike.y += bike.jumpVelocity;

    if (bike.y >= BOTTOM_Y) {
      bike.y = BOTTOM_Y;
      bike.isJumping = false;
      bike.jumpVelocity = 0;
    }
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.y += game.speed;

    if (obstacle.y > canvas.height + 30) {
      obstacles.splice(i, 1);
      continue;
    }

    if (isColliding(bike, obstacle)) {
      gameOver();
      return;
    }
  }

  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.y += game.speed;

    if (coin.y > canvas.height + 30) {
      coins.splice(i, 1);
      continue;
    }

    if (distanceBetweenPoints(coin.x, coin.y, bike.x, bike.y) < 36) {
      game.score += coin.value;
      coins.splice(i, 1);
    }
  }

  scoreEl.textContent = Math.floor(game.score);
}

function isColliding(a, b) {
  const bx = a.x - a.width / 2;
  const by = a.y - a.height / 2;
  const ax = b.x - b.width / 2;
  const ay = b.y - b.height / 2;

  return (
    bx < ax + b.width &&
    bx + a.width > ax &&
    by < ay + b.height &&
    by + a.height > ay
  );
}

function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function drawBackground() {
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, ROAD_TOP, canvas.width, ROAD_BOTTOM - ROAD_TOP + 20);

  ctx.fillStyle = '#f8fafc';
  for (let i = 0; i < 20; i++) {
    const x = (i * 120 + (game.frame * 0.6) % 120) - 60;
    ctx.fillRect(x, ROAD_TOP + 25, 50, 8);
  }

  for (let i = 0; i < 18; i++) {
    const y = ROAD_TOP + i * 35 + (game.frame * 0.45 % 35);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, y, canvas.width, 2);
  }
}

function drawBike() {
  ctx.save();
  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.rotation);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-38, -14, 76, 28);

  ctx.fillStyle = '#111827';
  ctx.fillRect(-32, -18, 18, 12);
  ctx.fillRect(14, -18, 18, 12);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-24, -24, 10, 8);
  ctx.fillRect(14, -24, 10, 8);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-38, 12, 12, 18);
  ctx.fillRect(26, 12, 12, 18);

  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);

    if (obstacle.type === 'cone') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-20, 22);
      ctx.lineTo(20, 22);
      ctx.lineTo(0, -22);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-24, -18, 48, 40);
    }

    ctx.restore();
  }
}

function drawCoins() {
  for (const coin of coins) {
    ctx.beginPath();
    ctx.fillStyle = '#facc15';
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawGameOver() {
  if (game.state !== 'gameover') return;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = 'bold 26px Arial';
  ctx.fillText(`Score: ${Math.floor(game.score)}`, canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 80);
}

function drawStartMessage() {
  if (game.state !== 'ready') return;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 55px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Bike Rush', canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = 'bold 22px Arial';
  ctx.fillText('Press Enter or Space to Start', canvas.width / 2, canvas.height / 2 + 34);
}

function render() {
  drawBackground();
  drawCoins();
  drawObstacles();
  drawBike();
  drawStartMessage();
  drawGameOver();
}

let lastTime = 0;
function loop(timestamp) {
  const delta = Math.min(32, timestamp - lastTime || 16);
  lastTime = timestamp;

  update(delta);
  render();
  requestAnimationFrame(loop);
}

bestEl.textContent = game.best;
resetBike();
requestAnimationFrame(loop);
document.addEventListener('keydown', handleInput);
window.addEventListener('keydown', (event) => {
  if (event.key === ' ' && game.state === 'ready') {
    event.preventDefault();
    resetGame();
  }
});
