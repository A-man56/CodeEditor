const express = require("express")
const app = express()
const bodyParser = require("body-parser")
require("dotenv").config()
require("./model/db")
const cors = require("cors")
const authRouter = require("./routes/authRouter")
const workspaceRouter = require("./routes/workspaceRouter")
const http = require("http")
const { Server } = require("socket.io")
const fs = require("fs-extra")
const path = require("path")

const PORT = process.env.PORT || 3500

// Create HTTP server
const server = http.createServer(app)

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend URL
    methods: ["GET", "POST"],
  },
})

// ========== MIDDLEWARES ==========
app.use(bodyParser.json({ limit: "50mb" }))
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use("/auth", authRouter)
app.use("/api", workspaceRouter)

// ========== CREATE FOLDERS IF NOT EXIST ==========
const TEMP_PROJECTS_DIR = path.join(__dirname, "temp-projects")
const CLONE_TEMP_DIR = path.join(__dirname, "clones-temp")

if (!fs.existsSync(TEMP_PROJECTS_DIR)) fs.mkdirSync(TEMP_PROJECTS_DIR)
if (!fs.existsSync(CLONE_TEMP_DIR)) fs.mkdirSync(CLONE_TEMP_DIR)

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? null : err.message,
  })
})

// ========== SOCKET.IO SETUP ==========
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Handle file updates
  socket.on("file-update", (data) => {
    try {
      const { projectId, filePath, content } = data
      const fullPath = path.join(TEMP_PROJECTS_DIR, projectId, filePath)

      // Ensure the directory exists
      fs.ensureDirSync(path.dirname(fullPath))

      // Write the updated content to the file
      fs.writeFileSync(fullPath, content)

      console.log(`File updated: ${fullPath}`)

      // Broadcast the update to all other clients viewing the same project
      socket.to(projectId).emit("file-updated", { filePath, content })
    } catch (error) {
      console.error("Error updating file:", error)
      socket.emit("error", { message: "Failed to update file", error: error.message })
    }
  })

  // Join a project room
  socket.on("join-project", (projectId) => {
    socket.join(projectId)
    console.log(`Socket ${socket.id} joined project: ${projectId}`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

// ========== ROOT ROUTE TEST ==========
app.get("/root", (req, res) => {
  res.send("Hello world from root route")
})

// ========== START SERVER ==========
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
