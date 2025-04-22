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

// Execute a command in a project directory
router.post("/exec/:projectId", (req, res) => {
  const { projectId } = req.params
  const { command } = req.body

  if (!command) {
    return res.status(400).json({ error: "No command provided" })
  }

  const projectPath = path.join(TEMP_DIR, projectId)

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Project directory not found" })
  }

  // Security check
  if (!isCommandAllowed(command)) {
    return res.json({
      output: "Error: Command not allowed for security reasons.",
      error: true,
      cwd: projectPath,
    })
  }

  // Handle CD command specially since it affects the state
  if (command.startsWith("cd ")) {
    const targetDir = command.substring(3).trim()
    let newCwd

    // Handle absolute paths
    if (targetDir.startsWith("/") || targetDir.match(/^[A-Z]:\\/)) {
      newCwd = targetDir
    } else {
      // Handle relative paths
      newCwd = path.join(projectPath, targetDir)
    }

    // Security: Ensure we're still within the project directory
    if (!newCwd.startsWith(projectPath)) {
      return res.json({
        output: "Error: Cannot navigate outside of project directory.",
        error: true,
        cwd: projectPath,
      })
    }

    // Check if directory exists
    if (!fs.existsSync(newCwd) || !fs.statSync(newCwd).isDirectory()) {
      return res.json({
        output: `cd: ${targetDir}: No such directory`,
        error: true,
        cwd: projectPath,
      })
    }

    return res.json({
      output: "",
      cwd: newCwd,
      success: true,
    })
  }

  // For other commands, spawn a process
  try {
    const parts = command.split(" ")
    const cmd = parts[0]
    const args = parts.slice(1)

    const proc = spawn(cmd, args, {
      cwd: projectPath,
      env: { ...process.env, TERM: "xterm-color" },
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
        cwd: projectPath,
        exitCode: code,
      })
    })

    proc.on("error", (err) => {
      res.json({
        output: `Error executing command: ${err.message}`,
        error: true,
        cwd: projectPath,
      })
    })
  } catch (error) {
    res.json({
      output: `Error: ${error.message}`,
      error: true,
      cwd: projectPath,
    })
  }
})

module.exports = router
