import { io } from "socket.io-client";

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const form = document.getElementById("form") as HTMLFormElement;
  const input = document.getElementById("input") as HTMLInputElement;
  const messages = document.getElementById("messages") as HTMLUListElement;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value) {
      socket.emit("chat message", input.value);
      input.value = "";
    }
  });

  socket.on("chat message", (msg: string) => {
    const item = document.createElement("li");
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });
});
