const express = require("express")
const router = express.Router()
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs-extra")

// Base directory for all projects
const TEMP_DIR = path.join(__dirname, "..", "temp-projects")

// Enhance the terminal router to support more commands and add restrictions

// Update the ALLOWED_COMMANDS array to be more permissive
const ALLOWED_COMMANDS = [
  // Basic commands
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
  "clear",
  "cls",
  "help",
  "touch",
  "nano",
  "less",
  "more",
  "head",
  "tail",

  // Development commands
  "node",
  "npm",
  "npx",
  "yarn",
  "python",
  "python3",
  "pip",
  "pip3",
  "gcc",
  "g++",
  "make",
  "cmake",
  "javac",
  "java",
  "dotnet",

  // Git commands
  "git",
  "gh",

  // Additional utilities
  "tar",
  "zip",
  "unzip",
  "gzip",
  "gunzip",
  "bzip2",
  "bunzip2",
  "awk",
  "sed",
  "sort",
  "uniq",
  "wc",
  "diff",
  "patch",
  "ps",
  "kill",
  "env",
  "export",
  "set",
  "alias",
  "unalias",

  // Package managers
  "apt-get",
  "apt",
  "yum",
  "brew",
  "pacman",
]

// Commands that should be blocked for security reasons
const BLOCKED_COMMANDS = ["sudo", "su", "chmod", "chown", "ssh", "telnet", "curl", "wget", "nc", "nmap", "rm -rf /"]

// Improve the isCommandAllowed function to be more permissive
function isCommandAllowed(command) {
  // Extract the base command (before any arguments)
  const baseCommand = command.trim().split(" ")[0]

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

  // Special check for cd command to prevent escaping project directory
  if (baseCommand === "cd") {
    const args = command.trim().split(" ")
    if (args.length > 1) {
      const targetDir = args[1]

      // Allow cd .. but check that we don't escape the project directory
      if (targetDir === "..") {
        return true // We'll check the actual path after resolution
      }

      // Check for absolute path attempts
      if (targetDir.startsWith("/") || targetDir.match(/^[A-Z]:\\/i)) {
        return false
      }
    }
  }

  // If it's not explicitly blocked, allow it
  return true
}

