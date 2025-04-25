const express = require("express")
const router = express.Router()
const fs = require("fs-extra")
const path = require("path")
const simpleGit = require("simple-git")
const { exec } = require("child_process")
const { v4: uuidv4 } = require("uuid")
const portManager = require("../utils/portManager")

const TEMP_DIR = path.join(__dirname, "..", "temp-projects")
const CLONE_TEMP = path.join(__dirname, "..", "clones-temp") // temp folder to clone full repo

// Ensure folders exist
fs.ensureDirSync(TEMP_DIR)
fs.ensureDirSync(CLONE_TEMP)

const FOLDER_MAP = {
  React: "react-app",
  "Node.js": "node",
  Python: "python",
  "C++": "cpp",
}

const REPO_URL = "https://github.com/A-man56/code-templates.git"
router.post("/create", async (req, res) => {
  const { techStack, name } = req.body
  console.log("Received project creation request:", { techStack, name })

  try {
    // Validate name and techStack
    if (!name) {
      console.log("No name provided")
      return res.status(400).json({ message: "Project name is required" })
    }

    if (!FOLDER_MAP[techStack]) {
      console.log("Invalid tech stack:", techStack)
      return res.status(400).json({ message: "Invalid tech stack" })
    }

    console.log("Input validated successfully")

    // Generate a unique project ID
    const projectId = uuidv4()
    console.log("Generated project ID:", projectId)

    const subFolder = FOLDER_MAP[techStack]
    const projectFolder = path.join(TEMP_DIR, projectId)
    const clonePath = path.join(CLONE_TEMP, `${projectId}-clone`)

    console.log("TEMP_DIR:", TEMP_DIR)
    console.log("CLONE_TEMP:", CLONE_TEMP)
    console.log("projectId:", projectId)
    console.log("Project name:", name)

    // Clone full repo into a temp folder
    console.log("Cloning repository...")
    await simpleGit().clone(REPO_URL, clonePath)
    console.log("Repository cloned successfully")

    const sourceSubfolder = path.join(clonePath, subFolder)
    if (!fs.existsSync(sourceSubfolder)) {
      console.error("Template folder not found:", sourceSubfolder)
      await fs.remove(clonePath)
      return res.status(500).json({ message: "Template folder not found in repo" })
    }

    // only the subfolder to the user's project folder
    console.log("Copying template to project folder...")
    await fs.copy(sourceSubfolder, projectFolder)
    console.log("Template copied successfully")

    // Assign a port to the project if it's a React or Node.js project
    let assignedPort = null
    if (techStack === "React" || techStack === "Node.js") {
      try {
        assignedPort = await portManager.assignPortToProject(projectId)
        console.log(`Assigned port ${assignedPort} to project ${projectId}`)
      } catch (portError) {
        console.error("Error assigning port:", portError)
        // Continue without a port if assignment fails
      }
    }

    // Create a project info file to store metadata
    const projectInfo = {
      id: projectId,
      name: name,
      techStack: techStack,
      createdAt: new Date().toISOString(),
      port: assignedPort,
    }

    await fs.writeJson(path.join(projectFolder, "project-info.json"), projectInfo)
    console.log("Project info saved")

    // If it's a React project, update the package.json with the assigned port
    if (techStack === "React" && assignedPort) {
      try {
        const packageJsonPath = path.join(projectFolder, "package.json")
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath)

          // Update the start script to use the assigned port
          if (packageJson.scripts && packageJson.scripts.start) {
            packageJson.scripts.start = `PORT=${assignedPort} react-scripts start`
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
            console.log(`Updated package.json with port ${assignedPort}`)
          }
        }
      } catch (packageJsonError) {
        console.error("Error updating package.json:", packageJsonError)
        // Continue even if package.json update fails
      }
    }

    // Clean up clone folder
    console.log("Cleaning up clone folder...")
    await fs.remove(clonePath)
    console.log("Clone folder removed")

    console.log("Sending success response")
    res.json({
      message: "Project created successfully!",
      projectId: projectId,
      name: name,
      techStack: techStack,
      port: assignedPort,
    })

    // run npm install in the background
    if (techStack === "React" || techStack === "Node.js") {
      console.log("Running npm install in the background...")
      exec("npm install", { cwd: projectFolder }, (err, stdout, stderr) => {
        if (err) {
          console.error("npm install error:", err)
          console.error("stderr:", stderr)
        } else {
          console.log("npm install completed successfully")
        }
      })
    }
  } catch (error) {
    console.error("Project creation failed:", error)
    return res.status(500).json({ message: "Project creation failed", error: error.message })
  }
})

