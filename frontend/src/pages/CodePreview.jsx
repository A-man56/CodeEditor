"use client"

import { useState, useEffect } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { cpp } from "@codemirror/lang-cpp"
import { python } from "@codemirror/lang-python"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"

const CodePreview = ({ file, onFileUpdate, socket }) => {
  const [code, setCode] = useState("")
  const [preview, setPreview] = useState("")
  const [language, setLanguage] = useState(null)

  useEffect(() => {
    if (file) {
      setCode(file.content || "")

      const ext = file.name.split(".").pop().toLowerCase()
      switch (ext) {
        case "js":
        case "jsx":
        case "json":
          setLanguage(javascript())
          setPreview("JavaScript Preview")
          break
        case "html":
          setLanguage(html())
          setPreview("HTML Preview")
          break
        case "cpp":
        case "cc":
        case "c++":
        case "h":
        case "hpp":
          setLanguage(cpp())
          setPreview("C++ Code")
          break
        case "py":
          setLanguage(python())
          setPreview("Python Code")
          break
        case "css":
          setLanguage(html()) // Using HTML for CSS as it has decent CSS syntax highlighting
          setPreview("CSS Preview")
          break
        default:
          setLanguage(null)
          setPreview("No Preview")
      }
    }
  }, [file])

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

        {/* Preview */}
        <div className="w-1/2 p-4 overflow-auto">
          <div className="border border-gray-200 rounded-md p-4 h-full flex items-center justify-center bg-white">
            {preview}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodePreview
