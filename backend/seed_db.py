from app.db.session import SessionLocal
from app.models.user import User
from app.models.social import Post
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    # Check if users already exist
    if db.query(User).first():
        print("Cleaning up existing users slightly or just adding if missing...")
        db.query(Post).delete()
        db.query(User).delete() # We will just reset it for a clean seed
        db.commit()

    print("Seeding new users...")
    # Create users
    users_data = [
        {"username": "alice", "email": "alice@example.com", "password": "password123", "bio": "Hello, I am Alice!", "avatar_url": None},
        {"username": "bob", "email": "bob@example.com", "password": "password123", "bio": "Bob here.", "avatar_url": None},
        {"username": "charlie", "email": "charlie@example.com", "password": "password123", "bio": "Charlie's bio.", "avatar_url": None},
    ]

    users = []
    for u_data in users_data:
        u = User(
            username=u_data["username"],
            email=u_data["email"],
            bio=u_data["bio"],
            avatar_url=u_data["avatar_url"],
            hashed_password=get_password_hash(u_data["password"])
        )
        db.add(u)
        users.append(u)

    db.commit()
    for u in users:
        db.refresh(u)

    print("Adding follows...")
    # Make them follow each other
    users[0].followed.append(users[1])
    users[1].followed.append(users[0])
    users[2].followed.append(users[0])
    
    db.commit()

    print("Adding posts...")
    # Create some posts
    posts = [
        Post(content="Just setting up my ChatSocial profile! Super excited.", author_id=users[0].id),
        Post(content="Hello world! This is Bob.", author_id=users[1].id),
        Post(content="Beautiful day today.", author_id=users[2].id),
        Post(content="I am loving this platform ❤️", author_id=users[0].id),
    ]

    for p in posts:
        db.add(p)

    db.commit()
    print("✅ Successfully seeded the database with demo users and posts!")
    print("\nYou can now login with:")
    for u in users_data:
        print(f"Username: {u['username']} | Password: {u['password']}")
    db.close()

if __name__ == "__main__":
    seed_db()
