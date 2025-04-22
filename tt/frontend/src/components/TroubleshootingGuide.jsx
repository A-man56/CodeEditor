const TroubleshootingGuide = () => {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Troubleshooting Guide</h2>
  
        <div className="mb-4">
          <h3 className="font-medium text-blue-700 mb-1">Backend Server Not Running</h3>
          <ol className="list-decimal ml-5 text-sm">
            <li className="mb-1">Open a terminal/command prompt</li>
            <li classNsame="mb-1">
              Navigate to the backend directory: <code className="bg-blue-100 px-1 rounded">cd path/to/backend</code>
            </li>
            <li className="mb-1">
              Install dependencies if needed: <code className="bg-blue-100 px-1 rounded">npm install</code>
            </li>
            <li className="mb-1">
              Start the server: <code className="bg-blue-100 px-1 rounded">npm run dev</code> or{" "}
              <code className="bg-blue-100 px-1 rounded">npm start</code>
            </li>
            <li>Verify the server is running on port 3500</li>
          </ol>
        </div>
  
        <div className="mb-4">
          <h3 className="font-medium text-blue-700 mb-1">Port Already in Use</h3>
          <ol className="list-decimal ml-5 text-sm">
            <li className="mb-1">Check if another process is using port 3500</li>
            <li className="mb-1">
              Windows: <code className="bg-blue-100 px-1 rounded">netstat -ano | findstr :3500</code>
            </li>
            <li className="mb-1">
              Mac/Linux: <code className="bg-blue-100 px-1 rounded">lsof -i :3500</code>
            </li>
            <li>Kill the process or change the port in the backend's .env file</li>
          </ol>
        </div>
  
        <div>
          <h3 className="font-medium text-blue-700 mb-1">Environment Variables</h3>
          <p className="text-sm mb-1">
            Make sure you have the following environment variables set in your backend's .env file:
          </p>
          <ul className="list-disc ml-5 text-sm">
            <li className="mb-1">
              <code className="bg-blue-100 px-1 rounded">PORT=3500</code>
            </li>
            <li className="mb-1">
              <code className="bg-blue-100 px-1 rounded">JWT_SECRET=your_secret_key</code>
            </li>
            <li>
              <code className="bg-blue-100 px-1 rounded">DB_URL=your_mongodb_connection_string</code>
            </li>
          </ul>
        </div>
      </div>
    )
  }
  
  export default TroubleshootingGuide
  