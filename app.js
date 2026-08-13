const WORLD = { width: 1000, height: 562, grid: 20 };
const FLOOR_MIN_Y = 270;
const WINDOW_REST_POINT = { x: 420, y: 292 };
const PLAYER = { x: 500, y: 355, radius: 16, speed: 180, direction: "down", walking: false };
const objects = {
  projects: { point: { x: 300, y: 330 }, label: "项目摊位", title: "项目", eyebrow: "PROJECT BOOTH" },
  skills: { point: { x: 580, y: 302 }, label: "技能树", title: "技能树", eyebrow: "SKILL TREE" },
  career: { point: { x: 745, y: 305 }, label: "职业关卡", title: "职业关卡", eyebrow: "CAREER LEVELS" },
  about: { point: { x: 835, y: 330 }, label: "关于我", title: "关于我", eyebrow: "ABOUT ME" },
  contact: { point: { x: 238, y: 447 }, label: "联系我", title: "联系我", eyebrow: "CONTACT" },
  practice: { point: { x: 735, y: 435 }, label: "练习方式", title: "练习方式", eyebrow: "PRACTICE LAB" }
};
const obstacles = [
  { x: 0, y: 88, w: 286, h: 238 },
  { x: 505, y: 38, w: 166, h: 239 },
  { x: 675, y: 36, w: 158, h: 249 },
  { x: 847, y: 153, w: 153, h: 205 },
  { x: 0, y: 370, w: 220, h: 192 },
  { x: 765, y: 365, w: 235, h: 197 },
  { x: 300, y: 170, w: 95, h: 90 }
];

const dom = {
  shell: document.querySelector(".app-shell"),
  room: document.querySelector("#room"),
  player: document.querySelector("#player"),
  sprite: document.querySelector("#playerSprite"),
  target: document.querySelector("#moveTarget"),
  brand: document.querySelector("#brandName"),
  welcome: document.querySelector("#welcomeText"),
  backdrop: document.querySelector("#panelBackdrop"),
  panel: document.querySelector("#contentPanel"),
  panelTitle: document.querySelector("#panelTitle"),
  panelEyebrow: document.querySelector("#panelEyebrow"),
  panelBody: document.querySelector("#panelBody"),
  toast: document.querySelector("#toast")
};

let content = null;
let path = [];
let pendingObject = null;
let pendingSpecial = null;
let nearbyObject = null;
let lastTime = performance.now();
let panelOpen = false;
const keys = new Set();
let spriteFrame = 0;
let lastSpriteChange = 0;
let lastSpritePath = "";
let specialPose = null;
let specialActionPlaying = false;
let specialTimer = null;

const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => dom.toast.classList.remove("show"), 2200);
}

async function loadContent() {
  const response = await fetch("./data/content.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("内容数据加载失败");
  content = await response.json();
  syncIdentity();
}

function syncIdentity() {
  if (!content) return;
  const profile = content.profile;
  dom.brand.textContent = profile.romanizedName;
  dom.welcome.textContent = `你好，我是${profile.displayName}，${profile.roleTitle}。${profile.welcomeSuffix || ""}`;
  document.title = `${profile.displayName}的像素工作室`;
}

function updatePlayerDOM() {
  const playerOffsetX = specialPose ? 65 : 43;
  dom.player.style.transform = `translate3d(${PLAYER.x - playerOffsetX}px, ${PLAYER.y - 154}px, 0)`;
  dom.player.className = `player direction-${PLAYER.direction} ${PLAYER.walking ? "walking" : "idle"}${specialPose ? " action-pose" : ""}`;
  const frame = PLAYER.walking ? spriteFrame : 0;
  const spritePath = specialPose || `./assets/girl/${PLAYER.direction}-${frame}.webp`;
  if (spritePath !== lastSpritePath) {
    dom.sprite.src = spritePath;
    lastSpritePath = spritePath;
  }
}

function cancelSpecialPose() {
  clearTimeout(specialTimer);
  specialTimer = null;
  pendingSpecial = null;
  specialPose = null;
  specialActionPlaying = false;
  updatePlayerDOM();
}

function startWindowRoutine() {
  clearTimeout(specialTimer);
  PLAYER.direction = "down";
  PLAYER.walking = false;
  specialActionPlaying = true;
  const poses = [
    ["front-center", 420],
    ["bend-left", 540], ["front-center", 260],
    ["bend-left", 540], ["front-center", 320],
    ["bend-right", 540], ["front-center", 260],
    ["bend-right", 540], ["front-center", 340]
  ];
  let index = 0;
  const showNextPose = () => {
    if (!specialActionPlaying) return;
    if (index >= poses.length) {
      specialPose = "./assets/girl-actions/reading.webp";
      specialActionPlaying = false;
      updatePlayerDOM();
      return;
    }
    const [pose, duration] = poses[index];
    specialPose = `./assets/girl-actions/${pose}.webp`;
    index += 1;
    updatePlayerDOM();
    specialTimer = setTimeout(showNextPose, duration);
  };
  showToast("做两组侧伸，再靠窗读会儿书。");
  showNextPose();
}

function collides(x, y) {
  if (x < 18 || y < FLOOR_MIN_Y || x > WORLD.width - 18 || y > WORLD.height - 14) return true;
  return obstacles.some(rect => x > rect.x - PLAYER.radius && x < rect.x + rect.w + PLAYER.radius && y > rect.y - PLAYER.radius && y < rect.y + rect.h + PLAYER.radius);
}

function moveBy(dx, dy) {
  const nx = PLAYER.x + dx;
  const ny = PLAYER.y + dy;
  let moved = false;
  if (!collides(nx, PLAYER.y)) { PLAYER.x = nx; moved = true; }
  if (!collides(PLAYER.x, ny)) { PLAYER.y = ny; moved = true; }
  return moved;
}

function chooseDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy) + 1) return dx < 0 ? "left" : "right";
  if (Math.abs(dy) > 1) return dy < 0 ? "up" : "down";
  return PLAYER.direction;
}

