import { io } from "socket.io-client";
import { EventType } from "../../interface/events";
import p5 from "p5";
import { canvas } from "../../interface/canvas";
import { State } from "../../interface/state";
import { CHARACTER_SIZE_FACTOR } from "../../interface/constants";

let state: State = {
  squares: [],
  characters: {},
  users: {},
  userToCharacters: {},
  rangedAttacks: {},
};
interface ClientState {
  userId: string | undefined;
}
const clientState: ClientState = {
  userId: undefined,
};

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(canvas.width, canvas.height);
    p.frameRate(30);
  };

  p.draw = () => {
    if (clientState.userId === undefined) {
      console.log("User id not set");
      return;
    }
    p.background(10);
    Object.keys(state.users).forEach((userId) => {
      const user = state.users[userId];
      const color = p.color(user.color);
      const characterIds = state.userToCharacters[userId] || [];
      characterIds.forEach((characterId) => {
        const {
          characterDefinition,
          stats,
          position: { x, y },
        } = state.characters[characterId];
        if (!characterDefinition) {
          console.log(
            `Character ${characterId} belonging to ${userId} not found`
          );
          return;
        }
        color.setAlpha(255 * (stats.health / characterDefinition.stats.health));
        p.fill(color);
        p.ellipse(
          x,
          y,
          characterDefinition.stats.health * CHARACTER_SIZE_FACTOR,
          characterDefinition.stats.health * CHARACTER_SIZE_FACTOR
        );
      });
    });
    Object.keys(state.rangedAttacks).forEach((fromId) => {
      const toId = state.rangedAttacks[fromId];
      const {
        position: { x: x1, y: y1 },
      } = state.characters[fromId];
      const {
        position: { x: x2, y: y2 },
      } = state.characters[toId];
      const dist = p.dist(x1, y1, x2, y2);
      const r =
        (CHARACTER_SIZE_FACTOR / 2) *
        state.characters[fromId].characterDefinition.stats.health;
      p.push();
      p.fill(255, 0, 0);
      p.translate(x1, y1);
      p.rotate(p.atan2(y1 - y2, x1 - x2));
      p.rotate(p.HALF_PI);
      p.triangle(-r, 0, r, 0, 0, dist);
      p.pop();
    });
  };
};

document.addEventListener("DOMContentLoaded", () => {
  new p5(sketch);
  const socket = io();
  const form = document.getElementById("form") as HTMLFormElement;
  const input = document.getElementById("input") as HTMLInputElement;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value) {
      socket.emit(EventType.PROMPT_CREATE_CHARACTER, input.value);
    }
  });
  socket.on("connect", () => {
    clientState.userId = socket.id;
  });

  socket.on(EventType.SET_STATE, (newState: State) => {
    state = newState;
  });
});
