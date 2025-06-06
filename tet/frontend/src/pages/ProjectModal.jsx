"use client"

import { useState } from "react"
import { XIcon } from "./icons"

const techStacks = ["React", "Node.js", "Python", "C++"]

const ProjectModal = ({ onClose, onCreate, isLoading }) => {
  const [projectName, setProjectName] = useState("")
  const [selectedTechStack, setSelectedTechStack] = useState(techStacks[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!projectName.trim()) return

    onCreate({
      name: projectName,
      techStack: selectedTechStack,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="project-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
          disabled={isLoading}
        >
          <XIcon className="h-6 w-6" />
        </button>

        <h2 id="project-modal-title" className="text-2xl font-bold mb-6">
          Create New Project
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Project"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">Tech Stack</label>
            <div className="grid grid-cols-2 gap-3">
              {techStacks.map((tech) => (
                <div
                  key={tech}
                  onClick={() => !isLoading && setSelectedTechStack(tech)}
                  className={`border rounded-md p-3 cursor-pointer transition-colors ${
                    selectedTechStack === tech
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-selected={selectedTechStack === tech ? "true" : "false"}
                >
                  {tech}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 mr-2"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${
                projectName.trim() && !isLoading
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-400 text-gray-700"
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              disabled={!projectName.trim() || isLoading}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal
