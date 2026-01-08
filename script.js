/***** FIREBASE INIT *****/
const firebaseConfig = {
  apiKey: "AIzaSyBooziLZStDAGy4vvQYAmdMLL6WCMuzORY",
  authDomain: "terminal-chat-310d7.firebaseapp.com",
  databaseURL: "https://terminal-chat-310d7-default-rtdb.firebaseio.com",
  projectId: "terminal-chat-310d7",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/***** DOM *****/
const output = document.getElementById("output");
const input = document.getElementById("command");
const statusBar = document.getElementById("status");
const uploadInput = document.getElementById("presenceUpload");

/***** STATE *****/
let loginStep = 0;
let tempUsername = "";
let currentUser = null;
let currentRoom = null;
let isAdmin = false;
let rooms = [];
let typingTimeout = null;

/***** UI HELPERS *****/
function print(text = "") {
  output.innerText += "\n" + text;
  output.scrollTop = output.scrollHeight;
}

/***** BOOT *****/
function bootScreen() {
  output.innerText =
`Initializing Terminal Chat...
Loading modules...
Connecting to server...
Authentication ready.

`;
}

function animatedBoot() {
  const lines = [
    "Initializing kernel modules...",
    "Mounting virtual file system...",
    "Establishing secure channel...",
    "Syncing user profiles...",
    "Boot sequence complete.",
    "",
    "Terminal Chat ready.",
    ""
  ];

  output.innerText = "";
  let i = 0;

  const interval = setInterval(() => {
    output.innerText += lines[i] + "\n";
    output.scrollTop = output.scrollHeight;
    i++;

    if (i === lines.length) {
      clearInterval(interval);
      print("Username:");
    }
  }, 350);
}

/***** RESET *****/
function resetToLogin() {
  loginStep = 0;
  tempUsername = "";
  currentUser = null;
  currentRoom = null;
  isAdmin = false;
  rooms = [];
  statusBar.innerText = "";
}

/***** ONLINE / OFFLINE + IMAGE *****/
function setOnline(state) {
  if (!currentUser) return;
  db.ref(`presence/${currentUser}`).set({
    online: state,
    lastSeen: Date.now(),
    image: null
  });
}

window.addEventListener("beforeunload", () => setOnline(false));

/***** FIX: ENSURE USER ROOMS EXISTS (NEW USERS) *****/
function ensureUserRoomSync() {
  if (!currentUser) return;
  db.ref(`users/${currentUser}`).once("value", snap => {
    if (!snap.exists()) {
      db.ref(`users/${currentUser}`).set({ rooms: {} });
    } else if (!snap.val().rooms) {
      db.ref(`users/${currentUser}/rooms`).set({});
    }
  });
}

/***** LOAD ROOMS *****/
function loadRooms() {
  rooms = [];
  db.ref(`users/${currentUser}/rooms`).once("value", snap => {
    if (!snap.exists()) {
      print("No rooms yet");
      return;
    }
    print("Your rooms:");
    snap.forEach(r => {
      rooms.push(r.key);
      print("- " + r.key);
    });
  });
}

/***** IMAGE / GIF UPLOAD (ONLINE STATUS) *****/
uploadInput.addEventListener("change", e => {
  if (!currentUser) return;
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    db.ref(`presence/${currentUser}/image`).set(reader.result);
    print("Status image updated");
  };
  reader.readAsDataURL(file);
});

/***** INPUT HANDLER *****/
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const value = input.value.trim();
  input.value = "";

  /* CHAT MODE */
  if (currentRoom) {
    if (value === "exit") {
      db.ref(`typing/${currentRoom}/${currentUser}`).remove();
      currentRoom = null;
      print("Exited room.");
      loadRooms();
      return;
    }

    if (value === "/clear") {
      output.innerText = "";
      return;
    }

    db.ref(`rooms/${currentRoom}/messages`).push({
      user: currentUser,
      text: value,
      time: Date.now()
    });
    return;
  }

  /* LOGIN */
  if (loginStep === 0) {
    tempUsername = value;
    loginStep = 1;
    print("Password:");
    return;
  }

  if (loginStep === 1) {
    const password = value;

    if (tempUsername === "eggsy" && password === "Enigmaplays") {
      currentUser = "eggsy";
      isAdmin = true;
      loginStep = 2;

      setOnline(true);
      ensureUserRoomSync();

      output.innerText =
`Welcome ADMIN eggsy
Privileges: FULL ACCESS

Commands:
create <room>
invite <room> <user>
open <room>
rooms
logout
/whoami
/upload`;

      loadRooms();
      return;
    }

    db.ref(`accounts/${tempUsername}`).once("value", snap => {
      if (snap.exists() && snap.val().password !== password) {
        resetToLogin();
        animatedBoot();
        return;
      }

      if (!snap.exists()) {
        db.ref(`accounts/${tempUsername}`).set({ password });
      }

      currentUser = tempUsername;
      loginStep = 2;

      setOnline(true);
      ensureUserRoomSync();

      output.innerText =
`Welcome ${currentUser}

Commands:
open <room>
rooms
logout
/whoami
/upload`;

      loadRooms();
    });
    return;
  }

  /* COMMANDS */
  const parts = value.split(" ");

  if (value === "/upload") {
    uploadInput.click();
    return;
  }

  if (value === "logout") {
    setOnline(false);
    resetToLogin();
    animatedBoot();
    return;
  }

  if (value === "/whoami") {
    print(`User: ${currentUser}`);
    print(`Role: ${isAdmin ? "ADMIN" : "USER"}`);
    return;
  }

  if (parts[0] === "create") {
    if (!isAdmin) return print("Permission denied");
    const room = parts[1];
    if (!room) return print("Room name missing");

    db.ref(`users/${currentUser}/rooms/${room}`).set(true);
    db.ref(`rooms/${room}/createdBy`).set(currentUser);

    print(`Room created: ${room}`);
    loadRooms();
    return;
  }

  if (parts[0] === "invite") {
    if (!isAdmin) return print("Permission denied");
    const room = parts[1];
    const user = parts[2];
    if (!room || !user) return print("Usage: invite <room> <user>");

    db.ref(`users/${user}/rooms/${room}`).set(true);
    print(`Invited ${user} to ${room}`);
    return;
  }

  if (parts[0] === "rooms") {
    if (!rooms.length) print("No rooms yet");
    rooms.forEach((r, i) => print(`[${i + 1}] ${r}`));
    return;
  }

  if (parts[0] === "open") {
    const room = parts[1];
    if (!room) return print("Room name missing");

    currentRoom = room;
    output.innerText =
`Room: ${room}
Type 'exit' to leave
------------------`;

    db.ref(`rooms/${room}/messages`)
      .limitToLast(100)
      .on("child_added", snap => {
        const m = snap.val();
        print(`[${new Date(m.time).toLocaleTimeString()}] ${m.user}: ${m.text}`);
      });

    db.ref(`typing/${room}`).on("value", snap => {
      let users = [];
      snap.forEach(u => users.push(u.key));
      statusBar.innerText =
        users.length ? `${users.join(", ")} typing...` : "";
    });
    return;
  }

  print("Unknown command");
});

/***** TYPING *****/
input.addEventListener("input", () => {
  if (!currentRoom || !currentUser) return;

  db.ref(`typing/${currentRoom}/${currentUser}`).set(true);
  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    db.ref(`typing/${currentRoom}/${currentUser}`).remove();
  }, 1200);
});

/***** START *****/
bootScreen();
resetToLogin();
animatedBoot();
