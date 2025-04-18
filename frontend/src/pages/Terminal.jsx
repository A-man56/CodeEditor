"use client"

import { useState, useRef, useEffect } from "react"

const Terminal = ({ output, onCommand }) => {
  const [command, setCommand] = useState("")
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (command.trim()) {
      onCommand(command)
      setCommand("")
    }
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
        <div className="text-xs text-gray-400">Welcome to the terminal. Type commands below.</div>
        <div className="text-xs text-gray-400 mb-2">Allowed commands: ls, pwd, echo, npm install, npm run</div>
      </div>

      {/* Terminal Output */}
      <div className="mb-2">
        {output.map((item, index) => (
          <div key={index} className="mb-1">
            {item.type === "command" && (
              <div>
                <span className="text-green-400">user@workspace:~$</span> <span>{item.text}</span>
              </div>
            )}
            {item.type === "output" && <div className="whitespace-pre-wrap pl-4">{item.text}</div>}
            {item.type === "error" && <div className="text-red-400 whitespace-pre-wrap pl-4">{item.text}</div>}
          </div>
        ))}
      </div>

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="flex items-center">
        <span className="text-green-400 mr-2">user@workspace:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-transparent outline-none"
          autoFocus
        />
      </form>
    </div>
  )
}

export default Terminal
