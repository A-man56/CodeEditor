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
const terminalService = require("./services/terminalService")

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

  // Store user's active terminals
  const userTerminals = new Set()

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

  // Create a new terminal
  socket.on("terminal-create", async (data) => {
    try {
      const { projectId } = data
      console.log(`Creating terminal for project: ${projectId}`)

      const { terminalId, initialCwd } = terminalService.createTerminal(projectId, socket)
      userTerminals.add(terminalId)

      socket.emit("terminal-created", {
        terminalId,
        initialCwd,
      })

      console.log(`Terminal created: ${terminalId}`)
    } catch (error) {
      console.error("Error creating terminal:", error)
      socket.emit("terminal-error", {
        error: error.message,
      })
    }
  })

  // Handle terminal input
  socket.on("terminal-input", (data) => {
    try {
      const { terminalId, input } = data

      if (!userTerminals.has(terminalId)) {
        throw new Error("Terminal not found or access denied")
      }

      terminalService.writeToTerminal(terminalId, input)
    } catch (error) {
      console.error("Error writing to terminal:", error)
      socket.emit("terminal-error", {
        error: error.message,
      })
    }
  })

  // Handle terminal resize
  socket.on("terminal-resize", (data) => {
    try {
      const { terminalId, cols, rows } = data

      if (!userTerminals.has(terminalId)) {
        throw new Error("Terminal not found or access denied")
      }

      terminalService.resizeTerminal(terminalId, cols, rows)
    } catch (error) {
      console.error("Error resizing terminal:", error)
    }
  })

  // Handle terminal close
  socket.on("terminal-close", (data) => {
    try {
      const { terminalId } = data

      if (!userTerminals.has(terminalId)) {
        return
      }

      terminalService.killTerminal(terminalId)
      userTerminals.delete(terminalId)

      console.log(`Terminal closed: ${terminalId}`)
    } catch (error) {
      console.error("Error closing terminal:", error)
    }
  })

  // Join a project room
  socket.on("join-project", (projectId) => {
    socket.join(projectId)
    console.log(`Socket ${socket.id} joined project: ${projectId}`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)

    // Clean up user's terminals
    for (const terminalId of userTerminals) {
      try {
        terminalService.killTerminal(terminalId)
      } catch (error) {
        console.error(`Error cleaning up terminal ${terminalId}:`, error)
      }
    }
    userTerminals.clear()
  })
})

// Clean up all terminals when server shuts down
process.on("SIGINT", () => {
  console.log("Cleaning up terminals before exit...")
  terminalService.cleanupAllTerminals()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("Cleaning up terminals before exit...")
  terminalService.cleanupAllTerminals()
  process.exit(0)
})

// ========== ROOT ROUTE TEST ==========
app.get("/root", (req, res) => {
  res.send("Hello world from root route")
})

// ========== START SERVER ==========
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
