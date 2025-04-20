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
  console.log("Received project creation request:", { techStack, name })  // Log incoming request

  try {
    // Validate name and techStack
    if (!name) {
      console.log("No name provided")  // Log if validation fails
      return res.status(400).json({ message: "Project name is required" })
    }

    if (!FOLDER_MAP[techStack]) {
      console.log("Invalid tech stack:", techStack)  // Log invalid tech stack
      return res.status(400).json({ message: "Invalid tech stack" })
    }

    console.log("Input validated successfully")  // Log after successful validation

    // Generate a unique project ID
    const projectId = uuidv4()
    console.log("Generated project ID:", projectId)  // Log generated project ID

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
    console.log("Fetching files for project:", projectId)  // Log the project ID

    const projectPath = path.join(TEMP_DIR, projectId, filePath)
    console.log("Full project path:", projectPath)  // Log the full project path being checked

    if (!fs.existsSync(projectPath)) {
      console.log("Project not found at path:", projectPath)  // Log if the project is not found
      return res.status(404).json({ message: "Project not found" })
    }

    // Read project info
    let projectInfo = {}
    try {
      console.log("Attempting to read project-info.json...")  // Log before reading the project info
      projectInfo = await fs.readJson(path.join(projectPath, "project-info.json"))
      console.log("Project info successfully read:", projectInfo)  // Log the project info once successfully read
    } catch (err) {
      console.error("Error reading project info:", err)  // Log if there's an error reading project-info.json
      // Continue even if project info is missing
    }

    // Function to recursively get files
    const getFilesRecursively = (dir, baseDir = "") => {
      console.log("Reading directory:", dir)  // Log the directory being read
      const files = fs.readdirSync(dir)
      const result = []

      files.forEach((file, index) => {
        const fullPath = path.join(dir, file)
        const relativePath = path.join(baseDir, file)
        const stats = fs.statSync(fullPath)

        // Skip project-info.json and node_modules
        if (file === "project-info.json" || file === "node_modules") {
          console.log("Skipping file:", file)  // Log when skipping files (project-info.json or node_modules)
          return
        }

        console.log("🔍 Checking file/folder:", fullPath)  // Log each file/folder being checked

        if (stats.isDirectory()) {
          console.log("📁 Directory found:", fullPath)  // Log when a directory is found

          const children = getFilesRecursively(fullPath, relativePath)
          result.push({
            id: `dir-${index}-${relativePath}`,
            name: file,
            type: "folder",
            path: relativePath,
            children,
          })
        } else {
          console.log("📄 File found:", fullPath)  // Log when a file is found
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
    console.log("Generated file tree:", fileTree)  // Log the generated file tree structure

    res.json({
      projectInfo,
      files: fileTree,
    })
  } catch (error) {
    console.error("Error getting project files:", error)  // Log any error in fetching project files
    res.status(500).json({ message: "Failed to get project files", error: error.message })
  }
})

// Get file content
router.get(/^\/file\/([^\/]+)\/(.*)/, async (req, res) => {
  const projectId = req.params[0]
  const filePath = req.params[1]
  const fullPath = path.join(TEMP_DIR, projectId, filePath)

  try {
    console.log("Fetching file for project:", projectId)  // Log project ID
    console.log("Full file path:", fullPath)  // Log the full path of the file being accessed

    if (!fs.existsSync(fullPath)) {
      console.log("File not found at path:", fullPath)  // Log if file is not found
      return res.status(404).json({ message: "File not found" })
    }

    const stats = fs.statSync(fullPath)
    console.log("File stats:", stats)  // Log the file stats

    if (stats.isDirectory()) {
      console.log("The path is a directory, not a file:", fullPath)  // Log if the path is a directory
      return res.status(400).json({ message: "Path is a directory, not a file" })
    }

    const content = fs.readFileSync(fullPath, "utf8")
    console.log("File content successfully read.")  // Log after reading the file content

    res.json({ content })
  } catch (error) {
    console.error("Error reading file:", error)  // Log any error that occurs
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
    console.log("Updating file for project:", projectId)  // Log project ID
    console.log("File path:", fullPath)  // Log the full path of the file being updated
    console.log("Content length:", content.length)  // Log the length of content being written

    // Ensure the directory exists
    fs.ensureDirSync(path.dirname(fullPath))
    console.log("Directory ensured at path:", path.dirname(fullPath))  // Log directory creation

    // Write the content to the file
    fs.writeFileSync(fullPath, content)
    console.log("File content successfully written.")  // Log after successfully writing to the file

    res.json({ message: "File updated successfully" })
  } catch (error) {
    console.error("Error updating file:", error)  // Log any error during file update
    res.status(500).json({ message: "Failed to update file", error: error.message })
  }
})

module.exports = router
