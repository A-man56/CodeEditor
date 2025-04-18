"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FolderIcon, PlusIcon } from "./icons"
import ProjectModal from "./ProjectModal"

const Dashboard = () => {
  const [projects, setProjects] = useState([
    { id: 1, name: "React Todo App", techStack: "React" },
    { id: 2, name: "Weather API", techStack: "Node.js" },
    { id: 3, name: "Data Analyzer", techStack: "Python" },
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleCreateProject = (project) => {
    const newProject = {
      id: projects.length + 1,
      ...project,
    }
    setProjects([...projects, newProject])
    setIsModalOpen(false)
  }

  const handleProjectClick = (projectId) => {
    navigate(`/workspace/${projectId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Projects</h1>

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

      {isModalOpen && <ProjectModal onClose={() => setIsModalOpen(false)} onCreate={handleCreateProject} />}
    </div>
  )
}

export default Dashboard
