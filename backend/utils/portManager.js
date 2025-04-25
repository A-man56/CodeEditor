const net = require("net")
const fs = require("fs-extra")
const path = require("path")

// Port range for React applications
const PORT_RANGE_START = 3000
const PORT_RANGE_END = 3999

// Path to the port tracking file
const PORT_TRACKING_FILE = path.join(__dirname, "..", "port-assignments.json")

// Initialize port tracking file if it doesn't exist
if (!fs.existsSync(PORT_TRACKING_FILE)) {
  fs.writeJsonSync(PORT_TRACKING_FILE, {
    assignedPorts: {},
    lastAssignedPort: PORT_RANGE_START - 1,
  })
}

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if port is available, false otherwise
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false)
      } else {
        // Other errors are considered as port available
        resolve(true)
      }
    })

    server.once("listening", () => {
      // Close the server and resolve with true (port is available)
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port)
  })
}

/**
 * Find an available port
 * @returns {Promise<number>} - Available port
 */
async function findAvailablePort() {
  // Load current port assignments
  const portData = fs.readJsonSync(PORT_TRACKING_FILE)
  let port = portData.lastAssignedPort + 1

  // If we've reached the end of our range, start over
  if (port > PORT_RANGE_END) {
    port = PORT_RANGE_START
  }

  // Check ports until we find an available one
  while (port <= PORT_RANGE_END) {
    const available = await isPortAvailable(port)
    if (available) {
      // Update the last assigned port
      portData.lastAssignedPort = port
      fs.writeJsonSync(PORT_TRACKING_FILE, portData)
      return port
    }
    port++
  }

  // If we've checked all ports and none are available, start over from the beginning
  port = PORT_RANGE_START
  while (port <= portData.lastAssignedPort) {
    const available = await isPortAvailable(port)
    if (available) {
      // Update the last assigned port
      portData.lastAssignedPort = port
      fs.writeJsonSync(PORT_TRACKING_FILE, portData)
      return port
    }
    port++
  }

  // If we still can't find an available port, throw an error
  throw new Error("No available ports found in the specified range")
}

/**
 * Assign a port to a project
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} - Assigned port
 */
async function assignPortToProject(projectId) {
  // Load current port assignments
  const portData = fs.readJsonSync(PORT_TRACKING_FILE)

  // Check if project already has a port assigned
  if (portData.assignedPorts[projectId]) {
    // Verify the port is still available
    const port = portData.assignedPorts[projectId]
    const available = await isPortAvailable(port)

    if (available) {
      return port
    }
    // If not available, we'll assign a new port
  }

  // Find an available port
  const port = await findAvailablePort()

  // Assign the port to the project
  portData.assignedPorts[projectId] = port
  fs.writeJsonSync(PORT_TRACKING_FILE, portData)

  return port
}

/**
 * Get the port assigned to a project
 * @param {string} projectId - Project ID
 * @returns {Promise<number|null>} - Assigned port or null if not assigned
 */
async function getProjectPort(projectId) {
  // Load current port assignments
  const portData = fs.readJsonSync(PORT_TRACKING_FILE)

  // Return the assigned port or null if not assigned
  return portData.assignedPorts[projectId] || null
}

/**
 * Release a port assigned to a project
 * @param {string} projectId - Project ID
 */
function releaseProjectPort(projectId) {
  // Load current port assignments
  const portData = fs.readJsonSync(PORT_TRACKING_FILE)

  // Remove the project from the assignments
  if (portData.assignedPorts[projectId]) {
    delete portData.assignedPorts[projectId]
    fs.writeJsonSync(PORT_TRACKING_FILE, portData)
  }
}

module.exports = {
  assignPortToProject,
  getProjectPort,
  releaseProjectPort,
  isPortAvailable,
}
