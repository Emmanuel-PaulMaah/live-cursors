const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

function serveFile(res, filePath, contentType = "text/plain") {
  try {
    const file = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(file);
  } catch (err) {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/" || pathname.startsWith("/room/")) {
    return serveFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8");
  }

  if (pathname === "/client.js") {
    return serveFile(res, path.join(PUBLIC_DIR, "client.js"), "application/javascript; charset=utf-8");
  }

  if (pathname === "/styles.css") {
    return serveFile(res, path.join(PUBLIC_DIR, "styles.css"), "text/css; charset=utf-8");
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocket.Server({ server });

/**
 * rooms = Map<roomName, Map<clientId, clientInfo>>
 * clientInfo = {
 *   id,
 *   ws,
 *   name,
 *   color,
 *   x, y,
 *   targetX, targetY,
 *   isDrawing
 * }
 */
const rooms = new Map();

function getRoomNameFromReq(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/room/")) {
    const roomName = pathname.replace("/room/", "").trim();
    return roomName || "default";
  }

  return "default";
}

function getOrCreateRoom(roomName) {
  if (!rooms.has(roomName)) rooms.set(roomName, new Map());
  return rooms.get(roomName);
}

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(roomName, payload, exceptId = null) {
  const room = rooms.get(roomName);
  if (!room) return;

  for (const [clientId, client] of room.entries()) {
    if (exceptId && clientId === exceptId) continue;
    safeSend(client.ws, payload);
  }
}

function roomSnapshot(roomName) {
  const room = rooms.get(roomName);
  if (!room) return [];

  return Array.from(room.values()).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    x: c.x ?? 0,
    y: c.y ?? 0,
    isDrawing: !!c.isDrawing,
  }));
}

wss.on("connection", (ws, req) => {
  const roomName = getRoomNameFromReq(req);
  const room = getOrCreateRoom(roomName);

  const clientId = crypto.randomUUID();

  const client = {
    id: clientId,
    ws,
    roomName,
    name: "Anonymous",
    color: "#ff7c43",
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isDrawing: false,
  };

  room.set(clientId, client);

  safeSend(ws, {
    type: "welcome",
    selfId: clientId,
    room: roomName,
    users: roomSnapshot(roomName),
  });

  broadcastToRoom(roomName, {
    type: "user_joined",
    user: {
      id: client.id,
      name: client.name,
      color: client.color,
      x: client.x,
      y: client.y,
      isDrawing: client.isDrawing,
    },
  }, clientId);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "intro") {
      client.name = typeof msg.name === "string" && msg.name.trim() ? msg.name.trim().slice(0, 24) : "Anonymous";
      client.color = typeof msg.color === "string" ? msg.color : "#ff7c43";

      broadcastToRoom(roomName, {
        type: "user_updated",
        user: {
          id: client.id,
          name: client.name,
          color: client.color,
          x: client.x,
          y: client.y,
          isDrawing: client.isDrawing,
        },
      });

      return;
    }

    if (msg.type === "cursor") {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;

      client.x = msg.x;
      client.y = msg.y;

      broadcastToRoom(roomName, {
        type: "cursor",
        id: client.id,
        x: msg.x,
        y: msg.y,
      }, client.id);

      return;
    }

    if (msg.type === "draw_start") {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      client.isDrawing = true;

      broadcastToRoom(roomName, {
        type: "draw_start",
        id: client.id,
        x: msg.x,
        y: msg.y,
        color: client.color,
      }, client.id);

      return;
    }

    if (msg.type === "draw_move") {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;

      broadcastToRoom(roomName, {
        type: "draw_move",
        id: client.id,
        x: msg.x,
        y: msg.y,
        color: client.color,
      }, client.id);

      return;
    }

    if (msg.type === "draw_end") {
      client.isDrawing = false;

      broadcastToRoom(roomName, {
        type: "draw_end",
        id: client.id,
      }, client.id);

      return;
    }

    if (msg.type === "clear_board") {
      broadcastToRoom(roomName, {
        type: "clear_board",
      });
    }
  });

  ws.on("close", () => {
    const room = rooms.get(roomName);
    if (!room) return;

    room.delete(clientId);

    broadcastToRoom(roomName, {
      type: "user_left",
      id: clientId,
    });

    if (room.size === 0) {
      rooms.delete(roomName);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Live Cursor Playground running on http://localhost:${PORT}`);
});
