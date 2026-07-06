# VibeNest - Route & Logic Documentation

This document provides a clear overview of how the application is structured after the project reorganization.

## 📁 Project Structure
```text
/backend/           <-- All Python/FastAPI backend logic
  /app/             <-- Core source code
    /api/           <-- API Routers (chat, post, user, auth)
    /models/        <-- Database SQLAlchemy models
    /schemas/       <-- Pydantic request/response models
    /services/      <-- WebSocket/Business logic
  /.env             <-- Backend secrets and database URLs
/frontend/          <-- React/Vite/Tailwind frontend
  /src/
    /pages/         <-- Route components (Home, Chat, Profile, etc.)
    /context/       <-- State management (Auth, Theme)
/PROJECT_GUIDE.md   <--- This file
```

---

## 🚀 Backend API Routes (`/backend/app/api/routes`)

### 1. Authentication (`auth.py`)
| Route | Method | Description |
| :--- | :--- | :--- |
| `/login` | `POST` | Authenticates user and returns a JWT token. |
| `/register` | `POST` | Creates a new user account with hashed password. |

### 2. Posts & Social (`post.py`)
| Route | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Fetches all posts for the global feed. |
| `/` | `POST` | **[Real-time]** Creates a post and broadcasts it to all users. |
| `/{post_id}` | `PUT` | Updates an existing post (only for the author). |
| `/{post_id}` | `DELETE` | **[Real-time]** Deletes a post and removes it from everyone's screen. |
| `/{post_id}/like` | `POST` | **[Real-time]** Toggles like. Broadcasts new count to everyone. |
| `/{post_id}/comments`| `GET` | Fetches all comments for a specific post. |
| `/{post_id}/comments`| `POST` | **[Real-time]** Adds a comment and broadcasts it instantly. |

### 3. Messaging & Conversations (`chat.py`)
| Route | Method | Description |
| :--- | :--- | :--- |
| `/ws` | `WS` | **WebSocket** connection for real-time Direct Messages. |
| `/conversations` | `GET` | Lists all recent chats with their latest message previews. |
| `/history/{user}` | `GET` | Loads the private chat history between two users. |

### 4. Profiles & Social Graph (`user.py`)
| Route | Method | Description |
| :--- | :--- | :--- |
| `/me` | `GET` | Retrieves the profile of the currently logged-in user. |
| `/{username}` | `GET` | Fetches profile stats for any user (Followers, Bio, etc.). |
| `/{username}/posts` | `GET` | Fetches only the posts created by a specific user. |
| `/{id}/toggle-follow`| `POST` | **[Real-time]** Follow/Unfollow. Updates counts for both users instantly. |

---

## 🧩 Frontend Routes (`/frontend/src/pages`)

| Page | Component | URL Path | Description |
| :--- | :--- | :--- | :--- |
| **Login** | `Login.jsx` | `/login` | Secure sign-in gateway. Supports dark mode. |
| **Register** | `Register.jsx`| `/register`| Account creation page. |
| **Home Feed**| `Home.jsx` | `/` | The main social wall. Updates automatically via WebSocket. |
| **Chat Hub** | `Chat.jsx` | `/chat` | Sidebar for contacts + active private message window. |
| **Profile** | `Profile.jsx` | `/profile/:username` | Personal space. Shows specific user posts and Follow button. |

---

## 🛠️ Updated Execution Command
To run your backend from the root directory now:
```powershell
# From the root folder (chat-app)
cd backend
uv run uvicorn app.main:app --reload
```
