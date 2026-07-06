def test_register_and_login_flow(client):
    res = client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "bio": "Hello there",
        "avatar_url": "http://example.com/avatar.png"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    
    res = client.post("/api/v1/auth/login", data={
        "username": "testuser",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
