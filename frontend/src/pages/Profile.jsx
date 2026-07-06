import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL, WS_URL } from '../constants/api';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, token } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/${username}`);
      setProfile(res.data);
    } catch (err) {
      setError('User not found');
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/${username}/posts`);
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (username) {
      Promise.all([fetchProfile(), fetchUserPosts()]).finally(() => setLoading(false));
    }
  }, [username]);

  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'follow_update') {
        if (profile && data.user_id === profile.id) {
          setProfile(prev => ({ ...prev, followers_count: data.followers_count }));
        }
        if (currentUser && data.user_id === currentUser.id) {
          // If we're looking at someone else, we don't necessarily update 'following' count here
          // as it's locally in context, but for visual consistency:
          if (isMe) setProfile(prev => ({ ...prev, following_count: data.following_count }));
        }
      } else if (data.type === 'new_post') {
        if (profile && data.post.author.username === profile.username) {
          setPosts(prev => [data.post, ...prev]);
        }
      } else if (data.type === 'delete_post') {
        setPosts(prev => prev.filter(p => p.id !== data.post_id));
      }
    };

    return () => {
      socket.close();
    };
  }, [token, profile, currentUser]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const res = await axios.post(`${API_URL}/users/${profile.id}/toggle-follow`);
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return null;

  const isMe = currentUser?.username === profile.username;

  return (
    <div className="max-w-3xl mx-auto w-full py-8 px-4">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
        <div className="h-40 bg-linear-to-r from-blue-500 to-indigo-600"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-14 mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-md flex items-center justify-center bg-linear-to-br from-indigo-100 to-pink-100 dark:from-indigo-900 dark:to-pink-900 text-4xl font-bold text-indigo-500 dark:text-indigo-300">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            {!isMe && (
              <button 
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full font-bold text-sm transition shadow-sm ${
                  profile.is_following 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 border border-gray-200 dark:border-gray-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {profile.is_following ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {isMe && (
              <button className="px-6 py-2 rounded-full border border-gray-200 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
                Edit Profile
              </button>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{profile.username}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">@{profile.username}</p>
          
          {profile.bio ? (
            <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="mt-4 text-gray-400 dark:text-gray-500 italic">No bio yet.</p>
          )}
          
          <div className="flex gap-8 mt-6 pt-6 border-t border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
               <span className="font-extrabold text-gray-900 dark:text-white text-lg">{profile.following_count}</span>
               <span className="text-sm text-gray-500 dark:text-gray-400">Following</span>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="font-extrabold text-gray-900 dark:text-white text-lg">{profile.followers_count}</span>
               <span className="text-sm text-gray-500 dark:text-gray-400">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Posts */}
      <div className="mt-10">
        <h2 className="mb-6 font-extrabold text-gray-900 dark:text-white text-xl flex items-center gap-2">
          Posts <span className="text-sm font-normal text-gray-400">({posts.length})</span>
        </h2>
        
        {posts.length > 0 ? (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition duration-200 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                    {post.author.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{post.author.username}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{post.content}</p>
                {post.media_url && (
                  <img src={post.media_url} alt="post" className="w-full rounded-xl max-h-96 object-cover border border-gray-100 dark:border-gray-700" />
                )}
                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">❤️ {post.likes_count} Likes</span>
                  <span className="flex items-center gap-1">💬 {post.comments_count} Comments</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <div className="text-4xl">📄</div>
            <p>This user hasn't posted anything yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
