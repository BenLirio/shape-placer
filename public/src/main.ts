import { io } from "socket.io-client";
import { EventType } from "../../interface/events";
import { Square } from "../../interface/shapes";
import p5 from "p5";
import { canvas } from "../../interface/canvas";

const squares: Square[] = [];

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(canvas.width, canvas.height);
    p.frameRate(1);
  };

  p.draw = () => {
    p.background(10);
    squares.forEach((square) => {
      p.rect(square.position.x, square.position.y, square.width, square.width);
    });
  };
};

document.addEventListener("DOMContentLoaded", () => {
  new p5(sketch);
  const socket = io();
  const form = document.getElementById("form") as HTMLFormElement;
  const input = document.getElementById("input") as HTMLInputElement;
  const messages = document.getElementById("messages") as HTMLUListElement;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value) {
      socket.emit(EventType.CREATE_SQUARE_PROMPT, input.value);
    }
  });

  socket.on(EventType.ADD_SQUARE, (square: Square) => {
    squares.push(square);
  });

  socket.on("chat message", (msg: string) => {
    const item = document.createElement("li");
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });
});
