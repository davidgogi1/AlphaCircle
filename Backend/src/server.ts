import "dotenv/config";
import path from "path";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import authRoutes        from "./routes/auth";
import postRoutes        from "./routes/posts";
import userRoutes        from "./routes/users";
import discussionRoutes  from "./routes/discussions";
import messageRoutes     from "./routes/messages";
import chatGroupRoutes   from "./routes/chatGroups";
import newsRoutes        from "./routes/news";
import savedRoutes       from "./routes/saved";
import pollRoutes        from "./routes/polls";
import consensusRoutes   from "./routes/consensus";
import searchRoutes      from "./routes/search";
import stockRoutes       from "./routes/stocks";
import inviteRoutes      from "./routes/invites";
import ChatGroup from "./models/ChatGroup";
import { setIO } from "./utils/socketService";

const app        = express();
const httpServer = createServer(app);
const PORT       = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use("/api/auth",        authRoutes);
app.use("/api/posts",       postRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/messages",    messageRoutes);
app.use("/api/groups",      chatGroupRoutes);
app.use("/api/news",        newsRoutes);
app.use("/api/saved",       savedRoutes);
app.use("/api/polls",       pollRoutes);
app.use("/api/consensus",   consensusRoutes);
app.use("/api/search",      searchRoutes);
app.use("/api/stocks",      stockRoutes);
app.use("/api/invites",     inviteRoutes);

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

io.use((socket, next) => {
  try {
    const token   = socket.handshake.auth.token as string;
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  // Auto-join all accepted group rooms
  const groups = await ChatGroup.find(
    { members: { $elemMatch: { user: userId, status: 'accepted' } } },
    '_id',
  ).lean();
  for (const g of groups) socket.join(`group:${g._id}`);

  // Allow client to join a group room after accepting an invite
  socket.on('join_group', (groupId: string) => {
    socket.join(`group:${groupId}`);
  });
});

setIO(io);

connectDB()
  .then(() =>
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`)),
  )
  .catch((err) => {
    console.error("Startup error:", err);
    process.exit(1);
  });
