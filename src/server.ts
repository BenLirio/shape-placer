import express from "express";
import "openai/shims/node";
import OpenAI from "openai";
import http from "http";
import { Server, Socket } from "socket.io";
import { Square, SquareString, toSquare } from "../interface/shapes";
import { EventType } from "../interface/events";
import { canvas } from "../interface/canvas";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.static("public"));

const squares: Square[] = [];

const generateSquare = async (prompt: string): Promise<Square> => {
  const systemPrompt = `A square interface looks like this: \`${SquareString}\`. Based on the users prompt, create JSON that can be cast into a Square interface. Also keep in mind that the canvas looks like this ${JSON.stringify(
    canvas
  )}
`;
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    model: "gpt-4o",
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
  return toSquare(JSON.parse(content));
};

io.on("connection", (socket: Socket) => {
  console.log("A user connected");
  socket.on(EventType.CREATE_SHAPE, (shape: Square) => {
    console.log(shape);
    squares.push(shape);
    io.emit(EventType.CREATE_SHAPE, shape);
  });
  socket.on(EventType.CREATE_SQUARE_PROMPT, async (prompt: string) => {
    const square = await generateSquare(prompt);
    console.log(square);
    socket.emit(EventType.ADD_SQUARE, square);
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
