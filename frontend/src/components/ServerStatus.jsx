"use client"

import { useState, useEffect } from "react"

const ServerStatus = () => {
  const [status, setStatus] = useState("checking")
  const [lastChecked, setLastChecked] = useState(null)

  const checkServerStatus = async () => {
    try {
      setStatus("checking")
      const response = await fetch("http://localhost:3500/root", {
        method: "GET",
        timeout: 5000,
      })

      if (response.ok) {
        setStatus("online")
      } else {
        setStatus("error")
      }
    } catch (error) {
      console.error("Server check failed:", error)
      setStatus("offline")
    } finally {
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkServerStatus()

    // Check server status every 30 seconds
    const interval = setInterval(checkServerStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-red-500"
      case "error":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "online":
        return "Server Online"
      case "offline":
        return "Server Offline"
      case "error":
        return "Server Error"
      default:
        return "Checking..."
    }
  }

  const formatTime = (date) => {
    if (!date) return ""
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`h-3 w-3 rounded-full ${getStatusColor()}`}></div>
      <span className="text-sm">{getStatusText()}</span>
      {lastChecked && <span className="text-xs text-gray-500">Last checked: {formatTime(lastChecked)}</span>}
      <button
        onClick={checkServerStatus}
        className="text-xs text-blue-500 hover:text-blue-700"
        title="Check server status"
      >
        ↻
      </button>
    </div>
  )
}

export default ServerStatus
