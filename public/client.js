const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${location.host}${location.pathname}`);

const board = document.getElementById("board");
const ctx = board.getContext("2d");

const roomLabel = document.getElementById("roomLabel");
const nameInput = document.getElementById("nameInput");
const colorInput = document.getElementById("colorInput");
const micBtn = document.getElementById("micBtn");
const speakerBtn = document.getElementById("speakerBtn");
const captionsBtn = document.getElementById("captionsBtn");
const themeBtn = document.getElementById("themeBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const clearBtn = document.getElementById("clearBtn");
const leaveBtn = document.getElementById("leaveBtn");
const menuToggle = document.getElementById("menuToggle");
const controlsEl = document.getElementById("controls");
const transcriptPanel = document.getElementById("transcript-panel");
const presenceEl = document.getElementById("presence");
const transcriptsEl = document.getElementById("transcripts");
const logsEl = document.getElementById("logs");

// ---------- icons (lucide subset) ----------

const ICON_PATHS = {
  "menu": '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  "mic": '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  "mic-off": '<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
  "volume-2": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  "volume-x": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  "captions": '<rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/>',
  "captions-off": '<path d="M10.5 5H19a2 2 0 0 1 2 2v8.5"/><path d="M17 11h-.5"/><path d="M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/><path d="M2 2l20 20"/><path d="M7 11h4"/><path d="M7 15h2.5"/>',
  "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  "moon": '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  "trash": '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
};

function svgIcon(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ""}</svg>`;
}

function setIcon(el, name) {
  if (!el) return;
  el.dataset.icon = name;
  el.innerHTML = svgIcon(name);
}

// hydrate any element with [data-icon]
document.querySelectorAll("[data-icon]").forEach((el) => setIcon(el, el.dataset.icon));

const state = {
  selfId: null,
  room: "default",
  users: new Map(),
  cursors: new Map(),
  isDrawing: false,
  drawPrev: null,
  rafId: null,
  micEnabled: false,
  speakerEnabled: true,
  captionsEnabled: true,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  localStream: null,
  speechRecognition: null,
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

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    log("speech recognition not supported");
    return null;
  }

  const sr = new SpeechRecognition();
  sr.continuous = true;
  sr.interimResults = false;
  sr.lang = "en-US";

  sr.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript.trim()) {
      send({ type: "transcript", text: transcript });
      addTranscript(state.users.get(state.selfId)?.name || "You", transcript);
    }
  };

  sr.onerror = (event) => {
    log("speech error:", event.error);
  };

  sr.onend = () => {
    if (state.micEnabled) {
      sr.start();
    }
  };

  return sr;
}

function resetPeerConnection(peerId) {
  const existing = state.peerConnections.get(peerId);
  if (existing) {
    try { existing.close(); } catch {}
    state.peerConnections.delete(peerId);
  }
  state.remoteStreams.delete(peerId);
  const audio = document.getElementById(`audio-${peerId}`);
  if (audio) audio.remove();
}

function updateMicIcon() {
  setIcon(micBtn, state.micEnabled ? "mic" : "mic-off");
  micBtn.classList.toggle("active", state.micEnabled);
}

function updateSpeakerIcon() {
  setIcon(speakerBtn, state.speakerEnabled ? "volume-2" : "volume-x");
  speakerBtn.classList.toggle("active", state.speakerEnabled);
}

function updateCaptionsIcon() {
  setIcon(captionsBtn, state.captionsEnabled ? "captions" : "captions-off");
  captionsBtn.classList.toggle("active", state.captionsEnabled);
  transcriptPanel.style.display = state.captionsEnabled ? "" : "none";
}

function applyAudioMute() {
  document.querySelectorAll("audio[id^='audio-']").forEach((a) => {
    a.muted = !state.speakerEnabled;
  });
}

async function toggleMic() {
  if (!state.micEnabled) {
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.micEnabled = true;
      updateMicIcon();

      if (state.captionsEnabled) {
        if (!state.speechRecognition) {
          state.speechRecognition = initSpeechRecognition();
        }
        if (state.speechRecognition) {
          try { state.speechRecognition.start(); } catch {}
        }
      }

      // (re)create peer connections to all other users so both sides exchange streams
      for (const [peerId] of state.users) {
        if (peerId === state.selfId) continue;
        resetPeerConnection(peerId);
        createPeerConnection(peerId, true);
      }

      log("microphone enabled");
    } catch (err) {
      log("mic error:", err.message);
      state.micEnabled = false;
      updateMicIcon();
    }
  } else {
    state.micEnabled = false;
    updateMicIcon();

    if (state.speechRecognition) {
      try { state.speechRecognition.stop(); } catch {}
    }

    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
      state.localStream = null;
    }

    for (const peerId of Array.from(state.peerConnections.keys())) {
      resetPeerConnection(peerId);
    }

    log("microphone disabled");
  }
}

