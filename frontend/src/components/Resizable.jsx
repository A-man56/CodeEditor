"use client"

import { useState, useEffect, useRef } from "react"

const Resizable = ({
  direction = "horizontal",
  children,
  defaultSize = 250,
  minSize = 100,
  maxSize = 800,
  className = "",
}) => {
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const resizableRef = useRef(null)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(size)

  const isHorizontal = direction === "horizontal"

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      e.preventDefault()

      const currentPos = isHorizontal ? e.clientX : e.clientY
      const delta = currentPos - startPosRef.current

      let newSize = startSizeRef.current + delta

      // Apply constraints
      newSize = Math.max(minSize, Math.min(maxSize, newSize))

      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      // Change cursor and disable text selection while resizing
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, isHorizontal, minSize, maxSize])

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
    startPosRef.current = isHorizontal ? e.clientX : e.clientY
    startSizeRef.current = size
  }

  const resizeHandleStyles = {
    position: "absolute",
    background: "transparent",
    opacity: 0,
    zIndex: 10,
    ...(isHorizontal
      ? {
          top: 0,
          right: -5,
          width: 10,
          height: "100%",
          cursor: "col-resize",
        }
      : {
          bottom: -5,
          left: 0,
          height: 10,
          width: "100%",
          cursor: "row-resize",
        }),
  }

  const visibleHandleStyles = {
    position: "absolute",
    background: "#e2e8f0",
    transition: "opacity 0.2s",
    opacity: isResizing ? 0.8 : 0,
    ...(isHorizontal
      ? {
          top: 0,
          right: -2,
          width: 4,
          height: "100%",
        }
      : {
          bottom: -2,
          left: 0,
          height: 4,
          width: "100%",
        }),
  }

  return (
    <div
      ref={resizableRef}
      className={`relative ${className}`}
      style={{
        ...(isHorizontal ? { width: `${size}px` } : { height: `${size}px` }),
      }}
    >
      {children}

      {/* Invisible handle for better grab area */}
      <div style={resizeHandleStyles} onMouseDown={handleMouseDown} onTouchStart={handleMouseDown} />

      {/* Visible handle indicator */}
      <div style={visibleHandleStyles} className="hover:opacity-80" />
    </div>
  )
}

export default Resizable
