const express = require("express")
const router = express.Router()
const fs = require("fs-extra")
const path = require("path")
const simpleGit = require("simple-git")
const { exec } = require("child_process")
const { v4: uuidv4 } = require("uuid")

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

  try {
    console.log("Received project creation request:", { techStack, name })

    // Validate name and techStack
    if (!name) {
      return res.status(400).json({ message: "Project name is required" })
    }

    if (!FOLDER_MAP[techStack]) {
      return res.status(400).json({ message: "Invalid tech stack" })
    }

    // Generate a unique project ID
    const projectId = uuidv4()

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
      await fs.remove(clonePath) // Clean up
      return res.status(500).json({ message: "Template folder not found in repo" })
    }

    // Copy only the subfolder to the user's project folder
    console.log("Copying template to project folder...")
    await fs.copy(sourceSubfolder, projectFolder)
    console.log("Template copied successfully")

    // Create a project info file to store metadata
    const projectInfo = {
      id: projectId,
      name: name,
      techStack: techStack,
      createdAt: new Date().toISOString(),
    }

    await fs.writeJson(path.join(projectFolder, "project-info.json"), projectInfo)
    console.log("Project info saved")

    // Clean up clone folder
    console.log("Cleaning up clone folder...")
    await fs.remove(clonePath)
    console.log("Clone folder removed")

    // Return success immediately without waiting for npm install
    console.log("Sending success response")
    res.json({
      message: "Project created successfully!",
      projectId: projectId,
      name: name,
      techStack: techStack,
    })

    // Optionally run npm install in the background
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
    const filePath = req.params[0] 
    const projectPath = path.join(TEMP_DIR, projectId,filePath)

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ message: "Project not found" })
    }

    // Read project info
    let projectInfo = {}
    try {
      
      projectInfo = await fs.readJson(path.join(projectPath, "project-info.json"))
    } catch (err) {
      console.error("Error reading project info:", err)
      // Continue even if project info is missing
    }

    // Function to recursively get files
    const getFilesRecursively = (dir, baseDir = "") => {
      const files = fs.readdirSync(dir)
      const result = []

      files.forEach((file, index) => {
        const fullPath = path.join(dir, file)
        const relativePath = path.join(baseDir, file)
        const stats = fs.statSync(fullPath)

        // Skip project-info.json and node_modules
        if (file === "project-info.json" || file === "node_modules") {
          return
        }
        console.log("🔍 Checking project path:", projectPath)//

        if (stats.isDirectory()) {
          console.log("❌ Project folder doesn't exist")

          const children = getFilesRecursively(fullPath, relativePath)
          result.push({
            id: `dir-${index}-${relativePath}`,
            name: file,
            type: "folder",
            path: relativePath,
            children,
          })
        } else {
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

    res.json({
      projectInfo,
      files: fileTree,
    })
  } catch (error) {
    console.error("Error getting project files:", error)
    res.status(500).json({ message: "Failed to get project files", error: error.message })
  }
})

// Get file content
router.get(/^\/file\/([^\/]+)\/(.*)/, async (req, res) => {
  const projectId = req.params[0]
  const filePath = req.params[1]
  const fullPath = path.join(TEMP_DIR, projectId, filePath)
  try {
    const { projectId } = req.params
    const filePath = req.params[0]
    const fullPath = path.join(TEMP_DIR, projectId, filePath)

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" })
    }

    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      return res.status(400).json({ message: "Path is a directory, not a file" })
    }

    const content = fs.readFileSync(fullPath, "utf8")
    res.json({ content })
  } catch (error) {
    console.error("Error reading file:", error)
    res.status(500).json({ message: "Failed to read file", error: error.message })
  }
})

// Update file content
router.post(/^\/file\/([^\/]+)\/(.*)/, async (req, res) => {
  const projectId = req.params[0]
  const filePath = req.params[1]
  const { content } = req.body
  const fullPath = path.join(TEMP_DIR, projectId, filePath)
  try {
    const { projectId } = req.params
    const filePath = req.params[0]
    const { content } = req.body
    const fullPath = path.join(TEMP_DIR, projectId, filePath)

    // Ensure the directory exists
    fs.ensureDirSync(path.dirname(fullPath))

    // Write the content to the file
    fs.writeFileSync(fullPath, content)

    res.json({ message: "File updated successfully" })
  } catch (error) {
    console.error("Error updating file:", error)
    res.status(500).json({ message: "Failed to update file", error: error.message })
  }
})

module.exports = router
