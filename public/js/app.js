const socket = io();

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const themeToggle = document.getElementById("themeToggle");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");

let drawing = false;
let lastX = 0;
let lastY = 0;
let color = "#000000";
let size = 5;
let paths = [];
let currentPath = [];

// Set canvas size
function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = window.innerHeight * 0.6;
  redrawCanvas();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Load saved drawing from local storage
function loadDrawing() {
  const savedPaths = localStorage.getItem("drawingPaths");
  if (savedPaths) {
    paths = JSON.parse(savedPaths);
    redrawCanvas();
  }
}

// Save drawing to local storage
function saveDrawing() {
  localStorage.setItem("drawingPaths", JSON.stringify(paths));
}

// Reset drawing
function resetDrawing() {
  paths = [];
  currentPath = [];
  localStorage.removeItem("drawingPaths");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  initializeCanvas();
  socket.emit("reset");
}

// Initialize canvas context
function initializeCanvas() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function startPosition(e) {
  drawing = true;
  [lastX, lastY] = getMousePos(canvas, e);
  currentPath = [{ x: lastX, y: lastY, color, size }];
  socket.emit("startPath", { x: lastX, y: lastY, color, size });
}

function endPosition() {
  if (drawing) {
    drawing = false;
    paths.push(currentPath);
    saveDrawing();
    socket.emit("endPath");
  }
}

function draw(e) {
  if (!drawing) return;

  const [x, y] = getMousePos(canvas, e);

  ctx.lineWidth = size;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  currentPath.push({ x, y, color, size });
  socket.emit("draw", { x0: lastX, y0: lastY, x1: x, y1: y, color, size });

  [lastX, lastY] = [x, y];
}

function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return [evt.clientX - rect.left, evt.clientY - rect.top];
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paths.forEach((path) => {
    ctx.beginPath();
    path.forEach((point, index) => {
      ctx.strokeStyle = point.color;
      ctx.lineWidth = point.size;
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  });
}

// Event listeners for drawing
canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", endPosition);
canvas.addEventListener("mouseout", endPosition);
canvas.addEventListener("mousemove", draw);

// Undo functionality
undoBtn.addEventListener("click", () => {
  if (paths.length > 0) {
    paths.pop();
    saveDrawing();
    redrawCanvas();
    socket.emit("undo");
  }
});

// Reset functionality
resetBtn.addEventListener("click", () => {
  if (
    confirm(
      "Are you sure you want to reset the drawing? This action cannot be undone."
    )
  ) {
    resetDrawing();
  }
});

// Color picker
colorPicker.addEventListener("change", (e) => {
  color = e.target.value;
});

// Brush size
brushSize.addEventListener("input", (e) => {
  size = e.target.value;
});

// Theme toggle
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode");
});

// Chat functionality
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (messageInput.value) {
    socket.emit("chat message", messageInput.value);
    addMessage("You", messageInput.value);
    messageInput.value = "";
  }
});

function addMessage(user, message) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.textContent = `${user}: ${message}`;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Socket events
socket.on("startPath", (data) => {
  ctx.beginPath();
  ctx.moveTo(data.x, data.y);
});

socket.on("draw", (data) => {
  ctx.lineWidth = data.size;
  ctx.strokeStyle = data.color;

  ctx.beginPath();
  ctx.moveTo(data.x0, data.y0);
  ctx.lineTo(data.x1, data.y1);
  ctx.stroke();
});

socket.on("endPath", () => {
  ctx.beginPath();
});

socket.on("undo", () => {
  if (paths.length > 0) {
    paths.pop();
    redrawCanvas();
  }
});

socket.on("reset", () => {
  resetDrawing();
});

socket.on("chat message", (data) => {
  addMessage(data.user, data.message);
});

// Initialize canvas and load saved drawing on page load
initializeCanvas();
loadDrawing();
