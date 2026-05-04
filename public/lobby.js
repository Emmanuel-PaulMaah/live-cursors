const form = document.getElementById("lobbyForm");
const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");
const randomRoomBtn = document.getElementById("randomRoomBtn");

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
