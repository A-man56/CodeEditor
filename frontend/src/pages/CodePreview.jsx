"use client"

import { useState, useEffect } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { cpp } from "@codemirror/lang-cpp"
import { python } from "@codemirror/lang-python"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"

const CodePreview = ({ file, onFileUpdate, socket, commandOutput }) => {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState(null)
  const [fileType, setFileType] = useState("")
  const [displayOutput, setDisplayOutput] = useState("")

  useEffect(() => {
    if (file) {
      setCode(file.content || "")

      const ext = file.name.split(".").pop().toLowerCase()
      switch (ext) {
        case "js":
        case "jsx":
        case "json":
          setLanguage(javascript())
          setFileType("JavaScript")
          break
        case "html":
          setLanguage(html())
          setFileType("HTML")
          break
        case "cpp":
        case "cc":
        case "c++":
        case "h":
        case "hpp":
          setLanguage(cpp())
          setFileType("C++")
          break
        case "py":
          setLanguage(python())
          setFileType("Python")
          break
        case "css":
          setLanguage(html()) // Using HTML for CSS as it has decent CSS syntax highlighting
          setFileType("CSS")
          break
        default:
          setLanguage(null)
          setFileType("Text")
      }
    }
  }, [file])

  // Process command output for display
  useEffect(() => {
    if (commandOutput) {
      // Clean up ANSI escape codes and other terminal control characters
      const cleanOutput = commandOutput
        .replace(/\u001b\[\d+m/g, "") // Remove ANSI color codes
        .replace(/\r\n/g, "\n") // Normalize line endings

      setDisplayOutput(cleanOutput)
    }
  }, [commandOutput])

  // Send code updates to the server when the code changes
  const handleCodeChange = (value) => {
    setCode(value)

    // Update the file on the server
    if (file) {
      onFileUpdate(file.path, value)
    }
  }

  // Listen for updates from the server via socket
  useEffect(() => {
    if (socket && file) {
      const handleFileUpdated = (data) => {
        if (data.filePath === file.path) {
          setCode(data.content)
        }
      }

      socket.on("file-updated", handleFileUpdated)

      return () => {
        socket.off("file-updated", handleFileUpdated)
      }
    }
  }, [socket, file])

  if (!file) {
    return <div className="h-full flex items-center justify-center text-gray-500">Select a file to view</div>
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-2 flex justify-between items-center bg-white">
        <span className="font-medium">{file.name}</span>
        <span className="text-xs text-gray-500">{file.path}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="w-1/2 border-r border-gray-200 h-full overflow-auto">
          <div className="h-full">
            <CodeMirror
              value={code}
              height="100%"
              extensions={language ? [language] : []}
              onChange={(value) => handleCodeChange(value)}
              theme={vscodeDark}
              basicSetup={{ lineNumbers: true }}
              className="h-full"
            />
          </div>
        </div>

        {/* Preview/Output */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {displayOutput ? (
              <div className="h-full bg-gray-900 text-white p-4 font-mono text-sm overflow-auto">
                <div className="mb-2 text-gray-400 flex items-center justify-between">
                  <span>Command Output:</span>
                  <button onClick={() => setDisplayOutput("")} className="text-xs text-gray-400 hover:text-white">
                    Clear
                  </button>
                </div>
                <pre className="whitespace-pre-wrap">{displayOutput}</pre>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md p-4 h-full flex items-center justify-center bg-white">
                {fileType} Preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodePreview
