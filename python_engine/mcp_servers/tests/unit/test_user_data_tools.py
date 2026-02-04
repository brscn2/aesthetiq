"""Unit tests for User Data tools."""
import pytest

from mcp_servers.user_data_server import tools
from mcp_servers.user_data_server.schemas import SubscriptionStatus, UserRole


@pytest.mark.asyncio
async def test_get_user_profile_returns_user_data(monkeypatch):
    """Test that get_user_profile returns properly parsed user data."""
    async def fake_get_user_by_clerk_id(clerk_id: str):
        return {
            "clerkId": clerk_id,
            "email": "test@example.com",
            "name": "Test User",
            "avatarUrl": "https://example.com/avatar.jpg",
            "subscriptionStatus": "PRO",
            "role": "USER",
            "settings": {
                "units": "IMPERIAL",
                "currency": "USD",
                "shoppingRegion": "USA",
                "allowBiometrics": True,
                "allowFacialAnalysis": True,
                "storeColorHistory": True,
                "contributeToTrendLearning": False,
                "theme": "DARK",
            },
        }

    monkeypatch.setattr(tools.db, "get_user_by_clerk_id", fake_get_user_by_clerk_id)

    profile = await tools.get_user_profile("user_123")
    
    assert profile is not None
    assert profile.user_id == "user_123"
    assert profile.email == "test@example.com"
    assert profile.name == "Test User"
    assert profile.avatar_url == "https://example.com/avatar.jpg"
    assert profile.subscription_status == SubscriptionStatus.PRO
    assert profile.role == UserRole.USER
    assert profile.settings.units.value == "IMPERIAL"
    assert profile.settings.currency.value == "USD"
    assert profile.settings.theme.value == "DARK"
    assert profile.settings.allowBiometrics is True


@pytest.mark.asyncio
async def test_get_user_profile_returns_none_for_nonexistent_user(monkeypatch):
    """Test that get_user_profile returns None when user doesn't exist."""
    async def fake_get_user_by_clerk_id(clerk_id: str):
        return None

    monkeypatch.setattr(tools.db, "get_user_by_clerk_id", fake_get_user_by_clerk_id)

    profile = await tools.get_user_profile("nonexistent")
    assert profile is None


@pytest.mark.asyncio
async def test_get_user_profile_uses_defaults_for_missing_settings(monkeypatch):
    """Test that get_user_profile uses defaults when settings are missing."""
    async def fake_get_user_by_clerk_id(clerk_id: str):
        return {
            "clerkId": clerk_id,
            "email": "minimal@example.com",
            "name": "Minimal User",
            # No settings, subscriptionStatus, or role
        }

    monkeypatch.setattr(tools.db, "get_user_by_clerk_id", fake_get_user_by_clerk_id)

    profile = await tools.get_user_profile("user_456")
    
    assert profile is not None
    assert profile.subscription_status == SubscriptionStatus.FREE
    assert profile.role == UserRole.USER
    assert profile.settings.units.value == "METRIC"
    assert profile.settings.currency.value == "EUR"
    assert profile.settings.theme.value == "SYSTEM"
