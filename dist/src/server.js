"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("openai/shims/node");
const openai_1 = __importDefault(require("openai"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const events_1 = require("../interface/events");
const canvas_1 = require("../interface/canvas");
const character_1 = require("../interface/character");
const uuid_1 = require("uuid");
const randomcolor_1 = __importDefault(require("randomcolor"));
const constants_1 = require("../interface/constants");
const newColor = () => (0, randomcolor_1.default)({ luminosity: "light" });
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
app.use(express_1.default.static("public"));
const state = {
    squares: [],
    characters: {},
    users: {},
    userToCharacters: {},
    rangedAttacks: {},
};
let prevTime = Date.now();
const getDelta = () => {
    const currentTime = Date.now();
    const delta = currentTime - prevTime;
    prevTime = currentTime;
    return delta;
};
const generateCharacterDefinition = async (prompt) => {
    const systemPrompt = `Your goal is to generate a CharacterDefinition that looks like this: \`${character_1.CHARACTER_DEFINITION_STRING}\` based on the user's prompt. The CharacterDefinition should have the following stats: health, speed, and attack. Each stat should be a number between 0 and 1. Make sure that you return valid json that can be cast into a CharacterDefinition.`;
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
    const { message: { content }, } = completion.choices[0];
    if (!content) {
        throw new Error("No content in completion");
    }
    return (0, character_1.toCharacterDefinition)(JSON.parse(content));
};
const addCharacter = (userId) => (characterDefinition) => {
    const character = {
        characterDefinition: {
            ...characterDefinition,
            stats: {
                ...characterDefinition.stats,
            },
        },
        stats: {
            health: characterDefinition.stats.health,
        },
        position: {
            x: Math.random() * canvas_1.canvas.width,
            y: Math.random() * canvas_1.canvas.height,
        },
    };
    const characterId = (0, uuid_1.v4)();
    state.characters[characterId] = character;
    state.userToCharacters[userId] = state.userToCharacters[userId] || [];
    state.userToCharacters[userId].push(characterId);
};
const removeCharacter = (characterId) => {
    delete state.characters[characterId];
    Object.keys(state.userToCharacters).forEach((userId) => {
        state.userToCharacters[userId] = state.userToCharacters[userId].filter((id) => id !== characterId);
    });
    Object.entries(state.rangedAttacks).forEach(([fromId, toId]) => {
        if (toId === characterId || fromId === characterId) {
            delete state.rangedAttacks[fromId];
        }
    });
};
const removeUser = (userId) => {
    const characterIds = state.userToCharacters[userId] || [];
    characterIds.forEach((characterId) => {
        removeCharacter(characterId);
    });
    delete state.users[userId];
};
const dist = (a, b) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};
const updateState = (delta) => {
    state.rangedAttacks = {};
    Object.keys(state.users).forEach((userId) => {
        const otherUserIds = Object.keys(state.users).filter((otherUserId) => otherUserId !== userId);
        const characterIds = state.userToCharacters[userId] || [];
        const otherCharacterIds = otherUserIds.flatMap((otherUserId) => state.userToCharacters[otherUserId] || []);
        characterIds.forEach((characterId) => {
            const character = state.characters[characterId];
            const otherCharacterIdsWithDistance = otherCharacterIds
                .map((characterId) => ({
                characterId,
                distance: dist(state.characters[characterId].position, character.position),
            }))
                .sort((a, b) => a.distance - b.distance);
            if (otherCharacterIdsWithDistance.length > 0) {
                const { distance, characterId: otherCharacterId } = otherCharacterIdsWithDistance[0];
                const S = character.characterDefinition.stats.speed;
                const x1 = character.position.x;
                const y1 = character.position.y;
                const x2 = state.characters[otherCharacterId].position.x;
                const y2 = state.characters[otherCharacterId].position.y;
                const r1 = (constants_1.CHARACTER_SIZE_FACTOR / 2) *
                    character.characterDefinition.stats.health;
                const r2 = (constants_1.CHARACTER_SIZE_FACTOR / 2) *
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
                    if (character.characterDefinition.ranged) {
                        state.rangedAttacks[characterId] = otherCharacterId;
                        const attackFactor = 0.0001;
                        const damage = delta * attackFactor * character.characterDefinition.stats.attack;
                        state.characters[otherCharacterId].stats.health -= damage;
                    }
                }
                else {
                    if (!character.characterDefinition.ranged) {
                        const attackFactor = 0.001;
                        const damage = delta * attackFactor * character.characterDefinition.stats.attack;
                        state.characters[otherCharacterId].stats.health -= damage;
                    }
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
    io.emit(events_1.EventType.SET_STATE, state);
};
setTimeout(() => {
    setInterval(() => {
        updateState(getDelta());
    }, 100);
});
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    state.users[socket.id] = {
        color: newColor(),
    };
    socket.on(events_1.EventType.PROMPT_CREATE_CHARACTER, async (prompt) => {
        const characterDefinition = await generateCharacterDefinition(prompt);
        addCharacter(socket.id)(characterDefinition);
    });
    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });
    socket.on("disconnect", () => {
        console.log("User disconnected");
        removeUser(socket.id);
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map