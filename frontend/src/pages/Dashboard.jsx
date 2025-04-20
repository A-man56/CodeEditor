"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FolderIcon, PlusIcon } from "./icons"
import ProjectModal from "./ProjectModal"

const Dashboard = () => {
  const [projects, setProjects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleCreateProject = async (project) => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Creating project:", project)

      const res = await fetch("http://localhost:3500/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          techStack: project.techStack,
        }),
      })

      console.log("Response status:", res.status)

      const data = await res.json()
      console.log("Response data:", data)

      if (res.ok) {
        const newProject = {
          id: data.projectId,
          name: project.name,
          techStack: project.techStack,
        }
        setProjects([...projects, newProject])
        setIsModalOpen(false)

        // navigate to the workspace with the new projectid
        navigate(`/workspace/${data.projectId}`)
      } else {
        setError(data.message || "Failed to create project")
        alert("Failed to create project: " + (data.message || "Unknown error"))
      }
    } catch (err) {
      console.error("Project creation error:", err)
      setError("Server error: " + (err.message || "Unknown error"))
      alert("Server error: " + (err.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectClick = (projectId) => {
    navigate(`/workspace/${projectId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Projects</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => handleProjectClick(project.id)}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start mb-4">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <FolderIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{project.name}</h3>
                <p className="text-gray-500">{project.techStack}</p>
              </div>
            </div>
          </div>
        ))}

        <div
          onClick={() => setIsModalOpen(true)}
          className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors duration-200 min-h-[180px]"
        >
          <div className="bg-gray-100 p-3 rounded-full mb-4">
            <PlusIcon className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-gray-500 font-medium">Create New Project</p>
        </div>
      </div>

      {isModalOpen && (
        <ProjectModal onClose={() => setIsModalOpen(false)} onCreate={handleCreateProject} isLoading={isLoading} />
      )}
    </div>
  )
}

export default Dashboard
