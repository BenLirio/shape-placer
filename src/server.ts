import express from "express";
import "openai/shims/node";
import OpenAI from "openai";
import http from "http";
import { Server, Socket } from "socket.io";
import { Square, SquareString, toSquare } from "../interface/shapes";
import { EventType } from "../interface/events";
import { canvas } from "../interface/canvas";
import { State } from "../interface/state";
import {
  CharacterDefinition,
  CHARACTER_DEFINITION_STRING,
  toCharacterDefinition,
} from "../interface/character";
import { v4 as uuidv4 } from "uuid";
import randomColor from "randomcolor";
import { CHARACTER_SIZE_FACTOR } from "../interface/constants";

const newColor = () => randomColor({ luminosity: "light" });
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.static("public"));

const state: State = {
  squares: [],
  characters: {},
  users: {},
  userToCharacters: {},
};

let prevTime = Date.now();
const getDelta = () => {
  const currentTime = Date.now();
  const delta = currentTime - prevTime;
  prevTime = currentTime;
  return delta;
};

const generateCharacterDefinition = async (
  prompt: string
): Promise<CharacterDefinition> => {
  const systemPrompt = `Your goal is to generate a CharacterDefinition that looks like this: \`${CHARACTER_DEFINITION_STRING}\` based on the user's prompt. The CharacterDefinition should have the following stats: health, speed, and attack. Each stat should be a number between 0 and 1. Make sure that you return valid json that can be cast into a CharacterDefinition.`;
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    model: "gpt-4o-mini",
    response_format: {
      type: "json_object",
    },
  });
  const {
    message: { content },
  } = completion.choices[0];
  if (!content) {
    throw new Error("No content in completion");
  }
  return toCharacterDefinition(JSON.parse(content));
};
const addCharacter =
  (userId: string) => (characterDefinition: CharacterDefinition) => {
    const character = {
      characterDefinition: {
        stats: {
          ...characterDefinition.stats,
        },
      },
      stats: characterDefinition.stats,
      position: {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      },
    };
    const characterId = uuidv4();
    state.characters[characterId] = character;
    state.userToCharacters[userId] = state.userToCharacters[userId] || [];
    state.userToCharacters[userId].push(characterId);
  };

const removeCharacter = (characterId: string) => {
  delete state.characters[characterId];
  Object.keys(state.userToCharacters).forEach((userId) => {
    state.userToCharacters[userId] = state.userToCharacters[userId].filter(
      (id) => id !== characterId
    );
  });
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};
const updateState = (delta: number) => {
  Object.keys(state.users).forEach((userId) => {
    const otherUserIds = Object.keys(state.users).filter(
      (otherUserId) => otherUserId !== userId
    );
    const characterIds = state.userToCharacters[userId] || [];
    const otherCharacterIds = otherUserIds.flatMap(
      (otherUserId) => state.userToCharacters[otherUserId] || []
    );
    characterIds
      .filter((characterId) => state.characters[characterId] !== undefined)
      .forEach((characterId) => {
        const character = state.characters[characterId];
        const otherCharacterIdsWithDistance = otherCharacterIds
          .filter((characterId) => state.characters[characterId] !== undefined)
          .map((characterId) => ({
            characterId,
            distance: dist(
              state.characters[characterId].position,
              character.position
            ),
          }))
          .sort((a, b) => a.distance - b.distance);

        if (otherCharacterIdsWithDistance.length > 0) {
          const { distance, characterId: otherCharacterId } =
            otherCharacterIdsWithDistance[0];
          const S = character.stats.speed;
          const x1 = character.position.x;
          const y1 = character.position.y;
          const x2 = state.characters[otherCharacterId].position.x;
          const y2 = state.characters[otherCharacterId].position.y;
          const r1 =
            (CHARACTER_SIZE_FACTOR / 2) *
            character.characterDefinition.stats.health;
          const r2 =
            (CHARACTER_SIZE_FACTOR / 2) *
            state.characters[otherCharacterId].characterDefinition.stats.health;
          if (distance > r1 + r2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const theta = Math.atan2(dy, dx);
            const speedFactor = 0.02;
            const vx = delta * speedFactor * S * Math.cos(theta);
            const vy = delta * speedFactor * S * Math.sin(theta);
            state.characters[characterId].position.x += vx;
            state.characters[characterId].position.y += vy;
          } else {
            const attackFactor = 0.001;
            const damage = delta * attackFactor * character.stats.attack;
            state.characters[otherCharacterId].stats.health -= damage;
          }
        }
      });
  });

  Object.keys(state.characters).forEach((characterId) => {
    const character = state.characters[characterId];
    if (character.stats.health <= 0) {
      removeCharacter(characterId);
    }
  });
  io.emit(EventType.SET_STATE, state);
};
setTimeout(() => {
  setInterval(() => {
    updateState(getDelta());
  }, 100);
});

io.on("connection", (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);
  state.users[socket.id] = {
    color: newColor(),
  };

  socket.on(EventType.PROMPT_CREATE_CHARACTER, async (prompt: string) => {
    const characterDefinition = await generateCharacterDefinition(prompt);
    addCharacter(socket.id)(characterDefinition);
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
