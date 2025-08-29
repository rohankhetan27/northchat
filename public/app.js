const socket = io();
const form = document.getElementById("chatForm");
const input = document.getElementById("msgInput");
const log = document.getElementById("chatLog");
const userList = document.getElementById("userList");


let myId = null;
let myName = null;

// capture my id ASAP
socket.on("connect", () => { if (!myId) myId = socket.id; });

// server greets → prompt for name once
socket.on("welcome", (id) => {
    myId = id;
    socket.on("welcome", (id) => {
        myId = id;
        // name comes from the cookie (server-side), no prompt needed
    });
});

// system notices & presence list
socket.on("system", (text) => addSystem(text));
socket.on("users", (arr) => renderUsers(arr));

// Enter = send, Shift+Enter = newline
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    socket.emit("chat message", text);
    input.value = "";
    autoResize();
});

let unread = 0;

// reset counter when you focus the tab again
window.addEventListener("focus", () => {
    unread = 0;
    document.title = "Gmail";
});

// when a new message arrives
socket.on("chat message", (data) => {
    const mine = (data.id === myId) || (myId === null && data.id === socket.id);
    addBubble(data.text, mine ? "me" : "other", data.name);

    // if tab is hidden AND it's not your own message
    if (document.hidden && !mine) {
        unread++;
        document.title = `Gmail (${unread})`;
    }
});

// mark active/inactive on tab switch
document.addEventListener("visibilitychange", () => {
    socket.emit("status", { active: !document.hidden });
});

// ----- helpers -----
function renderUsers(arr) {
    userList.innerHTML = "";
    arr.forEach(u => {
        const li = document.createElement("li");
        li.className = u.active ? "" : "inactive";
        li.innerHTML = `
      <span class="status-dot"></span>
      <span class="name">${escapeHtml(u.name)}</span> : ${u.active ? "active" : "inactive"}
    `;
        userList.appendChild(li);
    });
}

function addBubble(text, sideClass, name) {
    const li = document.createElement("li");
    li.className = `bubble ${sideClass}`;
    if (sideClass === "other" && name) {
        const label = document.createElement("div");
        label.className = "name";
        label.textContent = name;
        li.appendChild(label);
    }
    const span = document.createElement("div");
    span.textContent = text;
    li.appendChild(span);
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
}

function addSystem(text) {
    const li = document.createElement("li");
    li.className = "bubble system";
    li.textContent = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
}

function autoResize() {
    input.style.height = "2rem";
    input.style.height = input.scrollHeight + "px";
}
input.addEventListener("input", autoResize);
autoResize();

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const linkBtn = document.getElementById("linkBtn");
linkBtn.addEventListener("click", () => {
    window.open("https://www.google.com/search?q=100000x15&sca_esv=7f9887bee47bdd15&ei=SeOxaKGeNsG3ptQPw4qzmAo&ved=0ahUKEwjh5pjTxbCPAxXBm4kEHUPFDKMQ4dUDCBA&uact=5&oq=100000x15&gs_lp=Egxnd3Mtd2l6LXNlcnAiCTEwMDAwMHgxNTIIEAAYgAQYogQyCBAAGKIEGIkFMggQABiABBiiBEj9aFDuBli_YnAGeAGQAQCYAbIBoAHaCaoBAzguNbgBA8gBAPgBAZgCE6ACugqoAhTCAgoQABiwAxjWBBhHwgINEAAYgAQYsAMYQxiKBcICGRAuGIAEGLADGNEDGEMYxwEYyAMYigXYAQHCAhkQLhiABBiwAxhDGMcBGMgDGIoFGK8B2AEBwgIbEC4YgAQYsAMYQxjHARjIAxiKBRgKGK8B2AEBwgILEAAYgAQYkQIYigXCAgsQLhiABBixAxiDAcICCxAAGIAEGLEDGIMBwgIOEAAYgAQYsQMYgwEYigXCAgUQABiABMICERAAGIAEGJECGLEDGIMBGIoFwgILEC4YgAQYxwEYrwHCAggQABiABBixA8ICCBAuGIAEGLEDwgITEAAYgAQYQxi0AhiKBRjqAtgBAcICGRAuGIAEGNEDGEMYtAIYxwEYigUY6gLYAQHCAhAQABgDGLQCGOoCGI8B2AECwgIOEC4YgAQYxwEYjgUYrwHCAgQQABgDwgIKEAAYgAQYQxiKBcICChAuGIAEGEMYigXCAhAQLhiABBixAxhDGMkDGIoFwgIFEC4YgATCAgsQABiABBiSAxiKBcICBRAhGKsCmAMJ8QUPPiChiIE1g4gGAZAGDboGBAgBGAi6BgYIAhABGAqSBwQxNC41oAeMWbIHAzguNbgHlwrCBwgxLjYuMTEuMcgHUQ&sclient=gws-wiz-serp&safe=active&ssui=on", "_blank"); // opens Google in new tab
});