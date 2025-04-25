import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function Signup() {
  const navigate = useNavigate()

  const [signupInfo, setSignupInfo] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setSignupInfo({ ...signupInfo, [name]: value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    const { name, email, password } = signupInfo
    if (!name || !email || !password) {
      toast.error('Please fill in all fields!')
      return
    }

    try {
      const url = 'http://localhost:3500/auth/signup'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signupInfo)
      })

      const data = await response.json()
      console.log(data)

      if (response.ok) {
        toast.success('Account created successfully!')

        setTimeout(() => {
          navigate('/login') // Redirect after 1.5 seconds
        }, 1000)
      } else {
        toast.error(data.message || 'Signup failed. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again later.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-center text-gray-700 mb-6">
          Create an Account
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-600">
              Name
            </label>
            <input
              onChange={handleChange}
              type="text"
              name="name"
              autoFocus
              placeholder="Enter your name"
              className="w-full p-3 border-b-2 border-gray-300 focus:outline-none focus:border-gray-500 italic text-sm"
              value={signupInfo.name}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              onChange={handleChange}
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full p-3 border-b-2 border-gray-300 focus:outline-none focus:border-gray-500 italic text-sm"
              value={signupInfo.email}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              onChange={handleChange}
              type="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-3 border-b-2 border-gray-300 focus:outline-none focus:border-gray-500 italic text-sm"
              value={signupInfo.password}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Signup
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </form>

        <ToastContainer />
      </div>
    </div>
  )
}

export default Signup
