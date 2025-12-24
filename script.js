const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "terminal-chat-310d7.firebaseapp.com",
  databaseURL: "https://terminal-chat-310d7-default-rtdb.firebaseio.com",
  projectId: "terminal-chat-310d7",
  storageBucket: "terminal-chat-310d7.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const chatRef = db.ref("chat");

const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatDiv = document.getElementById("chat");

/* SEND MESSAGE */
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && messageInput.value.trim() !== "") {
    chatRef.push({
      user: usernameInput.value || "Anonymous",
      text: messageInput.value,
      time: Date.now()
    });
    messageInput.value = "";
  }
});

/* RECEIVE MESSAGE */
chatRef.limitToLast(50).on("child_added", snap => {
  const msg = snap.val();
  chatDiv.innerHTML += `<div>${msg.user}: ${msg.text}</div>`;
  chatDiv.scrollTop = chatDiv.scrollHeight;
});
