"use client"

import { useState, useRef, useEffect } from "react"
import {
  FolderIcon,
  FileIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EditIcon,
  TrashIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  DotsVerticalIcon,
} from "./icons"

// contex menu component
const ContextMenu = ({ x, y, onClose, options }) => {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute bg-white shadow-lg rounded-md py-1 z-50 min-w-[160px]"
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      {options.map((option, index) => (
        <div
          key={index}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
          onClick={() => {
            option.onClick()
            onClose()
          }}
        >
          {option.icon && <span className="mr-2">{option.icon}</span>}
          {option.label}
        </div>
      ))}
    </div>
  )
}

// input dialog component
const InputDialog = ({ title, initialValue = "", onSubmit, onCancel, placeholder = "" }) => {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
          />
          <div className="flex justify-end mt-4 space-x-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 hover:text-gray-900">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={!value.trim()}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FileItem = ({
  file,
  depth = 0,
  onFileSelect,
  selectedFile,
  isOpen,
  onToggle,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  projectId,
  onFilesChanged,
  socket,
}) => {
  const [contextMenu, setContextMenu] = useState(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const isSelected = selectedFile && selectedFile.id === file.id
  const isFolder = file.type === "folder"

  const handleContextMenu = (e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleRename = () => {
    setIsRenaming(true)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      onDelete(file)
    }
  }

  const handleCreateFileInner = (parentPath, fileName) => {
    onCreateFile(parentPath, fileName)
  }

  const handleCreateFolderInner = (parentPath, folderName) => {
    onCreateFolder(parentPath, folderName)
  }

  const getContextMenuOptions = () => {
    const options = [
      { label: "Rename", icon: <EditIcon className="h-4 w-4" />, onClick: handleRename },
      { label: "Delete", icon: <TrashIcon className="h-4 w-4" />, onClick: handleDelete },
    ]

    if (isFolder) {
      options.unshift(
        {
          label: "New File",
          icon: <DocumentPlusIcon className="h-4 w-4" />,
          onClick: () => handleCreateFile(file.path),
        },
        {
          label: "New Folder",
          icon: <FolderPlusIcon className="h-4 w-4" />,
          onClick: () => handleCreateFolder(file.path),
        },
      )
    }

    return options
  }

  const handleCreateFile = (parentPath) => {
    setIsCreatingFile(true)
  }

  const handleCreateFolder = (parentPath) => {
    setIsCreatingFolder(true)
  }

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-200 group ${
          isSelected ? "bg-blue-100 hover:bg-blue-100" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            onToggle(file.id)
          } else {
            onFileSelect(file)
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {isFolder && (
          <span className="mr-1 text-gray-500">
            {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </span>
        )}

        <span className="mr-2 text-gray-500">
          {isFolder ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
        </span>

        <span className="text-sm truncate flex-grow">{file.name}</span>

        <div className="opacity-0 group-hover:opacity-100 flex">
          <button
            className="p-1 text-gray-500 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation()
              setContextMenu({ x: e.clientX, y: e.clientY })
            }}
          >
            <DotsVerticalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={getContextMenuOptions()}
        />
      )}

      {isRenaming && (
        <InputDialog
          title={`Rename ${isFolder ? "folder" : "file"}`}
          initialValue={file.name}
          onSubmit={(newName) => {
            onRename(file, newName)
            setIsRenaming(false)
          }}
          onCancel={() => setIsRenaming(false)}
          placeholder="Enter new name"
        />
      )}

      {isCreatingFile && (
        <InputDialog
          title="Create new file"
          onSubmit={(fileName) => {
            handleCreateFileInner(file.path, fileName)
            setIsCreatingFile(false)
          }}
          onCancel={() => setIsCreatingFile(false)}
          placeholder="Enter file name"
        />
      )}

      {isCreatingFolder && (
        <InputDialog
          title="Create new folder"
          onSubmit={(folderName) => {
            handleCreateFolderInner(file.path, folderName)
            setIsCreatingFolder(false)
          }}
          onCancel={() => setIsCreatingFolder(false)}
          placeholder="Enter folder name"
        />
      )}

      {isFolder && isOpen && file.children && (
        <div>
          {file.children.map((childFile) => (
            <FileItem
              key={childFile.id}
              file={childFile}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              isOpen={isOpen}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              projectId={projectId}
              onFilesChanged={onFilesChanged}
              socket={socket}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Enhance the file operations to emit socket events
// Modify the handleCreateFile function:

const handleCreateFile = async (projectId, parentPath, fileName, onFilesChanged, socket) => {
  try {
    const response = await fetch(`http://localhost:3500/api/create-file/${projectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: parentPath || "",
        name: fileName,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to create file")
    }

    // Get the new file path
    const newFilePath = parentPath ? `${parentPath}/${fileName}` : fileName

    // Emit socket event for file creation
    if (socket && socket.connected) {
      socket.emit("file-update", {
        projectId,
        filePath: newFilePath,
        content: "", // New file is empty
        action: "create",
      })
    }

    // Refresh file list
    onFilesChanged()
  } catch (error) {
    console.error("Error creating file:", error)
    alert(`Error creating file: ${error.message}`)
  }
}

// Similarly modify handleCreateFolder:
const handleCreateFolder = async (projectId, parentPath, folderName, onFilesChanged, socket) => {
  try {
    const response = await fetch(`http://localhost:3500/api/folder/${projectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: parentPath || "",
        name: folderName,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to create folder")
    }

    // Get the new folder path
    const newFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName

    // Emit socket event for folder creation
    if (socket && socket.connected) {
      socket.emit("file-update", {
        projectId,
        filePath: newFolderPath,
        isFolder: true,
        action: "create",
      })
    }

    // Refresh file list
    onFilesChanged()
  } catch (error) {
    console.error("Error creating folder:", error)
    alert(`Error creating folder: ${error.message}`)
  }
}

// Add socket prop to the FileExplorer component
// Update the component definition:
const FileExplorer = ({ files, onFileSelect, selectedFile, projectId, onFilesChanged, socket }) => {
  const [openFolders, setOpenFolders] = useState(new Set([1])) // Default open the src folder
  const [isCreatingRootFile, setIsCreatingRootFile] = useState(false)
  const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false)

  const handleToggle = (folderId) => {
    setOpenFolders((prev) => {
      const newOpenFolders = new Set(prev)
      if (newOpenFolders.has(folderId)) {
        newOpenFolders.delete(folderId)
      } else {
        newOpenFolders.add(folderId)
      }
      return newOpenFolders
    })
  }

  const handleRename = async (file, newName) => {
    try {
      const response = await fetch(`http://localhost:3500/api/rename/${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPath: file.path,
          newName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to rename")
      }

      // Refresh file list after successful rename
      onFilesChanged()
    } catch (error) {
      console.error("Error renaming:", error)
      alert(`Error renaming: ${error.message}`)
    }
  }

  const handleDelete = async (file) => {
    try {
      const response = await fetch(`http://localhost:3500/api/delete/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: file.path,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete")
      }

      // Refresh file list after successful deletion
      onFilesChanged()
    } catch (error) {
      console.error("Error deleting:", error)
      alert(`Error deleting: ${error.message}`)
    }
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="text-xs uppercase font-semibold text-gray-500">Explorer</div>
        <div className="flex space-x-1">
          <button
            className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-200"
            title="New File"
            onClick={() => setIsCreatingRootFile(true)}
          >
            <DocumentPlusIcon className="h-4 w-4" />
          </button>
          <button
            className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-200"
            title="New Folder"
            onClick={() => setIsCreatingRootFolder(true)}
          >
            <FolderPlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
            isOpen={openFolders.has(file.id)}
            onToggle={handleToggle}
            onRename={handleRename}
            onDelete={handleDelete}
            onCreateFile={(parentPath, fileName) =>
              handleCreateFile(projectId, parentPath, fileName, onFilesChanged, socket)
            }
            onCreateFolder={(parentPath, folderName) =>
              handleCreateFolder(projectId, parentPath, folderName, onFilesChanged, socket)
            }
            projectId={projectId}
            onFilesChanged={onFilesChanged}
            socket={socket}
          />
        ))}
      </div>

      {isCreatingRootFile && (
        <InputDialog
          title="Create new file"
          onSubmit={(fileName) => {
            handleCreateFile(projectId, "", fileName, onFilesChanged, socket)
            setIsCreatingRootFile(false)
          }}
          onCancel={() => setIsCreatingRootFile(false)}
          placeholder="Enter file name"
        />
      )}

      {isCreatingRootFolder && (
        <InputDialog
          title="Create new folder"
          onSubmit={(folderName) => {
            handleCreateFolder(projectId, "", folderName, onFilesChanged, socket)
            setIsCreatingRootFolder(false)
          }}
          onCancel={() => setIsCreatingRootFolder(false)}
          placeholder="Enter folder name"
        />
      )}
    </div>
  )
}

export default FileExplorer
