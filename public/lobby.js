const form = document.getElementById("lobbyForm");
const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");
const randomRoomBtn = document.getElementById("randomRoomBtn");
const themeBtn = document.getElementById("themeBtn");

nameInput.value = localStorage.getItem("lc_name") || "";

const adjectives = ["sunny", "quiet", "bright", "fuzzy", "swift", "calm", "lucky", "neon", "cosmic", "wild"];
const nouns = ["otter", "panda", "willow", "comet", "harbor", "meadow", "ember", "pixel", "river", "forest"];

function randomRoom() {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${a}-${n}-${num}`;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// minimal lucide icons (sun, moon)
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
const MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function svg(paths) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function applyThemeIcon() {
  const t = document.documentElement.getAttribute("data-theme") || "dark";
  themeBtn.innerHTML = svg(t === "light" ? MOON : SUN);
}

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lc_theme", next);
  applyThemeIcon();
});

applyThemeIcon();

randomRoomBtn.addEventListener("click", () => {
  roomInput.value = randomRoom();
  roomInput.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const roomRaw = roomInput.value.trim();
  const room = slugify(roomRaw);

  if (!name || !room) return;

  localStorage.setItem("lc_name", name);
  window.location.href = `/room/${encodeURIComponent(room)}`;
});