function keyboardVector() {
  let x = 0, y = 0;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  if (!x && !y) return null;
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

function gridKey(x, y) { return `${x},${y}`; }
function toGrid(point) { return { x: Math.round(point.x / WORLD.grid), y: Math.round(point.y / WORLD.grid) }; }
function toWorld(cell) { return { x: cell.x * WORLD.grid, y: cell.y * WORLD.grid }; }
function gridWalkable(cell) {
  return cell.x >= 1 && cell.y >= 4 && cell.x <= WORLD.width / WORLD.grid - 1 && cell.y <= WORLD.height / WORLD.grid - 1 && !collides(cell.x * WORLD.grid, cell.y * WORLD.grid);
}

function nearestWalkable(cell) {
  if (gridWalkable(cell)) return cell;
  for (let radius = 1; radius <= 8; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const candidate = { x: cell.x + dx, y: cell.y + dy };
        if (gridWalkable(candidate)) return candidate;
      }
    }
  }
  return null;
}

function findPath(startPoint, endPoint) {
  const start = nearestWalkable(toGrid(startPoint));
  const goal = nearestWalkable(toGrid(endPoint));
  if (!start || !goal) return [];
  const open = [{ ...start, g: 0, f: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[gridKey(start.x, start.y), 0]]);
  const closed = new Set();
  const directions = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
  ];
  const heuristic = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const currentKey = gridKey(current.x, current.y);
    if (closed.has(currentKey)) continue;
    if (current.x === goal.x && current.y === goal.y) {
      const route = [goal];
      let key = currentKey;
      while (cameFrom.has(key)) {
        const previous = cameFrom.get(key);
        route.push(previous);
        key = gridKey(previous.x, previous.y);
      }
      return route.reverse().slice(1).map(toWorld);
    }
    closed.add(currentKey);
    for (const [dx, dy, cost] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!gridWalkable(next)) continue;
      if (dx && dy && (!gridWalkable({ x: current.x + dx, y: current.y }) || !gridWalkable({ x: current.x, y: current.y + dy }))) continue;
      const key = gridKey(next.x, next.y);
      const tentative = current.g + cost;
      if (tentative >= (gScore.get(key) ?? Infinity)) continue;
      cameFrom.set(key, { x: current.x, y: current.y });
      gScore.set(key, tentative);
      open.push({ ...next, g: tentative, f: tentative + heuristic(next, goal) });
    }
  }
  return [];
}

function setMoveTarget(point, objectId = null, specialId = null) {
  path = findPath({ x: PLAYER.x, y: PLAYER.y }, point);
  pendingObject = objectId;
  pendingSpecial = specialId;
  if (!path.length) {
    pendingObject = null;
    if (specialId === "window" && Math.hypot(PLAYER.x - point.x, PLAYER.y - point.y) < 45) {
      pendingSpecial = null;
      startWindowRoutine();
      return;
    }
    pendingSpecial = null;
    showToast("这里暂时走不到，再点近一点试试");
    return;
  }
  dom.target.style.display = "block";
  dom.target.style.left = `${point.x - 10}px`;
  dom.target.style.top = `${point.y - 18}px`;
}

