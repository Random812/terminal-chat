const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "terminal-chat-310d7.firebaseapp.com",
  databaseURL: "https://terminal-chat-310d7-default-rtdb.firebaseio.com",
  projectId: "terminal-chat-310d7",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const output = document.getElementById("output");
const input = document.getElementById("command");

/* ===== STATE ===== */
let loginStep = 0;        // 0=username, 1=password, 2=logged in
let tempUsername = "";
let currentUser = null;
let currentRoom = null;
let isAdmin = false;
let rooms = [];

/* ===== UI HELPERS ===== */
function print(text) {
  output.innerText += "\n" + text;
  output.scrollTop = output.scrollHeight;
}

function resetToLogin() {
  loginStep = 0;
  tempUsername = "";
  currentUser = null;
  currentRoom = null;
  isAdmin = false;
  rooms = [];
  output.innerText = "Terminal Chat\nUsername:";
}

/* ===== LOAD ROOMS ===== */
function loadRooms() {
  if (!currentUser) return;

  db.ref(`users/${currentUser}/rooms`).once("value", snap => {
    rooms = [];
    if (snap.exists()) {
      snap.forEach(r => rooms.push(r.key));
      print("Your rooms:");
      rooms.forEach((r, i) => print(`[${i + 1}] ${r}`));
    } else {
      print("No rooms yet");
    }
  });
}

/* ===== INPUT HANDLER ===== */
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  const value = input.value.trim();
  input.value = "";

  /* ===== CHAT MODE ===== */
  if (currentRoom) {
    if (value === "exit") {
      currentRoom = null;
      output.innerText = "Exited room.";
      loadRooms();
      return;
    }

    db.ref(`rooms/${currentRoom}/messages`).push({
      user: currentUser,
      text: value,
      time: Date.now()
    });
    return;
  }

  /* ===== LOGIN FLOW ===== */
  if (loginStep === 0) {
    tempUsername = value;
    loginStep = 1;
    print("Password:");
    return;
  }

  if (loginStep === 1) {
    const password = value;

    /* ===== ADMIN LOGIN ===== */
    if (tempUsername === "eggsy" && password === "Enigmaplays") {
      currentUser = "eggsy";
      isAdmin = true;
      loginStep = 2;
      output.innerText = `Welcome ADMIN ${currentUser}`;
      print("Commands: create <room>, open <room>, rooms, logout");
      loadRooms();
      return;
    }

    /* ===== USER LOGIN / REGISTER ===== */
    db.ref(`accounts/${tempUsername}`).once("value", snap => {
      if (snap.exists()) {
        // LOGIN
        if (snap.val().password === password) {
          currentUser = tempUsername;
          loginStep = 2;
          output.innerText = `Welcome ${currentUser}`;
          print("Commands: open <room>, rooms, logout");
          loadRooms();
        } else {
          output.innerText = "Wrong password.\nUsername:";
          loginStep = 0;
        }
      } else {
        // REGISTER
        db.ref(`accounts/${tempUsername}`).set({ password });
        currentUser = tempUsername;
        loginStep = 2;
        output.innerText = `Account created. Welcome ${currentUser}`;
        print("Commands: open <room>, rooms, logout");
      }
    });
    return;
  }

  /* ===== COMMAND MODE ===== */
  print("> " + value);
  const parts = value.split(" ");

  /* LOGOUT */
  if (value === "logout") {
    resetToLogin();
    return;
  }

  /* CREATE ROOM (ADMIN ONLY) */
  if (parts[0] === "create") {
    if (!isAdmin) return print("Permission denied");

    const room = parts[1];
    if (!room) return print("Room name missing");

    db.ref(`users/${currentUser}/rooms/${room}`).set(true);
    db.ref(`rooms/${room}`).set({ createdBy: currentUser });

    print(`Room created: ${room}`);
    loadRooms();
    return;
  }

  /* LIST ROOMS */
  if (parts[0] === "rooms") {
    if (rooms.length === 0) print("No rooms yet");
    rooms.forEach((r, i) => print(`[${i + 1}] ${r}`));
    return;
  }

  /* OPEN ROOM */
  if (parts[0] === "open") {
    const room = parts[1];
    if (!room) return print("Room name missing");

    currentRoom = room;
    output.innerText = `Room: ${room}\nType 'exit' to leave\n------------------`;

    db.ref(`rooms/${room}/messages`).off();
    db.ref(`rooms/${room}/messages`)
      .limitToLast(100)
      .on("child_added", snap => {
        const m = snap.val();
        print(`${m.user}: ${m.text}`);
      });
    return;
  }

  print("Unknown command");
});

/* ===== START ===== */
resetToLogin();
