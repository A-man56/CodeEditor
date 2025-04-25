const pty = require("node-pty")
const os = require("os")
const path = require("path")
const fs = require("fs-extra")

// Base directory for all projects
const TEMP_DIR = path.join(__dirname, "..", "temp-projects")

// Store active terminals
const terminals = new Map()

// Create a new terminal for a project
function createTerminal(projectId, socket) {
  try {
    const projectPath = path.join(TEMP_DIR, projectId)

    // Check if project exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`)
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

    // Set up data handling
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

// Write data to a terminal
function writeToTerminal(terminalId, data) {
  const terminal = terminals.get(terminalId)
  if (!terminal) {
    throw new Error(`Terminal not found: ${terminalId}`)
  }

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
