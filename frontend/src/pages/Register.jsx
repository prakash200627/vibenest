import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-4">
            <MessageCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 text-sm mt-1">Join the VibeNest community</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="text-black w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="text-black w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="text-black w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio (Optional)</label>
            <input
              name="bio"
              type="text"
              value={formData.bio}
              onChange={handleChange}
              className="text-black w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-pink-600 text-white font-semibold py-2.5 rounded-xl hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg mt-2"
          >
            Create Account
          </button>
        </form>
        <p className="text-center mt-6 text-gray-500 text-sm">
          Already have an account? <Link to="/login" className="text-pink-600 hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
