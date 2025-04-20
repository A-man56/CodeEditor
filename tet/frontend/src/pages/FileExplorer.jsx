"use client"

import { useState } from "react"
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon } from "./icons"

const FileItem = ({ file, depth = 0, onFileSelect, selectedFile, isOpen, onToggle }) => {
  const isSelected = selectedFile && selectedFile.id === file.id
  const isFolder = file.type === "folder"

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-200 ${
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
      >
        {isFolder && (
          <span className="mr-1 text-gray-500">
            {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </span>
        )}

        <span className="mr-2 text-gray-500">
          {isFolder ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
        </span>

        <span className="text-sm truncate">{file.name}</span>
      </div>

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
            />
          ))}
        </div>
      )}
    </div>
  )
}

const FileExplorer = ({ files, onFileSelect, selectedFile }) => {
  const [openFolders, setOpenFolders] = useState(new Set([1])) // Default open the src folder

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

  return (
    <div className="p-2">
      <div className="text-xs uppercase font-semibold text-gray-500 mb-2 px-2">Explorer</div>

      <div>
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
            isOpen={openFolders.has(file.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}

export default FileExplorer