// Get project files
router.get("/files/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params
    console.log("Fetching files for project:", projectId)

    const projectPath = path.join(TEMP_DIR, projectId)
    console.log("Full project path:", projectPath)

    if (!fs.existsSync(projectPath)) {
      console.log("Project not found at path:", projectPath)
      return res.status(404).json({ message: "Project not found" })
    }

    // Read project info
    let projectInfo = {}
    try {
      console.log("Attempting to read project-info.json...")
      projectInfo = await fs.readJson(path.join(projectPath, "project-info.json"))
      console.log("Project info successfully read:", projectInfo)

      // Check if port is assigned and still valid
      if (projectInfo.techStack === "React" || projectInfo.techStack === "Node.js") {
        if (!projectInfo.port) {
          // Assign a port if not already assigned
          try {
            const port = await portManager.assignPortToProject(projectId)
            projectInfo.port = port
            await fs.writeJson(path.join(projectPath, "project-info.json"), projectInfo)
            console.log(`Assigned port ${port} to project ${projectId}`)

            // Update package.json with the assigned port
            const packageJsonPath = path.join(projectPath, "package.json")
            if (fs.existsSync(packageJsonPath)) {
              const packageJson = await fs.readJson(packageJsonPath)
              if (packageJson.scripts && packageJson.scripts.start) {
                packageJson.scripts.start = `PORT=${port} react-scripts start`
                await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
                console.log(`Updated package.json with port ${port}`)
              }
            }
          } catch (portError) {
            console.error("Error assigning port:", portError)
          }
        } else {
          // Verify the port is still available
          const isAvailable = await portManager.isPortAvailable(projectInfo.port)
          if (!isAvailable) {
            try {
              // Assign a new port
              const newPort = await portManager.assignPortToProject(projectId)
              projectInfo.port = newPort
              await fs.writeJson(path.join(projectPath, "project-info.json"), projectInfo)
              console.log(`Reassigned port ${newPort} to project ${projectId}`)

              // Update package.json with the new port
              const packageJsonPath = path.join(projectPath, "package.json")
              if (fs.existsSync(packageJsonPath)) {
                const packageJson = await fs.readJson(packageJsonPath)
                if (packageJson.scripts && packageJson.scripts.start) {
                  packageJson.scripts.start = `PORT=${newPort} react-scripts start`
                  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
                  console.log(`Updated package.json with port ${newPort}`)
                }
              }
            } catch (portError) {
              console.error("Error reassigning port:", portError)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error reading project info:", err)
      // Continue even if project info is missing
    }

    // Function to recursively get files
    const getFilesRecursively = (dir, baseDir = "") => {
      console.log("Reading directory:", dir)
      const files = fs.readdirSync(dir)
      const result = []

      files.forEach((file, index) => {
        const fullPath = path.join(dir, file)
        const relativePath = path.join(baseDir, file)
        const stats = fs.statSync(fullPath)

        // Skip project-info.json and node_modules
        // if (file === "project-info.json" || file === "node_modules") {
        if (file === "project-info.json" || file === "node_modules") {
          console.log("Skipping file:", file)
          return
        }

        console.log("🔍 Checking file/folder:", fullPath)

        if (stats.isDirectory()) {
          console.log("📁 Directory found:", fullPath)

          const children = getFilesRecursively(fullPath, relativePath)
          result.push({
            id: `dir-${index}-${relativePath}`,
            name: file,
            type: "folder",
            path: relativePath,
            children,
          })
        } else {
          console.log("📄 File found:", fullPath)
          result.push({
            id: `file-${index}-${relativePath}`,
            name: file,
            type: "file",
            path: relativePath,
          })
        }
      })

      return result
    }

    const fileTree = getFilesRecursively(projectPath)
    console.log("Generated file tree:", fileTree)

    res.json({
      projectInfo,
      files: fileTree,
    })
  } catch (error) {
    console.error("Error getting project files:", error)
    res.status(500).json({
      message: "Failed to get project files",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// Get file content
router.get(/^\/file\/([^/]+)\/(.*)/, async (req, res) => {
  const projectId = req.params[0]
  const filePath = req.params[1]
  const fullPath = path.join(TEMP_DIR, projectId, filePath)

  try {
    console.log("Fetching file for project:", projectId)
    console.log("Full file path:", fullPath)

    if (!fs.existsSync(fullPath)) {
      console.log("File not found at path:", fullPath)
      return res.status(404).json({ message: "File not found" })
    }

    const stats = fs.statSync(fullPath)
    console.log("File stats:", stats)

    if (stats.isDirectory()) {
      console.log("The path is a directory, not a file:", fullPath)
      return res.status(400).json({ message: "Path is a directory, not a file" })
    }

    const content = fs.readFileSync(fullPath, "utf8")
    console.log("File content successfully read.")
    res.json({ content })
  } catch (error) {
    console.error("Error reading file:", error)
    res.status(500).json({ message: "Failed to read file", error: error.message })
  }
})

// Update file content
router.post(/^\/file\/([^/]+)\/(.*)/, async (req, res) => {
  const projectId = req.params[0]
  const filePath = req.params[1]
  const { content } = req.body
  const fullPath = path.join(TEMP_DIR, projectId, filePath)

  try {
    console.log("Updating file for project:", projectId)
    console.log("File path:", fullPath)
    console.log("Content length:", content.length)

    // Ensure the directory exists
    fs.ensureDirSync(path.dirname(fullPath))
    console.log("Directory ensured at path:", path.dirname(fullPath))
    // Write the content to the file
    fs.writeFileSync(fullPath, content)
    console.log("File content successfully written.")

    res.json({ message: "File updated successfully" })
  } catch (error) {
    console.error("Error updating file:", error)
    res.status(500).json({ message: "Failed to update file", error: error.message })
  }
})

// Rename file or folder
router.post("/rename/:projectId", async (req, res) => {
  const { projectId } = req.params
  const { oldPath, newName } = req.body

  try {
    console.log(`Renaming in project ${projectId}: ${oldPath} to ${newName}`)

    const projectPath = path.join(TEMP_DIR, projectId)
    const oldFullPath = path.join(projectPath, oldPath)

    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ message: "File or folder not found" })
    }

    // Get the directory of the file/folder
    const dirName = path.dirname(oldPath)
    // Create the new path with the new name
    const newPath = path.join(dirName, newName)
    const newFullPath = path.join(projectPath, newPath)

    // Check if the new path already exists
    if (fs.existsSync(newFullPath)) {
      return res.status(400).json({ message: "A file or folder with this name already exists" })
    }

    // Rename the file/folder
    await fs.move(oldFullPath, newFullPath)
    console.log(`Successfully renamed ${oldFullPath} to ${newFullPath}`)

    res.json({
      message: "Renamed successfully",
      oldPath,
      newPath,
    })
  } catch (error) {
    console.error("Error renaming file/folder:", error)
    res.status(500).json({
      message: "Failed to rename file/folder",
      error: error.message,
    })
  }
})

// Create new folder
router.post("/folder/:projectId", async (req, res) => {
  const { projectId } = req.params
  const { path: folderPath, name } = req.body

  try {
    console.log(`Creating folder in project ${projectId}: ${folderPath}/${name}`)

    const projectPath = path.join(TEMP_DIR, projectId)
    const newFolderPath = path.join(projectPath, folderPath, name)

    // Check if the folder already exists
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ message: "Folder already exists" })
    }

    // Create the folder
    await fs.ensureDir(newFolderPath)
    console.log(`Successfully created folder: ${newFolderPath}`)

    res.json({
      message: "Folder created successfully",
      path: path.join(folderPath, name),
    })
  } catch (error) {
    console.error("Error creating folder:", error)
    res.status(500).json({
      message: "Failed to create folder",
      error: error.message,
    })
  }
})

// Create new file
router.post("/create-file/:projectId", async (req, res) => {
  const { projectId } = req.params
  const { path: filePath, name } = req.body

  try {
    console.log(`Creating file in project ${projectId}: ${filePath}/${name}`)

    const projectPath = path.join(TEMP_DIR, projectId)
    const newFilePath = path.join(projectPath, filePath, name)

    // Check if the file already exists
    if (fs.existsSync(newFilePath)) {
      return res.status(400).json({ message: "File already exists" })
    }

    // Create the file with empty content
    await fs.ensureFile(newFilePath)
    await fs.writeFile(newFilePath, "")
    console.log(`Successfully created file: ${newFilePath}`)

    res.json({
      message: "File created successfully",
      path: path.join(filePath, name),
    })
  } catch (error) {
    console.error("Error creating file:", error)
    res.status(500).json({
      message: "Failed to create file",
      error: error.message,
    })
  }
})

// Delete file or folder
router.delete("/delete/:projectId", async (req, res) => {
  const { projectId } = req.params
  const { path: itemPath } = req.body

  try {
    console.log(`Deleting in project ${projectId}: ${itemPath}`)

    const projectPath = path.join(TEMP_DIR, projectId)
    const fullPath = path.join(projectPath, itemPath)

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File or folder not found" })
    }

    // Delete the file/folder
    await fs.remove(fullPath)
    console.log(`Successfully deleted: ${fullPath}`)

    res.json({
      message: "Deleted successfully",
      path: itemPath,
    })
  } catch (error) {
    console.error("Error deleting file/folder:", error)
    res.status(500).json({
      message: "Failed to delete file/folder",
      error: error.message,
    })
  }
})

