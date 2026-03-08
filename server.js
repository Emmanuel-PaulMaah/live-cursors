const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    const file = fs.readFileSync(path.join(__dirname, "public/index.html"));
    res.end(file);
  } else if (req.url === "/client.js") {
    const file = fs.readFileSync(path.join(__dirname, "public/client.js"));
    res.end(file);
  }
});

const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (msg) => {
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    }
  });

  ws.on("close", () => clients.delete(ws));
});

server.listen(3000, () => {
  console.log("http://localhost:3000");
});
