import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { MessageCircle, Home, User, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  if (!user) return null;

  return (
    <nav className="bg-white dark:bg-gray-800 shadow transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <MessageCircle /> VibeNest
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><Home size={18}/> Home</Link>
            <Link to="/chat" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><MessageCircle size={18}/> Chat</Link>
            <Link to={`/profile/${user.username}`} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><User size={18}/> Profile</Link>
            <button
              onClick={logout}
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
            >
              <LogOut size={18}/> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
