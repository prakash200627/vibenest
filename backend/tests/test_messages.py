import pytest

def test_chat_message_flow(client):
    # 1. Register and login User 1
    res1 = client.post("/api/v1/auth/register", json={
        "username": "user1",
        "email": "user1@example.com",
        "password": "password123",
        "bio": "Hi, I am user 1",
        "avatar_url": "http://example.com/u1.png"
    })
    assert res1.status_code == 200
    user1_id = res1.json()["id"]

    login_res1 = client.post("/api/v1/auth/login", data={
        "username": "user1",
        "password": "password123"
    })
    assert login_res1.status_code == 200
    token1 = login_res1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 2. Register and login User 2
    res2 = client.post("/api/v1/auth/register", json={
        "username": "user2",
        "email": "user2@example.com",
        "password": "password123",
        "bio": "Hi, I am user 2",
        "avatar_url": "http://example.com/u2.png"
    })
    assert res2.status_code == 200
    user2_id = res2.json()["id"]

    login_res2 = client.post("/api/v1/auth/login", data={
        "username": "user2",
        "password": "password123"
    })
    assert login_res2.status_code == 200
    token2 = login_res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. Get messages without auth -> 401
    no_auth_res = client.get("/api/v1/chat/history/user2")
    assert no_auth_res.status_code == 401

    # 4. Send a message from User 1 to User 2 -> 200
    send_res = client.post("/api/v1/chat/send", json={
        "content": "Hello user2, how are you?",
        "receiver_id": user2_id
    }, headers=headers1)
    assert send_res.status_code == 200
    send_data = send_res.json()
    assert send_data["content"] == "Hello user2, how are you?"
    assert send_data["sender_id"] == user1_id
    assert send_data["receiver_id"] == user2_id

    # 5. Get message history as User 1 with User 2 -> 200
    history_res1 = client.get("/api/v1/chat/history/user2", headers=headers1)
    assert history_res1.status_code == 200
    history_data1 = history_res1.json()
    assert len(history_data1) == 1
    assert history_data1[0]["content"] == "Hello user2, how are you?"
    assert history_data1[0]["sender_id"] == user1_id

    # 6. Get message history as User 2 with User 1 -> 200
    history_res2 = client.get("/api/v1/chat/history/user1", headers=headers2)
    assert history_res2.status_code == 200
    history_data2 = history_res2.json()
    assert len(history_data2) == 1
    assert history_data2[0]["content"] == "Hello user2, how are you?"
    assert history_data2[0]["sender_id"] == user1_id

    # 7. Get messages with invalid token -> 401
    invalid_auth_res = client.get("/api/v1/chat/history/user2", headers={"Authorization": "Bearer invalidtoken"})
    assert invalid_auth_res.status_code == 401

    # 8. Send message with invalid token -> 401
    send_invalid_token_res = client.post("/api/v1/chat/send", json={
        "content": "Hello",
        "receiver_id": user2_id
    }, headers={"Authorization": "Bearer invalidtoken"})
    assert send_invalid_token_res.status_code == 401

    # 9. Send message without auth token -> 401
    send_no_token_res = client.post("/api/v1/chat/send", json={
        "content": "Hello",
        "receiver_id": user2_id
    })
    assert send_no_token_res.status_code == 401