function toggleSpeaker() {
  state.speakerEnabled = !state.speakerEnabled;
  updateSpeakerIcon();
  applyAudioMute();
  log(state.speakerEnabled ? "speaker on" : "speaker muted");
}

function toggleCaptions() {
  state.captionsEnabled = !state.captionsEnabled;
  updateCaptionsIcon();

  if (state.captionsEnabled && state.micEnabled) {
    if (!state.speechRecognition) state.speechRecognition = initSpeechRecognition();
    if (state.speechRecognition) {
      try { state.speechRecognition.start(); } catch {}
    }
  } else if (!state.captionsEnabled && state.speechRecognition) {
    try { state.speechRecognition.stop(); } catch {}
  }

  log(state.captionsEnabled ? "subtitles on" : "subtitles off");
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lc_theme", next);
  setIcon(themeBtn, next === "light" ? "moon" : "sun");
}

async function createPeerConnection(peerId, initiator) {
  if (state.peerConnections.has(peerId)) {
    return state.peerConnections.get(peerId);
  }

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
    iceCandidatePoolSize: 4,
  });

  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, state.localStream);
    });
  }

  pc.ontrack = (event) => {
    const user = state.users.get(peerId);
    const userName = user?.name || peerId.slice(0, 8);
    log("received remote audio from", userName);

    const remoteStream = event.streams[0];
    state.remoteStreams.set(peerId, remoteStream);

    let audio = document.getElementById(`audio-${peerId}`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `audio-${peerId}`;
      audio.autoplay = true;
      audio.playsinline = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = remoteStream;
    audio.muted = !state.speakerEnabled;
    audio.play().catch(() => {});
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      send({
        type: "webrtc_ice",
        targetId: peerId,
        candidate: event.candidate,
      });
    }
  };

  pc.onconnectionstatechange = () => {
    log("peer connection state:", peerId, pc.connectionState);
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      state.peerConnections.delete(peerId);
      state.remoteStreams.delete(peerId);
      const audio = document.getElementById(`audio-${peerId}`);
      if (audio) audio.remove();
    }
  };

  state.peerConnections.set(peerId, pc);

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({
      type: "webrtc_offer",
      targetId: peerId,
      offer: offer,
    });
  }

  return pc;
}

function addTranscript(name, text) {
  const item = document.createElement("div");
  item.className = "transcript-item";

  const nameEl = document.createElement("div");
  nameEl.className = "transcript-name";
  nameEl.textContent = name;

  const textEl = document.createElement("div");
  textEl.className = "transcript-text";
  textEl.textContent = text;

  item.appendChild(nameEl);
  item.appendChild(textEl);

  transcriptsEl.insertBefore(item, transcriptsEl.firstChild);

  if (transcriptsEl.children.length > 20) {
    transcriptsEl.removeChild(transcriptsEl.lastChild);
  }
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

    // if our mic is already on, call the newcomer so they can hear us
    if (state.micEnabled && msg.user.id !== state.selfId) {
      resetPeerConnection(msg.user.id);
      createPeerConnection(msg.user.id, true);
    }
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
    return;
  }

  if (msg.type === "webrtc_offer") {
    (async () => {
      // clean slate so renegotiation works (e.g. when remote re-toggled mic)
      resetPeerConnection(msg.from);

      const pc = await createPeerConnection(msg.from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({
        type: "webrtc_answer",
        targetId: msg.from,
        answer: answer,
      });
    })();
    return;
  }

  if (msg.type === "webrtc_answer") {
    const pc = state.peerConnections.get(msg.from);
    if (pc) {
      pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
    }
    return;
  }

  if (msg.type === "webrtc_ice") {
    const pc = state.peerConnections.get(msg.from);
    if (pc && msg.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
    return;
  }

  if (msg.type === "transcript") {
    const user = state.users.get(msg.from);
    if (user) {
      addTranscript(user.name, msg.text);
    }
    return;
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
micBtn.addEventListener("click", toggleMic);
speakerBtn.addEventListener("click", toggleSpeaker);
captionsBtn.addEventListener("click", toggleCaptions);
themeBtn.addEventListener("click", toggleTheme);

// initial icon + state sync
updateMicIcon();
updateSpeakerIcon();
updateCaptionsIcon();
setIcon(themeBtn, document.documentElement.getAttribute("data-theme") === "light" ? "moon" : "sun");

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyLinkBtn.classList.add("ok");
    setTimeout(() => copyLinkBtn.classList.remove("ok"), 900);
  } catch {
    log("clipboard copy failed");
  }
});

clearBtn.addEventListener("click", () => {
  redrawBoardBackground();
  send({ type: "clear_board" });
});

leaveBtn.addEventListener("click", () => {
  try { ws.close(); } catch {}
  window.location.href = "/";
});

menuToggle.addEventListener("click", () => {
  controlsEl.classList.toggle("open");
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("blur", handlePointerUp);

resizeCanvas();
animate();
