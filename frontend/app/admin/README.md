# Admin Dashboard Frontend

This directory contains the admin dashboard frontend infrastructure for the Aesthetiq platform.

## Features

### 🔐 Authentication & Authorization

- **Role-based access control**: Only users with `ADMIN` role can access admin routes
- **Automatic redirects**: Non-admin users are redirected to the main dashboard
- **Session management**: Integrates with Clerk authentication system

### 🎨 Layout & Navigation

- **Responsive design**: Works on desktop and mobile devices
- **Admin sidebar**: Dedicated navigation for admin functions
- **Quick actions**: Easy access to common administrative tasks
- **Theme support**: Supports light/dark mode switching

### 🔌 API Integration

- **Type-safe API client**: Fully typed admin API endpoints
- **Error handling**: Comprehensive error handling with user-friendly messages
- **Loading states**: Built-in loading state management
- **Retry logic**: Automatic retry for failed requests

## Directory Structure

```
frontend/app/admin/
├── layout.tsx              # Admin layout with auth protection
├── page.tsx               # Admin dashboard overview
├── brands/
│   └── page.tsx          # Brand management (placeholder)
├── clothing/
│   └── page.tsx          # Clothing management (placeholder)
├── users/
│   └── page.tsx          # User management (placeholder)
├── audit/
│   └── page.tsx          # Audit logs (placeholder)
└── settings/
    └── page.tsx          # Admin settings (placeholder)
```

## Components

### AdminSidebar

Located in `frontend/components/admin/admin-sidebar.tsx`

Features:

- Navigation menu with active state indicators
- Quick action buttons
- User profile section
- Theme toggle

## Utilities

### Admin API Client

Located in `frontend/lib/admin-api.ts`

Provides type-safe methods for:

- Brand management (CRUD operations)
- Wardrobe item management
- Audit log retrieval
- File uploads (brand logos)

### Admin Authentication

Located in `frontend/lib/admin-auth.ts`

Hooks:

- `useAdminAuth()`: Check admin status and authentication
- `useAdminRedirect()`: Automatic redirect for non-admin users

### Error Handling

Located in `frontend/lib/admin-error-handler.ts`

Features:

- Centralized error handling
- User-friendly error messages
- Toast notifications
- HTTP status code handling

### Loading States

Located in `frontend/hooks/use-admin-loading.ts`

Hooks:

- `useAdminLoading()`: Single operation loading state
- `useAdminMultiLoading()`: Multiple operations loading state

## Usage Examples

### Basic Admin Page

```tsx
"use client";

import { useAdminAuth } from "@/lib/admin-auth";
import { useAdminApi } from "@/lib/admin-api";
import { useAdminLoading } from "@/hooks/use-admin-loading";

export default function AdminPage() {
  const { isAdmin } = useAdminAuth();
  const api = useAdminApi();
  const { isLoading, error, execute } = useAdminLoading();

  const handleAction = async () => {
    await execute(() => api.brands.getAll(), "Loading brands");
  };

  if (!isAdmin) return null;

  return (
    <div>
      <h1>Admin Page</h1>
      <button onClick={handleAction} disabled={isLoading}>
        {isLoading ? "Loading..." : "Load Brands"}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### API Usage

```tsx
import { useAdminApi } from "@/lib/admin-api";

const api = useAdminApi();

// Brand operations
const brands = await api.brands.getAll({ search: "Nike" });
const brand = await api.brands.create({ name: "New Brand" });
await api.brands.update(brandId, { name: "Updated Name" });
await api.brands.delete(brandId);

// Wardrobe operations
const items = await api.wardrobe.getAll({ category: "TOPS" });
const stats = await api.wardrobe.getStats();

// Audit logs
const logs = await api.audit.getAll(1, 50, { action: "CREATE_BRAND" });
```

## Security

- All admin routes are protected by authentication middleware
- Role-based access control prevents unauthorized access
- API requests include proper authentication headers
- Sensitive operations require admin privileges

## Future Enhancements

The following features will be implemented in upcoming tasks:

- Brand management interface (Task 7)
- Clothing management interface (Task 8)
- Admin dashboard overview with real-time stats (Task 9)
- Comprehensive error handling (Task 10)

## Development

To test admin functionality:

1. Ensure your user has the `ADMIN` role in Clerk
2. Navigate to `/admin` in your browser
3. You should see the admin dashboard

To add the admin role to a user, use the admin promotion script:

```bash
cd backend
npm run promote-admin -- user_id_here
```
