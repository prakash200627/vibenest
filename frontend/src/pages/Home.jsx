import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Image, X, Send } from 'lucide-react';
import { API_URL, WS_URL } from '../constants/api';

export default function Home() {
  const { user, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [comments, setComments] = useState({}); // {postId: [comments]}
  const [newComment, setNewComment] = useState('');
  const fileInputRef = React.useRef(null);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/posts/`);
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (e.g. 2MB max for Base64 efficiency)
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setMediaUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreview(null);
    setMediaUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  // ... (WebSocket useEffect remains same but I'll skip it in this chunk for brevity or include it)
  // Listen for realtime posts
  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_post') {
        setPosts((prev) => [data.post, ...prev]);
      } else if (data.type === 'like_update') {
        setPosts((prev) => prev.map(p => p.id === data.post_id ? { ...p, likes_count: data.likes_count } : p));
      } else if (data.type === 'new_comment') {
        setComments((prev) => ({
          ...prev,
          [data.post_id]: [...(prev[data.post_id] || []), data.comment]
        }));
        setPosts((prev) => prev.map(p => p.id === data.post_id ? { ...p, comments_count: p.comments_count + 1 } : p));
      } else if (data.type === 'delete_post') {
        setPosts((prev) => prev.filter(p => p.id !== data.post_id));
      }
    };

    return () => {
      socket.close();
    };
  }, [token]);

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      await axios.post(`${API_URL}/posts/`, { content, media_url: mediaUrl });
      setContent('');
      removeImage();
      fetchPosts(); // Reload feed
    } catch (err) {
      console.error(err);
    }
  };

  // Skip handlers for brevity if they haven't changed much

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${API_URL}/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (postId) => {
    if (!editContent.trim()) return;
    try {
      await axios.put(`${API_URL}/posts/${postId}`, { content: editContent });
      setEditingPostId(null);
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (postId) => {
    try {
      await axios.post(`${API_URL}/posts/${postId}/like`);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const newIsLiked = !p.is_liked;
          return {
            ...p,
            is_liked: newIsLiked,
            likes_count: newIsLiked ? p.likes_count + 1 : p.likes_count - 1
          };
        }
        return p;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = async (postId) => {
    if (openCommentsId === postId) {
      setOpenCommentsId(null);
    } else {
      setOpenCommentsId(postId);
      try {
        const res = await axios.get(`${API_URL}/posts/${postId}/comments`);
        setComments({ ...comments, [postId]: res.data });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddComment = async (postId) => {
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/posts/${postId}/comments`, { content: newComment });
      setComments({
        ...comments,
        [postId]: [...(comments[postId] || []), res.data]
      });
      setNewComment('');
      setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Loading VibeNest...</div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome back, {user.username}! ✨</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Share what's on your mind...</p>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
             <div className="w-12 h-12 rounded-full bg-linear-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm text-lg">
                {user.username.charAt(0).toUpperCase()}
             </div>
             <textarea 
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-4 dark:text-white focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none min-h-[100px]"
                placeholder="Vibe check? Spread some positivity..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
             />
          </div>

          {preview && (
            <div className="relative group rounded-xl overflow-hidden self-start ml-16">
              <img src={preview} alt="preview" className="max-h-64 rounded-xl border border-gray-100 shadow-sm" />
              <button 
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700 pt-4 ml-16">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageSelect}
              />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <Image size={20} />
                <span>Add Image</span>
              </button>
            </div>
            
            <button 
              onClick={handlePost}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              disabled={!content.trim()}
            >
              <Send size={16} />
              Post
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <Link to={`/profile/${post.author.username}`} className="flex items-center gap-3 hover:opacity-80 transition">
                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white leading-tight">{post.author.username}</p>
                  <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </Link>
              
              {user.id === post.author_id && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingPostId(post.id);
                      setEditContent(post.content);
                    }}
                    className="text-xs text-gray-400 hover:text-blue-500 transition border px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition border px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {editingPostId === post.id ? (
              <div className="space-y-3">
                <textarea 
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-200 dark:text-white outline-none"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(post.id)} className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">Save</button>
                  <button onClick={() => setEditingPostId(null)} className="text-gray-500 dark:text-gray-400 px-4 py-1 text-sm font-medium">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-700 dark:text-gray-300">{post.content}</p>
                {post.media_url && (
                  <img src={post.media_url} alt="post" className="w-full rounded-xl max-h-96 object-cover border border-gray-100 dark:border-gray-700" />
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex gap-6 text-sm">
              <button 
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1 transition ${post.is_liked ? 'text-pink-500 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-pink-500'}`}
              >
                {post.is_liked ? '❤️' : '🤍'} {post.likes_count} Likes
              </button>
              <button 
                onClick={() => toggleComments(post.id)}
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                💬 {post.comments_count} Comments
              </button>
            </div>

            {openCommentsId === post.id && (
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                  {(comments[post.id] || []).map((comment) => (
                    <div key={comment.id} className="flex gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-bold">
                        {comment.author.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-gray-800 dark:text-white">{comment.author.username}</span>
                          <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Write a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                    className="flex-1 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-2 border-transparent dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                  />
                  <button 
                    onClick={() => handleAddComment(post.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    disabled={!newComment.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
