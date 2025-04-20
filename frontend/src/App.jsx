"use client"

import { useState } from "react"
import "./App.css"
import { Routes, Route } from "react-router-dom"
import Home from "./pages/home"
import Login from "./pages/login"
import Signup from "./pages/signup"
import Workspace from "./pages/workspace"
import Dashboard from "./pages/Dashboard"
import "react-toastify/ReactToastify.css"

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/workspace/:projectId" element={<Workspace />} />
      <Route path="/Dashboard" element={<Dashboard />} />
    </Routes>
    // </div>
  )
}

export default App
