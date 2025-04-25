const path = require("path")
const fs = require("fs-extra")
const os = require("os")

// Base directory for all projects
const TEMP_DIR = path.join(__dirname, "..", "temp-projects")

// Store active terminals
const terminals = new Map()

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
const BLOCKED_PATTERNS = [
  "sudo",
  "su",
  "chmod",
  "chown",
  "ssh",
  "telnet",
  "curl",
  "wget",
  "nc",
  "nmap",
  "rm -rf /",
  "|",
  ">",
  "<",
  "&&",
  ";",
  "||",
]

// Try to load node-pty, but provide fallback if it fails
let pty
try {
  pty = require("node-pty")
} catch (error) {
  console.warn("node-pty could not be loaded:", error.message)
  console.warn("Terminal will operate in fallback mode")
  pty = null
}

// Modify the isCommandAllowed function to be more permissive
function isCommandAllowed(command) {
  // Extract the base command (before any arguments)
  const baseCommand = command.trim().split(" ")[0]

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (command.includes(pattern)) {
      return false
    }
  }

  // Special check for cd command to prevent escaping project directory
  if (baseCommand === "cd") {
    const args = command.trim().split(" ")
    if (args.length > 1) {
      const targetDir = args[1]

      // Allow cd .. but we'll check the actual path after resolution
      if (targetDir === "..") {
        return true
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

// Create a new terminal for a project
function createTerminal(projectId, socket) {
  try {
    const projectPath = path.join(TEMP_DIR, projectId)

    // Check if project exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`)
    }

    // Check if node-pty is available
    if (!pty) {
      throw new Error("node-pty is not available. Terminal will operate in fallback mode.")
    }

    // Determine shell based on OS
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash"

    // Create terminal process
    const term = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: projectPath,
      env: process.env,
    })

    // Generate a unique terminal ID
    const terminalId = `term_${projectId}_${Date.now()}`

    // Store terminal instance
    terminals.set(terminalId, {
      process: term,
      projectId,
      socket,
    })

    // Set up data handling with command filtering
    term.onData((data) => {
      socket.emit("terminal-output", {
        terminalId,
        data,
      })
    })

    // Handle terminal exit
    term.onExit(({ exitCode, signal }) => {
      console.log(`Terminal ${terminalId} exited with code ${exitCode} and signal ${signal}`)
      socket.emit("terminal-exit", {
        terminalId,
        exitCode,
        signal,
      })
      terminals.delete(terminalId)
    })

    return {
      terminalId,
      initialCwd: projectPath,
    }
  } catch (error) {
    console.error("Error creating terminal:", error)
    throw error
  }
}

// Write data to a terminal with command filtering
function writeToTerminal(terminalId, data) {
  const terminal = terminals.get(terminalId)
  if (!terminal) {
    throw new Error(`Terminal not found: ${terminalId}`)
  }

  // Check if this is a command (ends with newline)
  if (data.endsWith("\n") || data.endsWith("\r")) {
    const command = data.trim()

    // Skip empty commands
    if (!command) {
      terminal.process.write(data)
      return
    }

    // Check if command is allowed
    if (!isCommandAllowed(command)) {
      terminal.socket.emit("terminal-output", {
        terminalId,
        data: "\r\nCommand not allowed for security reasons.\r\n",
      })
      // Send a new prompt
      terminal.process.write("\r\n")
      return
    }
  }

  // Command is allowed, pass it to the terminal
  terminal.process.write(data)
}

// Resize a terminal
function resizeTerminal(terminalId, cols, rows) {
  const terminal = terminals.get(terminalId)
  if (!terminal) {
    throw new Error(`Terminal not found: ${terminalId}`)
  }

  terminal.process.resize(cols, rows)
}

// Kill a terminal
function killTerminal(terminalId) {
  const terminal = terminals.get(terminalId)
  if (!terminal) {
    return false
  }

  try {
    terminal.process.kill()
    terminals.delete(terminalId)
    return true
  } catch (error) {
    console.error(`Error killing terminal ${terminalId}:`, error)
    return false
  }
}

// Clean up all terminals for a project
function cleanupProjectTerminals(projectId) {
  for (const [terminalId, terminal] of terminals.entries()) {
    if (terminal.projectId === projectId) {
      try {
        terminal.process.kill()
        terminals.delete(terminalId)
      } catch (error) {
        console.error(`Error cleaning up terminal ${terminalId}:`, error)
      }
    }
  }
}

// Clean up all terminals
function cleanupAllTerminals() {
  for (const [terminalId, terminal] of terminals.entries()) {
    try {
      terminal.process.kill()
    } catch (error) {
      console.error(`Error cleaning up terminal ${terminalId}:`, error)
    }
  }
  terminals.clear()
}

module.exports = {
  createTerminal,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
  cleanupProjectTerminals,
  cleanupAllTerminals,
}
