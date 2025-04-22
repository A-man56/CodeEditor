import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function Login() {
  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginInfo({ ...loginInfo, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const { email, password } = loginInfo;
    if (!email || !password) {
      toast.error('Please fill in all fields!');
      return;
    }

    try {
      const response = await fetch('http://localhost:3500/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginInfo),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Login successful!');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        toast.error(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-center text-gray-700 mb-6">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
            <input
              onChange={handleChange}
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full p-3 border-b-2 border-gray-300 focus:outline-none focus:border-gray-500 italic text-sm"
              value={loginInfo.email}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">Password</label>
            <input
              onChange={handleChange}
              type="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-3 border-b-2 border-gray-300 focus:outline-none focus:border-gray-500 italic text-sm"
              value={loginInfo.password}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Login
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700">
              Signup
            </Link>
          </p>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
}

export default Login;
