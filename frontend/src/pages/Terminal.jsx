"use client"

import { useState, useRef, useEffect } from "react"
import "xterm/css/xterm.css"

const Terminal = ({ projectId, socket, onCommandOutput }) => {
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [output, setOutput] = useState([
    { type: "system", text: "Terminal initialized. Attempting to connect to server..." },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [currentDirectory, setCurrentDirectory] = useState("")
  const terminalRef = useRef(null)
  const inputRef = useRef(null)
  const terminalIdRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const connectionAttemptRef = useRef(0)

  // Initialize terminal connection when socket and projectId are available
  useEffect(() => {
    if (!socket || !projectId) {
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: "Socket connection not available. Using fallback mode.",
        },
      ])
      setFallbackMode(true)
      setCurrentDirectory(`/workspace/${projectId}`)
      return
    }

    // Check if socket is connected
    if (!socket.connected) {
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: "Socket not connected. Waiting for connection...",
        },
      ])

      // Wait for socket to connect
      const connectHandler = () => {
        setOutput((prev) => [...prev, { type: "system", text: "Socket connected. Initializing terminal..." }])
        initializeTerminal()
      }

      socket.on("connect", connectHandler)

      return () => {
        socket.off("connect", connectHandler)
      }
    } else {
      initializeTerminal()
    }

    function initializeTerminal() {
      // Set up socket event listeners
      const handleTerminalCreated = (data) => {
        const { terminalId, initialCwd } = data
        terminalIdRef.current = terminalId
        setCurrentDirectory(initialCwd || `/workspace/${projectId}`)
        setIsConnected(true)
        setOutput((prev) => [
          ...prev,
          { type: "system", text: "Terminal connected. Type 'help' for available commands." },
        ])
      }

      const handleTerminalOutput = (data) => {
        if (data.terminalId === terminalIdRef.current) {
          setOutput((prev) => [...prev, { type: "output", text: data.data }])

          // Also send to code preview
          if (onCommandOutput) {
            onCommandOutput(data.data)
          }
        }
      }

      const handleTerminalError = (data) => {
        setError(data.error)
        setOutput((prev) => [...prev, { type: "error", text: `Error: ${data.error}` }])

        // If we get an error, try fallback mode
        if (connectionAttemptRef.current >= 2) {
          setFallbackMode(true)
          setOutput((prev) => [
            ...prev,
            { type: "system", text: "Switching to fallback mode due to connection issues." },
          ])
        } else {
          connectionAttemptRef.current += 1
        }
      }

      const handleTerminalExit = (data) => {
        if (data.terminalId === terminalIdRef.current) {
          setOutput((prev) => [
            ...prev,
            { type: "system", text: `Terminal session ended (exit code: ${data.exitCode})` },
          ])
          terminalIdRef.current = null
          setIsConnected(false)
        }
      }

      // Register event listeners
      socket.on("terminal-created", handleTerminalCreated)
      socket.on("terminal-output", handleTerminalOutput)
      socket.on("terminal-error", handleTerminalError)
      socket.on("terminal-exit", handleTerminalExit)

      // Create a new terminal
      socket.emit("terminal-create", { projectId })

      // Cleanup on unmount
      return () => {
        socket.off("terminal-created", handleTerminalCreated)
        socket.off("terminal-output", handleTerminalOutput)
        socket.off("terminal-error", handleTerminalError)
        socket.off("terminal-exit", handleTerminalExit)

        // Close the terminal if it exists
        if (terminalIdRef.current) {
          socket.emit("terminal-close", { terminalId: terminalIdRef.current })
        }
      }
    }
  }, [socket, projectId, onCommandOutput])

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output])

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!command.trim()) return

    // Add command to history
    setHistory((prev) => [...prev, command])
    setHistoryIndex(-1)

    // Add command to output
    setOutput((prev) => [...prev, { type: "command", text: command }])

    setIsLoading(true)

    try {
      // Special case for clear command
      if (command.trim() === "clear") {
        setOutput([])
        setCommand("")
        setIsLoading(false)
        return
      } else if (command.trim() === "help") {
        const helpText = `Available commands:
- Basic: ls, dir, cd, pwd, mkdir, touch, rm, cat
- Node.js: node, npm
- Python: python, pip
- Utilities: echo, grep, find
- Terminal: clear, help

Note: For security reasons, some commands and operations are restricted.`

        setOutput((prev) => [
          ...prev,
          {
            type: "output",
            text: helpText,
          },
        ])

        // Also send to code preview
        if (onCommandOutput) {
          onCommandOutput(helpText)
        }

        setCommand("")
        setIsLoading(false)
        return
      } else {
        // Use the HTTP API for all commands
        await handleFallbackCommand(command)
      }
    } catch (error) {
      console.error("Command execution error:", error)
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: `Error: ${error.message}`,
        },
      ])
    } finally {
      setIsLoading(false)
      setCommand("")
    }
  }

  // Handle commands in fallback mode
  const handleFallbackCommand = async (cmd) => {
    try {
      // Use the terminal API to execute commands
      const response = await fetch(`http://localhost:3500/api/terminal/exec/${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: cmd }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()

      // Update current directory if it was changed
      if (result.cwd) {
        setCurrentDirectory(result.cwd)
      }

      // Add output to terminal
      setOutput((prev) => [
        ...prev,
        {
          type: result.error ? "error" : "output",
          text: result.output || "Command executed successfully",
        },
      ])

      // Send output to code preview
      if (onCommandOutput) {
        onCommandOutput(result.output)
      }
    } catch (error) {
      console.error("Command execution error:", error)
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: `Error: ${error.message}`,
        },
      ])
    }
  }

  const handleKeyDown = (e) => {
    // Handle up arrow for history
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      }
    }

    // Handle down arrow for history
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand("")
      }
    }

    // Handle tab for auto-complete (placeholder)
    if (e.key === "Tab") {
      e.preventDefault()
      // Future enhancement: implement auto-complete
    }
  }

  // Format the current directory for display
  const getPromptDirectory = () => {
    if (!currentDirectory) return "~"

    // Extract the last part of the path for cleaner display
    const parts = currentDirectory.split(/[/\\]/)
    return parts[parts.length - 1] || "/"
  }

  return (
    <div
      className="h-full bg-gray-900 text-gray-100 font-mono text-sm p-2 overflow-auto"
      ref={terminalRef}
      onClick={handleTerminalClick}
    >
      <div className="mb-2">
        <div className="flex items-center space-x-2 mb-1">
          <div className={`h-3 w-3 rounded-full ${isConnected || fallbackMode ? "bg-green-500" : "bg-red-500"}`}></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs text-gray-400">
            Terminal {fallbackMode ? "(Fallback Mode)" : isConnected ? "(Connected)" : "(Disconnected)"}
          </span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="mb-2">
        {output.map((item, index) => (
          <div key={index} className="mb-1">
            {item.type === "command" && (
              <div>
                <span className="text-green-400">user@workspace:{getPromptDirectory()}$</span> <span>{item.text}</span>
              </div>
            )}
            {item.type === "output" && <div className="whitespace-pre-wrap pl-4">{item.text}</div>}
            {item.type === "error" && <div className="text-red-400 whitespace-pre-wrap pl-4">{item.text}</div>}
            {item.type === "system" && <div className="text-blue-400 whitespace-pre-wrap">{item.text}</div>}
          </div>
        ))}

        {isLoading && (
          <div className="pl-4 text-yellow-300">
            <span className="inline-block animate-pulse">⟳</span> Processing...
          </div>
        )}
      </div>

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="flex items-center">
        <span className="text-green-400 mr-2">user@workspace:{getPromptDirectory()}$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none"
          autoFocus
          disabled={isLoading && !fallbackMode}
          placeholder={!isConnected && !fallbackMode ? "Terminal disconnected..." : ""}
        />
      </form>
    </div>
  )
}

export default Terminal
