const express = require("express")
const router = express.Router()
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs-extra")

// Base directory for all projects
const TEMP_DIR = path.join(__dirname, "..", "temp-projects")

// List of allowed commands for security
const ALLOWED_COMMANDS = [
  "ls",
  "dir",
  "cd",
  "pwd",
  "echo",
  "cat",
  "type",
  "mkdir",
  "touch",
  "rm",
  "cp",
  "mv",
  "find",
  "grep",
  "node",
  "npm",
  "python",
  "pip",
]

// Commands that should be blocked for security reasons
const BLOCKED_COMMANDS = ["sudo", "su", "chmod", "chown", "ssh", "telnet", "curl", "wget", "nc", "nmap", "rm -rf /"]

// Current working directories for each session
const sessions = new Map()

// Helper function to validate command
function isCommandAllowed(command) {
  // Extract the base command (before any arguments)
  const baseCommand = command.trim().split(" ")[0]

  // Check if it's in the allowed list
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return false
  }

  // Check if it contains any blocked commands
  for (const blockedCmd of BLOCKED_COMMANDS) {
    if (command.includes(blockedCmd)) {
      return false
    }
  }

  // Check for dangerous patterns
  if (
    command.includes(";") ||
    command.includes("&&") ||
    command.includes("||") ||
    command.includes("|") ||
    command.includes(">") ||
    command.includes("<")
  ) {
    return false
  }

  return true
}

// Initialize a session
router.post("/init/:projectId", (req, res) => {
  const { projectId } = req.params
  const sessionId = req.body.sessionId || Math.random().toString(36).substring(2, 15)

  // Set the initial working directory to the project directory
  const projectPath = path.join(TEMP_DIR, projectId)

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Project not found" })
  }

  sessions.set(sessionId, {
    cwd: projectPath,
    projectId,
    env: { ...process.env, TERM: "xterm-color" },
  })

  res.json({
    sessionId,
    message: "Terminal session initialized",
    cwd: projectPath,
  })
})

// Execute a command
router.post("/exec/:sessionId", (req, res) => {
  const { sessionId } = req.params
  const { command } = req.body

  if (!command) {
    return res.status(400).json({ error: "No command provided" })
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ error: "Session not found" })
  }

  // Security check
  if (!isCommandAllowed(command)) {
    return res.json({
      output: "Error: Command not allowed for security reasons.",
      error: true,
    })
  }

  // Handle CD command specially since it affects the session state
  if (command.startsWith("cd ")) {
    const targetDir = command.substring(3).trim()
    let newCwd

    // Handle absolute paths
    if (targetDir.startsWith("/") || targetDir.match(/^[A-Z]:\\/)) {
      newCwd = targetDir
    } else {
      // Handle relative paths
      newCwd = path.join(session.cwd, targetDir)
    }

    // Security: Ensure we're still within the project directory
    const projectPath = path.join(TEMP_DIR, session.projectId)
    if (!newCwd.startsWith(projectPath)) {
      return res.json({
        output: "Error: Cannot navigate outside of project directory.",
        error: true,
      })
    }

    // Check if directory exists
    if (!fs.existsSync(newCwd) || !fs.statSync(newCwd).isDirectory()) {
      return res.json({
        output: `cd: ${targetDir}: No such directory`,
        error: true,
      })
    }

    // Update the session's working directory
    session.cwd = newCwd
    sessions.set(sessionId, session)

    return res.json({
      output: "",
      cwd: session.cwd,
      success: true,
    })
  }

  // For other commands, spawn a process
  try {
    const parts = command.split(" ")
    const cmd = parts[0]
    const args = parts.slice(1)

    const proc = spawn(cmd, args, {
      cwd: session.cwd,
      env: session.env,
      shell: true,
      timeout: 30000, // 30 second timeout
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      res.json({
        output: stdout + (stderr ? `\nError: ${stderr}` : ""),
        error: code !== 0,
        cwd: session.cwd,
        exitCode: code,
      })
    })

    proc.on("error", (err) => {
      res.json({
        output: `Error executing command: ${err.message}`,
        error: true,
        cwd: session.cwd,
      })
    })
  } catch (error) {
    res.json({
      output: `Error: ${error.message}`,
      error: true,
      cwd: session.cwd,
    })
  }
})

module.exports = router
