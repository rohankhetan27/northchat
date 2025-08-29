

//npm start
//ngrok http 3000

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

const PASSWORD = process.env.CHAT_PASS || "glurb369"; // set via env for safety

// basic body parsing
app.use(express.urlencoded({ extended: false }));

// ---------- Cookie helpers ----------
function parseCookies(header) {
    const raw = header || "";
    const parts = raw.split(";").map(s => s.trim()).filter(Boolean);
    const obj = {};
    for (const p of parts) {
        const i = p.indexOf("=");
        if (i > -1) obj[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
    }
    return obj;
}

// ---------- Auth gates (password then name) ----------
app.post("/login", (req, res) => {
    const ok = (req.body.password || "") === PASSWORD;
    if (!ok) return res.redirect("/gate.html?e=1");
    res.setHeader("Set-Cookie", "auth=1; Path=/; Max-Age=86400");
    return res.redirect("/name.html"); // go choose a name next
});

app.post("/setname", (req, res) => {
    const n = (req.body.username || "").trim();
    if (!n) return res.redirect("/name.html?e=1");
    res.setHeader("Set-Cookie", `chatname=${encodeURIComponent(n)}; Path=/; Max-Age=86400`);
    return res.redirect("/"); // into chat
});

// Middleware to enforce gates for all normal routes
app.use((req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);

    // allow these paths without gates
    const allow =
        req.path === "/gate.html" ||
        req.path === "/name.html" ||
        req.path === "/login" ||
        req.path === "/setname" ||
        req.path.startsWith("/socket.io") || // socket.io handshake still needs gating below
        req.path === "/favicon.ico";

    if (!allow) {
        if (cookies.auth !== "1") return res.redirect("/gate.html");
        if (!cookies.chatname) return res.redirect("/name.html");
    }

    // block socket.io if not fully authed
    if (req.path.startsWith("/socket.io")) {
        if (cookies.auth !== "1") return res.sendStatus(401);
        if (!cookies.chatname) return res.sendStatus(401);
    }

    req.cookies = cookies;
    next();
});

// static files (index.html, app.js, etc.)
app.use(express.static("public"));

// ---------- Chat logic ----------
const users = new Map(); // socket.id -> { name, active }

io.on("connection", (socket) => {
    // pull name from cookie during websocket handshake
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const uname = cookies.chatname || `User-${socket.id.slice(0, 4)}`;

    users.set(socket.id, { name: uname, active: true });
    socket.emit("welcome", socket.id);
    io.emit("system", `${uname} joined`);
    io.emit("users", Array.from(users.values()));

    socket.on("status", ({ active }) => {
        const u = users.get(socket.id); if (!u) return;
        u.active = !!active;
        io.emit("users", Array.from(users.values()));
    });

    socket.on("chat message", (msg) => {
        const u = users.get(socket.id);
        io.emit("chat message", {
            id: socket.id,
            name: u ? u.name : uname,
            text: String(msg || "")
        });
    });

    socket.on("disconnect", () => {
        const u = users.get(socket.id);
        if (u) io.emit("system", `${u.name} left`);
        users.delete(socket.id);
        io.emit("users", Array.from(users.values()));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));