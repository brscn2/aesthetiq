"""User Data server schemas - aligned with backend User schema."""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Enums (matching backend/src/users/schemas/user.schema.ts)
# -----------------------------------------------------------------------------

class SubscriptionStatus(str, Enum):
    FREE = "FREE"
    PRO = "PRO"


class Units(str, Enum):
    METRIC = "METRIC"
    IMPERIAL = "IMPERIAL"


class Theme(str, Enum):
    LIGHT = "LIGHT"
    DARK = "DARK"
    SYSTEM = "SYSTEM"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class ShoppingRegion(str, Enum):
    USA = "USA"
    UK = "UK"
    EU = "EU"
    APAC = "APAC"


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


# -----------------------------------------------------------------------------
# Nested models for User
# -----------------------------------------------------------------------------

class UserSettings(BaseModel):
    """User settings subdocument."""
    # Measurement & Regional
    units: Units = Units.METRIC
    currency: Currency = Currency.EUR
    shoppingRegion: ShoppingRegion = ShoppingRegion.EU
    
    # Privacy & Biometric Settings
    allowBiometrics: bool = False
    allowFacialAnalysis: bool = True
    storeColorHistory: bool = True
    contributeToTrendLearning: bool = False
    
    # Appearance
    theme: Theme = Theme.SYSTEM


# -----------------------------------------------------------------------------
# User model (matching backend/src/users/schemas/user.schema.ts)
# Collection: users
# -----------------------------------------------------------------------------

class User(BaseModel):
    """User as stored in MongoDB 'users' collection."""
    clerkId: str
    email: str
    name: str
    avatarUrl: Optional[str] = None
    subscriptionStatus: SubscriptionStatus = SubscriptionStatus.FREE
    role: UserRole = UserRole.USER
    settings: UserSettings = Field(default_factory=UserSettings)

    class Config:
        # Allow extra fields from Mongo (e.g. _id, timestamps)
        extra = "ignore"


# -----------------------------------------------------------------------------
# UserProfile - Response model for MCP tools (snake_case for consistency)
# -----------------------------------------------------------------------------

class UserProfile(BaseModel):
    """User profile response for MCP tools."""
    user_id: str  # The clerkId
    email: str
    name: str
    avatar_url: Optional[str] = None
    subscription_status: SubscriptionStatus = SubscriptionStatus.FREE
    role: UserRole = UserRole.USER
    settings: UserSettings = Field(default_factory=UserSettings)
    # Raw document for advanced use
    raw: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Request/Response models for MCP tool endpoints
# -----------------------------------------------------------------------------

class GetUserProfileRequest(BaseModel):
    user_id: str


class GetUserProfileResponse(BaseModel):
    profile: UserProfile
