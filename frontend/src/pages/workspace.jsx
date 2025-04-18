"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import FileExplorer from "./FileExplorer.jsx"
import CodePreview from "./CodePreview.jsx"
import Terminal from "./Terminal.jsx"

const GITHUB_OWNER = "A-man56"
const GITHUB_REPO = "code-templates"

const Workspace = () => {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [terminalOutput, setTerminalOutput] = useState([])

  useEffect(() => {
    const fetchRecursive = async (path, parentId = "") => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
      )
      const data = await response.json()

      const result = await Promise.all(
        data.map(async (item, index) => {
          const id = `${parentId}${index + 1}`

          if (item.type === "dir") {
            const children = await fetchRecursive(item.path, id + "-")
            return {
              id,
              name: item.name,
              type: "folder",
              path: item.path,
              children,
            }
          } else {
            return {
              id,
              name: item.name,
              type: "file",
              path: item.path,
              content: null,
            }
          }
        })
      )

      return result
    }

    const loadFiles = async () => {
      const projectPath = projectId
      const tree = await fetchRecursive(projectPath)

      setFiles(tree)

      setProject({
        id: projectId,
        name: `${projectId} Project`,
        techStack: projectId,
      })

      const firstFile = findFirstFile(tree)
      if (firstFile) {
        const content = await fetchFileContent(firstFile.path)
        setSelectedFile({ ...firstFile, content })
      }
    }

    const fetchFileContent = async (path) => {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
      )
      const fileData = await res.json()
      return atob(fileData.content)
    }

    const findFirstFile = (nodes) => {
      for (const node of nodes) {
        if (node.type === "file") return node
        if (node.type === "folder") {
          const found = findFirstFile(node.children || [])
          if (found) return found
        }
      }
      return null
    }

    loadFiles()
  }, [projectId])

  const handleFileSelect = async (file) => {
    if (file.type === "file") {
      const content = await fetchFileContent(file.path)
      setSelectedFile({ ...file, content })
    }
  }

  const fetchFileContent = async (path) => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
      )
      const fileData = await res.json()
      return atob(fileData.content)
    } catch (err) {
      console.error("Error loading file content", err)
      return "// Failed to load content"
    }
  }

  const handleTerminalCommand = (command) => {
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

      setTerminalOutput((prev) => [
        ...prev,
        { type: "command", text: command },
        { type: "output", text: output },
      ])
    } else {
      setTerminalOutput((prev) => [
        ...prev,
        { type: "command", text: command },
        { type: "error", text: "Error: Command not allowed for security reasons." },
      ])
    }
  }

  const listFiles = (nodes, prefix = "") => {
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

  if (!project) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold">{project.name}</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/5 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <FileExplorer files={files} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
        </div>

        <div className="w-4/5 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CodePreview file={selectedFile} />
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
