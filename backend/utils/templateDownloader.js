const simpleGit = require("simple-git")
const fs = require("fs-extra")
const path = require("path")

const REPO_URL = "https://github.com/A-man56/code-templates.git"
const LOCAL_CLONE_DIR = path.join(__dirname, "..", "temp-repo")

const TEMPLATE_MAP = {
  React: "react-app",
  "Node.js": "node",
  Python: "python",
  "C++": "cpp",
}

async function downloadTemplate(techStack, targetDir) {
  const folder = TEMPLATE_MAP[techStack]
  if (!folder) throw new Error("Invalid tech stack")

  // Clone only once
  if (!fs.existsSync(LOCAL_CLONE_DIR)) {
    await simpleGit().clone(REPO_URL, LOCAL_CLONE_DIR)
  }

  const sourcePath = path.join(LOCAL_CLONE_DIR, folder)
  if (!fs.existsSync(sourcePath)) throw new Error("Template folder not found")

  await fs.copy(sourcePath, targetDir)
}

module.exports = { downloadTemplate }
