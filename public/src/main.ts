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
      if (!user) {
        console.log(`User ${userId} not found`);
        return;
      }
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
