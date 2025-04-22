"use client"

import { useState, useRef, useEffect } from "react"
import "xterm/css/xterm.css"

const Terminal = ({ projectId, socket, onCommandOutput }) => {
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [output, setOutput] = useState([
    { type: "system", text: "Terminal initialized. Type 'help' for available commands." },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [currentDirectory, setCurrentDirectory] = useState("")
  const terminalRef = useRef(null)
  const inputRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const terminalIdRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  // Initialize terminal directory
  useEffect(() => {
    if (projectId) {
      setCurrentDirectory(`/workspace/${projectId}`)
    }
  }, [projectId])

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
      }

      // Special case for help command
      if (command.trim() === "help") {
        const helpText = `Available commands:
- Basic: ls, cd, pwd, mkdir, touch, rm, cat
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
      }

      // Handle CD command specially
      if (command.startsWith("cd ")) {
        const dir = command.substring(3).trim()
        setCurrentDirectory((prev) => {
          // Simple path resolution logic
          let newPath = prev
          if (dir.startsWith("/")) {
            newPath = dir
          } else if (dir === "..") {
            const parts = prev.split("/")
            parts.pop()
            newPath = parts.join("/") || "/"
          } else {
            newPath = `${prev === "/" ? "" : prev}/${dir}`
          }
          return newPath
        })

        setOutput((prev) => [...prev, { type: "output", text: "" }])
        setCommand("")
        setIsLoading(false)
        return
      }

      // Handle other commands with simulated output
      let commandOutput = ""

      if (command === "ls" || command === "dir") {
        commandOutput = "file1.js\nfile2.js\nnode_modules/\npackage.json\nREADME.md"
      } else if (command === "pwd") {
        commandOutput = currentDirectory
      } else if (command.startsWith("echo ")) {
        commandOutput = command.substring(5)
      } else if (command.startsWith("npm install")) {
        commandOutput = `> Installing packages...
added 1283 packages in 25s
+ react@18.2.0
+ react-dom@18.2.0
+ typescript@5.0.4
+ @types/react@18.0.28
+ @types/node@18.15.11
+ @types/react-dom@18.0.11

Done in 25.31s.`
      } else if (command.startsWith("npm run")) {
        const script = command.substring(8).trim()
        if (script === "dev" || script === "start") {
          commandOutput = `> project@0.1.0 ${script}
> next dev

ready - started server on 0.0.0.0:3000, url: http://localhost:3000
event - compiled client and server successfully in 188 ms (175 modules)
wait - compiling...
event - compiled successfully in 38 ms (175 modules)`
        } else {
          commandOutput = `> project@0.1.0 ${script}
> next ${script}

Unknown script "${script}". Available scripts: dev, build, start`
        }
      } else if (command === "node -v") {
        commandOutput = "v18.16.0"
      } else if (command === "npm -v") {
        commandOutput = "9.5.1"
      } else if (command.startsWith("mkdir ")) {
        commandOutput = `Directory created: ${command.substring(6).trim()}`
      } else if (command.startsWith("touch ")) {
        commandOutput = `File created: ${command.substring(6).trim()}`
      } else if (command.startsWith("rm ")) {
        commandOutput = `Removed: ${command.substring(3).trim()}`
      } else if (command.startsWith("cat ") || command.startsWith("type ")) {
        const fileName = command.substring(command.indexOf(" ") + 1).trim()
        commandOutput = `File content of ${fileName}:\n// This is a simulated file content\nconsole.log("Hello World");`
      } else {
        commandOutput = `Command not found: ${command}`
      }

      // Add output to terminal
      setOutput((prev) => [
        ...prev,
        {
          type: "output",
          text: commandOutput,
        },
      ])

      // Send output to code preview
      if (onCommandOutput) {
        onCommandOutput(commandOutput)
      }
    } catch (error) {
      console.error("Command execution error:", error)
      const errorMessage = `Error: ${error.message}`

      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: errorMessage,
        },
      ])

      // Send error to code preview
      if (onCommandOutput) {
        onCommandOutput(errorMessage)
      }
    } finally {
      setIsLoading(false)
      setCommand("")
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
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs text-gray-400">Terminal</span>
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
          disabled={isLoading}
        />
      </form>
    </div>
  )
}

export default Terminal