// Execute a command in a project directory
router.post("/exec/:projectId", (req, res) => {
  const { projectId } = req.params
  const { command } = req.body
  const { cwd } = req.body // Get the current working directory from the request

  if (!command) {
    return res.status(400).json({ error: "No command provided" })
  }

  // Base project path
  const projectPath = path.join(TEMP_DIR, projectId)

  // Determine the actual working directory
  let currentWorkingDir = projectPath
  if (cwd && cwd.startsWith(TEMP_DIR) && cwd.includes(projectId)) {
    currentWorkingDir = cwd
  }

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Project directory not found" })
  }

  // Security check
  if (!isCommandAllowed(command)) {
    return res.json({
      output: "Error: Command not allowed for security reasons.",
      error: true,
      cwd: currentWorkingDir,
    })
  }

  // Modify the CD command handling to properly handle parent directory navigation
  if (command.startsWith("cd ")) {
    const targetDir = command.substring(3).trim()
    let newCwd

    // Handle absolute paths
    if (targetDir.startsWith("/") || targetDir.match(/^[A-Z]:\\/i)) {
      // Don't allow absolute paths for security
      return res.json({
        output: "Error: Cannot use absolute paths for security reasons.",
        error: true,
        cwd: currentWorkingDir,
      })
    } else if (targetDir === "..") {
      // Handle parent directory navigation
      newCwd = path.resolve(currentWorkingDir, "..")

      // Security: Ensure we're still within the project directory
      if (!newCwd.startsWith(TEMP_DIR) || !newCwd.includes(projectId)) {
        return res.json({
          output: "Error: Cannot navigate outside of project directory.",
          error: true,
          cwd: currentWorkingDir,
        })
      }
    } else {
      // Handle relative paths
      newCwd = path.join(currentWorkingDir, targetDir)
    }

    // Security: Double-check we're still within the project directory
    if (!newCwd.startsWith(TEMP_DIR) || !newCwd.includes(projectId)) {
      return res.json({
        output: "Error: Cannot navigate outside of project directory.",
        error: true,
        cwd: currentWorkingDir,
      })
    }

    // Check if directory exists
    if (!fs.existsSync(newCwd) || !fs.statSync(newCwd).isDirectory()) {
      return res.json({
        output: `cd: ${targetDir}: No such directory`,
        error: true,
        cwd: currentWorkingDir,
      })
    }

    return res.json({
      output: "",
      cwd: newCwd,
      success: true,
    })
  }

  // Add special handling for touch command
  if (command.startsWith("touch ")) {
    const fileName = command.substring(6).trim()

    // Security check: don't allow absolute paths or path traversal
    if (fileName.includes("..") || fileName.startsWith("/") || fileName.match(/^[A-Z]:\\/i)) {
      return res.json({
        output: "Error: Invalid file path for security reasons.",
        error: true,
        cwd: currentWorkingDir,
      })
    }

    try {
      const filePath = path.join(currentWorkingDir, fileName)
      fs.closeSync(fs.openSync(filePath, "a"))

      // Emit a file system change event
      try {
        // Get the relative path from the project root
        const relativePath = path.relative(projectPath, filePath)

        // Use the socket.io instance to broadcast the change
        const io = req.app.get("io")
        if (io) {
          io.to(projectId).emit("file-updated", {
            projectId,
            filePath: relativePath,
            content: "",
            action: "create",
          })
        }
      } catch (socketError) {
        console.error("Error emitting file change:", socketError)
      }

      return res.json({
        output: "",
        cwd: currentWorkingDir,
        success: true,
      })
    } catch (error) {
      return res.json({
        output: `touch: ${error.message}`,
        error: true,
        cwd: currentWorkingDir,
      })
    }
  }

  // Add special handling for mkdir command
  if (command.startsWith("mkdir ")) {
    const dirName = command.substring(6).trim()

    // Security check: don't allow absolute paths or path traversal
    if (dirName.includes("..") || dirName.startsWith("/") || dirName.match(/^[A-Z]:\\/i)) {
      return res.json({
        output: "Error: Invalid directory path for security reasons.",
        error: true,
        cwd: currentWorkingDir,
      })
    }

    try {
      const dirPath = path.join(currentWorkingDir, dirName)
      fs.mkdirSync(dirPath, { recursive: true })

      // Emit a file system change event
      try {
        // Get the relative path from the project root
        const relativePath = path.relative(projectPath, dirPath)

        // Use the socket.io instance to broadcast the change
        const io = req.app.get("io")
        if (io) {
          io.to(projectId).emit("file-updated", {
            projectId,
            filePath: relativePath,
            isFolder: true,
            action: "create",
          })
        }
      } catch (socketError) {
        console.error("Error emitting directory change:", socketError)
      }

      return res.json({
        output: "",
        cwd: currentWorkingDir,
        success: true,
      })
    } catch (error) {
      return res.json({
        output: `mkdir: ${error.message}`,
        error: true,
        cwd: currentWorkingDir,
      })
    }
  }

  // Handle cross-platform ls/dir command
  if (command === "ls" || command === "dir") {
    try {
      const files = fs.readdirSync(currentWorkingDir)
      const output = files.join("\n")

      return res.json({
        output,
        cwd: currentWorkingDir,
        success: true,
      })
    } catch (error) {
      return res.json({
        output: `ls: ${error.message}`,
        error: true,
        cwd: currentWorkingDir,
      })
    }
  }

  // For other commands, spawn a process
  try {
    const parts = command.split(" ")
    const cmd = parts[0]
    const args = parts.slice(1)

    const proc = spawn(cmd, args, {
      cwd: currentWorkingDir, // Use the current working directory
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
        cwd: currentWorkingDir,
        exitCode: code,
      })
    })

    proc.on("error", (err) => {
      res.json({
        output: `Error executing command: ${err.message}`,
        error: true,
        cwd: currentWorkingDir,
      })
    })
  } catch (error) {
    res.json({
      output: `Error: ${error.message}`,
      error: true,
      cwd: currentWorkingDir,
    })
  }
})

module.exports = router
