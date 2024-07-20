"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("openai/shims/node");
const openai_1 = __importDefault(require("openai"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const shapes_1 = require("../interface/shapes");
const events_1 = require("../interface/events");
const canvas_1 = require("../interface/canvas");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
app.use(express_1.default.static("public"));
const squares = [];
const generateSquare = (prompt) => __awaiter(void 0, void 0, void 0, function* () {
    const systemPrompt = `A square interface looks like this: \`${shapes_1.SquareString}\`. Based on the users prompt, create JSON that can be cast into a Square interface. Also keep in mind that the canvas looks like this ${JSON.stringify(canvas_1.canvas)}
`;
    const completion = yield openai.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
        ],
        model: "gpt-4o",
        response_format: {
            type: "json_object",
        },
    });
    const { message: { content }, } = completion.choices[0];
    if (!content) {
        throw new Error("No content in completion");
    }
    return (0, shapes_1.toSquare)(JSON.parse(content));
});
io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on(events_1.EventType.CREATE_SHAPE, (shape) => {
        console.log(shape);
        squares.push(shape);
        io.emit(events_1.EventType.CREATE_SHAPE, shape);
    });
    socket.on(events_1.EventType.CREATE_SQUARE_PROMPT, (prompt) => __awaiter(void 0, void 0, void 0, function* () {
        const square = yield generateSquare(prompt);
        console.log(square);
        socket.emit(events_1.EventType.ADD_SQUARE, square);
    }));
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
//# sourceMappingURL=server.js.map