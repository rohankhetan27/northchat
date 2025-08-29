

//npm start
//ngrok http 3000

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

// 🔽 add this block here (middleware + /login + /setname routes)

// parse forms
app.use(express.urlencoded({ extended: false }));

// helpers
function parseCookies(header) {
    const raw = header || ""; const obj = {};
    raw.split(";").map(s => s.trim()).filter(Boolean).forEach(p => {
        const i = p.indexOf("="); if (i > -1) obj[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
    });
    return obj;
}

const PASSWORD = process.env.CHAT_PASS || "letmein";

// login: set auth cookie, go to name page
app.post("/login", (req, res) => {
    const ok = (req.body.password || "") === PASSWORD;
    if (!ok) return res.redirect("/gate.html?e=1");
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.setHeader("Set-Cookie",
        ["auth=1", "Path=/", "Max-Age=2592000", "SameSite=Lax", isHttps ? "Secure" : null].filter(Boolean).join("; ")
    );
    res.redirect("/name.html");
});

// name: set chatname cookie, go to chat
app.post("/setname", (req, res) => {
    const n = (req.body.username || "").trim();
    if (!n) return res.redirect("/name.html?e=1");
    res.setHeader("Set-Cookie", `chatname=${encodeURIComponent(n)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    res.redirect("/");
});

// gate middleware (ALLOWS gate/name/socket routes)
app.use((req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const allow =
        req.path === "/gate.html" ||
        req.path === "/name.html" ||
        req.path === "/login" ||
        req.path === "/setname" ||
        req.path.startsWith("/socket.io") ||
        req.path === "/favicon.ico";

    if (!allow) {
        if (cookies.auth !== "1") return res.redirect("/gate.html");
        if (!cookies.chatname) return res.redirect("/name.html");
    }
    next();
});

// ✅ static files AFTER gates
app.use(express.static("public"));

// 🔽 after this, put your Socket.IO users map + io.on("connection") stuff

// users + sockets...
const users = new Map();

io.on("connection", (socket) => {
    // parse cookies from the socket handshake
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const uname = cookies.chatname || `User-${socket.id.slice(0, 4)}`;
    users.set(socket.id, { name: uname, active: true });
    // … rest of your chat logic
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 running on ${PORT}`));