// Get project port
router.get("/port/:projectId", async (req, res) => {
  const { projectId } = req.params

  try {
    console.log(`Getting port for project ${projectId}`)

    const projectPath = path.join(TEMP_DIR, projectId)
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ message: "Project not found" })
    }

    // Read project info
    const projectInfoPath = path.join(projectPath, "project-info.json")
    if (!fs.existsSync(projectInfoPath)) {
      return res.status(404).json({ message: "Project info not found" })
    }

    const projectInfo = await fs.readJson(projectInfoPath)

    if (!projectInfo.port) {
      // Try to assign a port if not already assigned
      try {
        const port = await portManager.assignPortToProject(projectId)
        projectInfo.port = port
        await fs.writeJson(projectInfoPath, projectInfo)
        console.log(`Assigned port ${port} to project ${projectId}`)

        // Update package.json with the assigned port
        const packageJsonPath = path.join(projectPath, "package.json")
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath)
          if (packageJson.scripts && packageJson.scripts.start) {
            packageJson.scripts.start = `PORT=${port} react-scripts start`
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
            console.log(`Updated package.json with port ${port}`)
          }
        }
      } catch (portError) {
        console.error("Error assigning port:", portError)
        return res.status(500).json({ message: "Failed to assign port", error: portError.message })
      }
    }

    res.json({ port: projectInfo.port })
  } catch (error) {
    console.error("Error getting project port:", error)
    res.status(500).json({ message: "Failed to get project port", error: error.message })
  }
})

module.exports = router