function updateNearby() {
  let winner = null, best = Infinity;
  Object.entries(objects).forEach(([id, object]) => {
    const distance = Math.hypot(PLAYER.x - object.point.x, PLAYER.y - object.point.y);
    if (distance < 78 && distance < best) { winner = id; best = distance; }
  });
  if (winner === nearbyObject) return;
  document.querySelectorAll(".scene-object.nearby").forEach(node => node.classList.remove("nearby"));
  nearbyObject = winner;
  if (winner) document.querySelector(`[data-object="${winner}"]`)?.classList.add("nearby");
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  let moved = false;
  if (!panelOpen && !specialActionPlaying) {
    const vector = keyboardVector();
    if (vector) {
      path = [];
      pendingObject = null;
      pendingSpecial = null;
      dom.target.style.display = "none";
      PLAYER.direction = chooseDirection(vector.x, vector.y);
      moved = moveBy(vector.x * PLAYER.speed * dt, vector.y * PLAYER.speed * dt);
    } else if (path.length) {
      const target = path[0];
      const dx = target.x - PLAYER.x;
      const dy = target.y - PLAYER.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 5) {
        path.shift();
      } else {
        PLAYER.direction = chooseDirection(dx, dy);
        const step = Math.min(PLAYER.speed * dt, distance);
        moved = moveBy((dx / distance) * step, (dy / distance) * step);
        if (!moved) path = [];
      }
      if (!path.length) {
        dom.target.style.display = "none";
        updateNearby();
        if (pendingObject && nearbyObject === pendingObject) openPanel(pendingObject);
        if (pendingSpecial === "window") startWindowRoutine();
        pendingObject = null;
        pendingSpecial = null;
      }
    }
  }
  PLAYER.walking = moved;
  if (moved && now - lastSpriteChange > 115) {
    spriteFrame = (spriteFrame + 1) % 4;
    lastSpriteChange = now;
  } else if (!moved) {
    spriteFrame = 0;
  }
  updateNearby();
  updatePlayerDOM();
  requestAnimationFrame(gameLoop);
}

function cards(items, render) {
  if (!items?.length) return `<p class="content-card">这里还在布置中，稍后再来看看吧。</p>`;
  return `<div class="card-grid">${items.map(render).join("")}</div>`;
}

function panelHTML(id) {
  const p = content.profile;
  if (id === "projects") return cards(content.projects, item => `<article class="content-card"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.summary)}</p><div>${(item.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div></article>`);
  if (id === "skills") return cards(content.skills, item => `<article class="content-card"><h3>${escapeHTML(item.name)}</h3><span class="tag">${escapeHTML(item.level)}</span><p>${escapeHTML(item.evidence)}</p></article>`);
  if (id === "career") return `<div class="timeline">${content.career.map(item => `<article class="content-card">${item.period ? `<span class="tag">${escapeHTML(item.period)}</span>` : ""}<h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></article>`).join("")}</div>`;
  if (id === "practice") return cards(content.practice, item => `<article class="content-card"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></article>`);
  if (id === "about") {
    const photos = content.photos?.length ? `<h3>旅行相册</h3><div class="photo-grid">${content.photos.map(photo => `<figure class="photo-card"><img src="${escapeHTML(photo.thumbUrl || photo.url)}" data-full="${escapeHTML(photo.url)}" alt="${escapeHTML(photo.alt || photo.title)}" loading="lazy" decoding="async"><figcaption>${escapeHTML(photo.title || "旅行片段")}</figcaption></figure>`).join("")}</div>` : `<p class="content-card">旅行相册还在整理中。</p>`;
    return `<article class="content-card"><h3>${escapeHTML(p.displayName)} · ${escapeHTML(p.roleTitle)}</h3><p>${escapeHTML(p.about)}</p><span class="tag">${escapeHTML(p.status)}</span></article>${photos}`;
  }
  if (id === "contact") return `<article class="content-card"><h3>写一封信给我</h3><p>${escapeHTML(p.status)}</p><p><a href="mailto:${escapeHTML(p.email)}">${escapeHTML(p.email)}</a></p></article>`;
  return "";
}

function openPanel(id, updateHash = true) {
  if (!objects[id] || !content) return;
  panelOpen = true;
  path = [];
  dom.target.style.display = "none";
  dom.panelEyebrow.textContent = objects[id].eyebrow;
  dom.panelTitle.textContent = objects[id].title;
  dom.panelBody.innerHTML = panelHTML(id);
  dom.backdrop.hidden = false;
  dom.panel.scrollTop = 0;
  dom.panel.querySelector(".close-button")?.focus();
  if (updateHash) history.replaceState(null, "", `#/explore/${id}`);
}

function closePanel() {
  panelOpen = false;
  dom.backdrop.hidden = true;
  history.replaceState(null, "", "#/");
  dom.room.focus({ preventScroll: true });
}

function pointFromClick(event) {
  const rect = dom.room.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * WORLD.width, y: (event.clientY - rect.top) / rect.height * WORLD.height };
}

function bindGameEvents() {
  const directionForKey = {
    w: "up", arrowup: "up",
    s: "down", arrowdown: "down",
    a: "left", arrowleft: "left",
    d: "right", arrowright: "right"
  };
  document.addEventListener("keydown", event => {
    const tag = event.target?.tagName?.toLowerCase();
    const editing = ["input", "textarea", "select", "button", "a"].includes(tag) || event.target?.isContentEditable;
    if (editing) return;
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
      cancelSpecialPose();
      keys.add(key);
      path = [];
      pendingObject = null;
      pendingSpecial = null;
      dom.target.style.display = "none";
      PLAYER.direction = directionForKey[key];
      updatePlayerDOM();
    }
    if (event.code === "Space" && nearbyObject && !panelOpen) {
      event.preventDefault(); openPanel(nearbyObject);
    }
    if (event.key === "Escape" && panelOpen) closePanel();
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  dom.room.addEventListener("click", event => {
    if (panelOpen) return;
    const specialNode = event.target.closest('[data-special="window"]');
    if (specialNode) {
      cancelSpecialPose();
      dom.room.focus({ preventScroll: true });
      setMoveTarget(WINDOW_REST_POINT, null, "window");
      return;
    }
    cancelSpecialPose();
    const objectNode = event.target.closest(".scene-object");
    if (objectNode) {
      const id = objectNode.dataset.object;
      if (nearbyObject === id) openPanel(id);
      else setMoveTarget(objects[id].point, id);
      return;
    }
    setMoveTarget(pointFromClick(event));
  });
  document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => openPanel(button.dataset.open)));
  document.querySelectorAll("[data-home]").forEach(button => button.addEventListener("click", () => {
    if (panelOpen) closePanel();
    history.replaceState(null, "", "#/");
    dom.room.focus({ preventScroll: true });
  }));
  document.querySelector("#closePanel").addEventListener("click", closePanel);
  dom.backdrop.addEventListener("click", event => { if (event.target === dom.backdrop) closePanel(); });
  document.querySelector("#skipToContent").addEventListener("click", () => openPanel("about"));
  document.querySelector(".dialogue").addEventListener("click", event => event.stopPropagation());
}

function preloadCharacterSprites() {
  ["down", "left", "right", "up"].forEach(direction => {
    for (let frame = 0; frame < 4; frame += 1) {
      const image = new Image();
      image.src = `./assets/girl/${direction}-${frame}.webp`;
    }
  });
  const preloadActions = () => ["front-center", "bend-left", "bend-right", "reading"].forEach(name => {
    const image = new Image();
    image.src = `./assets/girl-actions/${name}.webp`;
  });
  if ("requestIdleCallback" in window) window.requestIdleCallback(preloadActions, { timeout: 1800 });
  else setTimeout(preloadActions, 900);
}

async function route() {
  const match = location.hash.match(/^#\/explore\/(\w+)/);
  if (match && objects[match[1]]) openPanel(match[1], false);
  else if (panelOpen) { panelOpen = false; dom.backdrop.hidden = true; }
}

async function init() {
  try {
    await loadContent();
    preloadCharacterSprites();
    bindGameEvents();
    updatePlayerDOM();
    window.addEventListener("hashchange", route);
    await route();
    requestAnimationFrame(gameLoop);
  } catch (error) {
    document.body.innerHTML = `<main class="login-card"><h1>页面暂时没有打开</h1><p>${escapeHTML(error.message)}</p><button onclick="location.reload()" class="pixel-button">重新尝试</button></main>`;
  }
}

init();
