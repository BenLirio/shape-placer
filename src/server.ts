import express from "express";
import "openai/shims/node";
import OpenAI from "openai";
import http from "http";
import { Server, Socket } from "socket.io";
import { Square } from "../interface/shapes";
import { EventType } from "../interface/events";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.static("public"));

const squares: Square[] = [];

io.on("connection", (socket: Socket) => {
  console.log("A user connected");
  socket.on(EventType.CREATE_SHAPE, (shape: Square) => {
    squares.push(shape);
    io.emit(EventType.CREATE_SHAPE, shape);
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
