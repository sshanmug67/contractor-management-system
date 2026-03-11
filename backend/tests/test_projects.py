"""
Tests — Projects API

Tests for the project CRUD endpoints.
Uses httpx AsyncClient for async FastAPI testing.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    """Async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint returns 200."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_list_projects_unauthorized(client: AsyncClient):
    """Projects endpoint requires auth."""
    response = await client.get("/api/projects/")
    assert response.status_code == 401


# TODO: Add authenticated tests using test JWT tokens
# TODO: test_create_project
# TODO: test_get_project
# TODO: test_update_project
# TODO: test_delete_project
# TODO: test_project_progress_cascade
