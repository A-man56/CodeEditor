"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import FileExplorer from "./FileExplorer.jsx"
import CodePreview from "./CodePreview.jsx"
import Terminal from "./Terminal.jsx"
import io from "socket.io-client"

const Workspace = () => {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [terminalOutput, setTerminalOutput] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    console.log("Initializing socket connection...")
    socketRef.current = io("http://localhost:3500")

    // join project room
    socketRef.current.emit("join-project", projectId)

    // clean up on unmount
    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket...")
        socketRef.current.disconnect()
      }
    }
  }, [projectId])

  const loadProjectFiles = async () => {
    console.log("Loading project files for projectId:", projectId)
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:3500/api/files/${projectId}`)

      if (!response.ok) {
        throw new Error("Failed to load project files")
      }

      const data = await response.json()
      console.log("Project files loaded:", data)
      setFiles(data.files)
      setProject(data.projectInfo)

      // slct the first file if available and no file is currently selected
      if (data.files.length > 0 && !selectedFile) {
        const firstFile = findFirstFile(data.files)
        if (firstFile) {
          console.log("Selecting first file:", firstFile)
          handleFileSelect(firstFile)
        }
      }
    } catch (error) {
      console.error("Error loading project:", error)
      setTerminalOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: `Error loading project: ${error.message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjectFiles()
  }, [projectId])

  // Find the first file in the file tree
  const findFirstFile = (nodes) => {
    console.log("Finding first file in nodes:", nodes)
    for (const node of nodes) {
      if (node.type === "file") return node
      if (node.type === "folder" && node.children) {
        const found = findFirstFile(node.children)
        if (found) return found
      }
    }
    return null
  }

  // Handle file selection
  const handleFileSelect = async (file) => {
    console.log("Selecting file:", file)
    if (file.type === "file") {
      try {
        const response = await fetch(`http://localhost:3500/api/file/${projectId}/${file.path}`)

        if (!response.ok) {
          throw new Error("Failed to load file content")
        }

        const data = await response.json()
        setSelectedFile({ ...file, content: data.content })
      } catch (error) {
        console.error("Error loading file:", error)
        setTerminalOutput((prev) => [
          ...prev,
          {
            type: "error",
            text: `Error loading file: ${error.message}`,
          },
        ])
      }
    }
  }

  // Handle file update
  const handleFileUpdate = async (path, content) => {
    console.log("Updating file:", path)
    try {
      // Update the file on the server
      await fetch(`http://localhost:3500/api/file/${projectId}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      })

      // emit the update via socket
      socketRef.current.emit("file-update", {
        projectId,
        filePath: path,
        content,
      })
    } catch (error) {
      console.error("Error updating file:", error)
      setTerminalOutput((prev) => [
        ...prev,
        {
          type: "error",
          text: `Error updating file: ${error.message}`,
        },
      ])
    }
  }

  //  ++++terminal commands ++++

  
  const handleTerminalCommand = (command) => {
    console.log("Handling terminal command:", command)
    const allowedCommands = ["ls", "pwd", "echo", "npm install", "npm run"]
    const isAllowed = allowedCommands.some((cmd) => command.startsWith(cmd))

    if (isAllowed) {
      let output = ""

      if (command === "ls") {
        output = listFiles(files).join("\n")
      } else if (command === "pwd") {
        output = `/workspace/${projectId}`
      } else if (command.startsWith("echo ")) {
        output = command.substring(5)
      } else if (command.startsWith("npm install")) {
        output = "Installing dependencies...\nAdded 1283 packages in 25s\nDone!"
      } else if (command.startsWith("npm run")) {
        output = "Starting development server...\nServer running at http://localhost:3000"
      }

      setTerminalOutput((prev) => [...prev, { type: "command", text: command }, { type: "output", text: output }])
    } else {
      setTerminalOutput((prev) => [
        ...prev,
        { type: "command", text: command },
        { type: "error", text: "Error: Command not allowed for security reasons." },
      ])
    }
  }

  const listFiles = (nodes, prefix = "") => {
    console.log("Listing files with prefix:", prefix)
    let result = []
    for (const node of nodes) {
      if (node.type === "file") {
        result.push(prefix + node.name)
      } else if (node.type === "folder") {
        result.push(prefix + node.name + "/")
        result = result.concat(listFiles(node.children || [], prefix + node.name + "/"))
      }
    }
    return result
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold">
          {project?.name || "Project"}
          <span className="text-sm text-gray-500 ml-2">({project?.techStack})</span>
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/5 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            projectId={projectId}
            onFilesChanged={loadProjectFiles}
          />
        </div>

        <div className="w-4/5 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CodePreview file={selectedFile} onFileUpdate={handleFileUpdate} socket={socketRef.current} />
          </div>

          <div className="h-1/3 border-t border-gray-200">
            <Terminal output={terminalOutput} onCommand={handleTerminalCommand} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workspace
