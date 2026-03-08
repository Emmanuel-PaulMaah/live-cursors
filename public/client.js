const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${location.host}${location.pathname}`);

const board = document.getElementById("board");
const ctx = board.getContext("2d");

const roomLabel = document.getElementById("roomLabel");
const nameInput = document.getElementById("nameInput");
const colorInput = document.getElementById("colorInput");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const clearBtn = document.getElementById("clearBtn");
const presenceEl = document.getElementById("presence");
const logsEl = document.getElementById("logs");

const state = {
  selfId: null,
  room: "default",
  users: new Map(),
  cursors: new Map(),
  isDrawing: false,
  drawPrev: null,
  rafId: null,
};

const fallbackColors = [
  "#ff7c43",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#eab308",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

function log(...args) {
  const line = `[${new Date().toLocaleTimeString()}] ${args.join(" ")}`;
  logsEl.value = `${line}\n${logsEl.value}`.slice(0, 12000);
}

function randomName() {
  const n = Math.floor(Math.random() * 900 + 100);
  return `Builder-${n}`;
}

function randomColor() {
  return fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;

  board.width = Math.floor(w * dpr);
  board.height = Math.floor(h * dpr);
  board.style.width = `${w}px`;
  board.style.height = `${h}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawBoardBackground();
}

function redrawBoardBackground() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  const gap = 32;
  for (let x = 0; x < window.innerWidth; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, window.innerHeight);
    ctx.stroke();
  }

  for (let y = 0; y < window.innerHeight; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(window.innerWidth, y);
    ctx.stroke();
  }
  ctx.restore();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setRoomLabel() {
  roomLabel.textContent = `Room: ${state.room}`;
}

function ensureCursor(user) {
  let el = state.cursors.get(user.id);
  if (el) return el;

  el = document.createElement("div");
  el.className = "cursor";

  const arrow = document.createElement("div");
  arrow.className = "cursor-arrow";
  arrow.style.borderTopColor = user.color;

  const label = document.createElement("div");
  label.className = "cursor-label";
  label.style.background = user.color;
  label.textContent = user.name;

  el.appendChild(arrow);
  el.appendChild(label);
  document.body.appendChild(el);

  state.cursors.set(user.id, el);
  return el;
}

function removeCursor(id) {
  const el = state.cursors.get(id);
  if (el) {
    el.remove();
    state.cursors.delete(id);
  }
}

function upsertUser(user) {
  const prev = state.users.get(user.id);
  const next = {
    id: user.id,
    name: user.name ?? prev?.name ?? "Anonymous",
    color: user.color ?? prev?.color ?? "#ff7c43",
    x: user.x ?? prev?.x ?? 0,
    y: user.y ?? prev?.y ?? 0,
    tx: user.x ?? prev?.tx ?? 0,
    ty: user.y ?? prev?.ty ?? 0,
    isDrawing: user.isDrawing ?? prev?.isDrawing ?? false,
  };
  state.users.set(user.id, next);

  if (user.id !== state.selfId) {
    ensureCursor(next);
  }

  renderPresence();
}

function renderPresence() {
  const users = Array.from(state.users.values())
    .sort((a, b) => (a.id === state.selfId ? -1 : b.id === state.selfId ? 1 : a.name.localeCompare(b.name)));

  presenceEl.innerHTML = "";

  for (const user of users) {
    const card = document.createElement("div");
    card.className = "presence-card";

    const swatch = document.createElement("div");
    swatch.className = "presence-swatch";
    swatch.style.background = user.color;

    const textWrap = document.createElement("div");

    const name = document.createElement("div");
    name.className = "presence-name";
    name.textContent = user.id === state.selfId ? `${user.name} (you)` : user.name;

    const meta = document.createElement("div");
    meta.className = "presence-meta";
    meta.textContent = user.id === state.selfId ? "Connected" : "Live cursor";

    textWrap.appendChild(name);
    textWrap.appendChild(meta);

    card.appendChild(swatch);
    card.appendChild(textWrap);
    presenceEl.appendChild(card);
  }
}

function send(payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function sendIntro() {
  const name = nameInput.value.trim() || "Anonymous";
  const color = colorInput.value;

  localStorage.setItem("lc_name", name);
  localStorage.setItem("lc_color", color);

  send({
    type: "intro",
    name,
    color,
  });

  if (state.selfId) {
    upsertUser({
      id: state.selfId,
      name,
      color,
    });
  }
}

function drawSegment(from, to, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function animate() {
  for (const user of state.users.values()) {
    if (user.id === state.selfId) continue;

    user.x += (user.tx - user.x) * 0.22;
    user.y += (user.ty - user.y) * 0.22;

    const el = ensureCursor(user);
    const label = el.querySelector(".cursor-label");
    const arrow = el.querySelector(".cursor-arrow");

    label.textContent = user.name;
    label.style.background = user.color;
    arrow.style.borderTopColor = user.color;

    el.style.transform = `translate3d(${user.x}px, ${user.y}px, 0)`;
  }

  state.rafId = requestAnimationFrame(animate);
}

function getLocalPoint(clientX, clientY) {
  return {
    x: clamp(clientX, 0, window.innerWidth),
    y: clamp(clientY, 0, window.innerHeight),
  };
}

function handlePointerMove(e) {
  const p = getLocalPoint(e.clientX, e.clientY);

  send({
    type: "cursor",
    x: p.x,
    y: p.y,
  });

  const self = state.users.get(state.selfId);
  if (self) {
    self.x = p.x;
    self.y = p.y;
    self.tx = p.x;
    self.ty = p.y;
  }

  if (state.isDrawing) {
    if (state.drawPrev) {
      drawSegment(state.drawPrev, p, colorInput.value);
    }

    send({
      type: "draw_move",
      x: p.x,
      y: p.y,
    });

    state.drawPrev = p;
  }
}

function handlePointerDown(e) {
  const p = getLocalPoint(e.clientX, e.clientY);
  state.isDrawing = true;
  state.drawPrev = p;

  send({
    type: "draw_start",
    x: p.x,
    y: p.y,
  });
}

function handlePointerUp() {
  if (!state.isDrawing) return;
  state.isDrawing = false;
  state.drawPrev = null;

  send({
    type: "draw_end",
  });
}

ws.addEventListener("open", () => {
  log("socket connected", location.pathname);
});

ws.addEventListener("message", (event) => {
  let msg;
  try {
    msg = JSON.parse(event.data);
  } catch {
    return;
  }

  if (msg.type === "welcome") {
    state.selfId = msg.selfId;
    state.room = msg.room;
    setRoomLabel();

    for (const user of msg.users) {
      upsertUser(user);
    }

    const savedName = localStorage.getItem("lc_name") || randomName();
    const savedColor = localStorage.getItem("lc_color") || randomColor();

    nameInput.value = savedName;
    colorInput.value = savedColor;

    upsertUser({
      id: state.selfId,
      name: savedName,
      color: savedColor,
      x: 0,
      y: 0,
    });

    sendIntro();
    log("welcome", `self=${state.selfId}`, `room=${state.room}`, `users=${msg.users.length}`);
    return;
  }

  if (msg.type === "user_joined") {
    upsertUser(msg.user);
    log("joined", msg.user.name);
    return;
  }

  if (msg.type === "user_updated") {
    upsertUser(msg.user);
    return;
  }

  if (msg.type === "user_left") {
    state.users.delete(msg.id);
    removeCursor(msg.id);
    renderPresence();
    log("left", msg.id);
    return;
  }

  if (msg.type === "cursor") {
    const user = state.users.get(msg.id);
    if (!user) return;
    user.tx = msg.x;
    user.ty = msg.y;
    return;
  }

  if (msg.type === "draw_start") {
    const user = state.users.get(msg.id);
    if (!user) return;
    user.drawPrev = { x: msg.x, y: msg.y };
    return;
  }

  if (msg.type === "draw_move") {
    const user = state.users.get(msg.id);
    if (!user) return;

    const next = { x: msg.x, y: msg.y };
    if (user.drawPrev) {
      drawSegment(user.drawPrev, next, msg.color || user.color);
    }
    user.drawPrev = next;
    return;
  }

  if (msg.type === "draw_end") {
    const user = state.users.get(msg.id);
    if (!user) return;
    user.drawPrev = null;
    return;
  }

  if (msg.type === "clear_board") {
    redrawBoardBackground();
    log("board cleared");
  }
});

ws.addEventListener("close", () => {
  log("socket closed");
});

ws.addEventListener("error", () => {
  log("socket error");
});

nameInput.addEventListener("change", sendIntro);
colorInput.addEventListener("input", sendIntro);

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyLinkBtn.textContent = "Copied";
    setTimeout(() => (copyLinkBtn.textContent = "Copy room link"), 1000);
  } catch {
    log("clipboard copy failed");
  }
});

clearBtn.addEventListener("click", () => {
  redrawBoardBackground();
  send({ type: "clear_board" });
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("blur", handlePointerUp);

resizeCanvas();
animate();
