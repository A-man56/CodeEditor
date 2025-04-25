"use client"

const OutputDisplay = ({ output }) => {
  if (!output) {
    return <div className="h-full flex items-center justify-center text-gray-500">Run a command to see output here</div>
  }

  return (
    <div className="h-full overflow-auto bg-gray-900 text-white p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{output}</pre>
    </div>
  )
}

export default OutputDisplay
