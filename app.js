const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle start of a new path
  socket.on("startPath", (data) => {
    socket.broadcast.emit("startPath", data);
  });

  // Handle drawing events
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  // Handle end of a path
  socket.on("endPath", () => {
    socket.broadcast.emit("endPath");
  });

  // Handle undo action
  socket.on("undo", () => {
    socket.broadcast.emit("undo");
  });

  // Handle reset action
  socket.on("reset", () => {
    socket.broadcast.emit("reset");
  });

  // Handle chat messages
  socket.on("chat message", (message) => {
    socket.broadcast.emit("chat message", { user: "User", message: message });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
