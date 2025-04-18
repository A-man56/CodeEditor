import { io } from "socket.io-client"

// In a real application, this would connect to your backend server
const socket = io("http://localhost:3001", {
  autoConnect: false,
})

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect()
  }
}

export const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("Socket not connected"))
      return
    }

    socket.emit("execute-command", { command }, (response) => {
      if (response.error) {
        reject(new Error(response.error))
      } else {
        resolve(response.output)
      }
    })
  })
}

export default socket
