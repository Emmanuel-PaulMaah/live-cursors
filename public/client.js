const ws = new WebSocket(`ws://${location.host}`);

const cursors = {};

document.addEventListener("mousemove", (e) => {
  ws.send(JSON.stringify({
    x: e.clientX,
    y: e.clientY
  }));
});

ws.onmessage = (event) => {
  const { x, y } = JSON.parse(event.data);

  let cursor = cursors["other"];

  if (!cursor) {
    cursor = document.createElement("div");
    cursor.className = "cursor";
    document.body.appendChild(cursor);
    cursors["other"] = cursor;
  }

  cursor.style.left = x + "px";
  cursor.style.top = y + "px";
};
