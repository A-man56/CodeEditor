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
  const [commandOutput, setCommandOutput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [socket, setSocket] = useState(null)
  const [socketError, setSocketError] = useState(null)
  const socketInitialized = useRef(false)

  // Initialize socket connection
  useEffect(() => {
    if (socketInitialized.current) return

    console.log("Initializing socket connection...")

    try {
      const socketConnection = io("http://localhost:3500", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ["websocket", "polling"], // Try WebSocket first, then fall back to polling
      })

      socketConnection.on("connect", () => {
        console.log("Socket connected:", socketConnection.id)
        setSocketError(null)

        // Join the project room
        socketConnection.emit("join-project", projectId)
        setSocket(socketConnection)
      })

      socketConnection.on("connect_error", (error) => {
        console.error("Socket connection error:", error)
        setSocketError(`Connection error: ${error.message}`)
      })

      socketConnection.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
      })

      socketConnection.on("reconnect_failed", () => {
        console.error("Socket reconnection failed")
        setSocketError("Failed to connect to server after multiple attempts")
      })

      // Listen for file updates from other clients
      socketConnection.on("file-updated", (data) => {
        console.log("Received file update from server:", data)

        // If the currently selected file is updated, update its content
        if (selectedFile && data.filePath === selectedFile.path) {
          setSelectedFile((prev) => ({ ...prev, content: data.content }))
        }

        // Always refresh the file list to show new files/folders
        loadProjectFiles()
      })

      socketInitialized.current = true
      setSocket(socketConnection)

      // Clean up on unmount
      return () => {
        console.log("Disconnecting socket...")
        socketConnection.disconnect()
      }
    } catch (error) {
      console.error("Error initializing socket:", error)
      setSocketError(`Socket initialization error: ${error.message}`)
    }
  }, [projectId])

  // Load project files
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

      // Select the first file if available and no file is currently selected
      if (data.files.length > 0 && !selectedFile) {
        const firstFile = findFirstFile(data.files)
        if (firstFile) {
          console.log("Selecting first file:", firstFile)
          handleFileSelect(firstFile)
        }
      }
    } catch (error) {
      console.error("Error loading project:", error)
      setCommandOutput(`Error loading project: ${error.message}`)
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
        // Clear command output when selecting a new file
        setCommandOutput("")
      } catch (error) {
        console.error("Error loading file:", error)
        setCommandOutput(`Error loading file: ${error.message}`)
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

      // Emit the update via socket
      if (socket && socket.connected) {
        console.log("Emitting file update via socket")
        socket.emit("file-update", {
          projectId,
          filePath: path,
          content,
        })
      } else {
        console.warn("Socket not connected, file update not broadcasted")
      }
    } catch (error) {
      console.error("Error updating file:", error)
      setCommandOutput(`Error updating file: ${error.message}`)
    }
  }

  // Handle command output
  const handleCommandOutput = (output) => {
    setCommandOutput(output)
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
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {project?.name || "Project"}
            <span className="text-sm text-gray-500 ml-2">({project?.techStack})</span>
          </h1>

          {socketError && (
            <div className="text-sm text-red-500 flex items-center">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Server connection error
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-1/5 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            projectId={projectId}
            onFilesChanged={loadProjectFiles}
            socket={socket}
          />
        </div>

        <div className="w-4/5 flex flex-col">
          {/* Code Preview */}
          <div className="flex-1 overflow-hidden">
            <CodePreview
              file={selectedFile}
              onFileUpdate={handleFileUpdate}
              socket={socket}
              commandOutput={commandOutput}
            />
          </div>

          {/* Terminal */}
          <div className="h-1/3 border-t border-gray-200">
            <Terminal projectId={projectId} socket={socket} onCommandOutput={handleCommandOutput} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workspace
