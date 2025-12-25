/**
 * Admin Dashboard Integration Tests
 * Tests critical admin workflows end-to-end
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/admin',
  }),
}))

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      publicMetadata: { role: 'ADMIN' },
      emailAddresses: [{ emailAddress: 'admin@test.com' }],
    },
  }),
}))

// Mock API responses
const mockApiResponses = {
  brands: {
    getStats: jest.fn().mockResolvedValue({
      totalBrands: 5,
      brandsByCountry: [
        { country: 'Germany', count: 2 },
        { country: 'USA', count: 2 },
        { country: 'Spain', count: 1 },
      ],
      brandsByDecade: [
        { decade: '1940s', count: 1 },
        { decade: '1960s', count: 1 },
        { decade: '1970s', count: 1 },
        { decade: '1980s', count: 1 },
        { decade: '1990s', count: 1 },
      ],
    }),
    getAll: jest.fn().mockResolvedValue({
      brands: [
        { _id: '1', name: 'Nike', country: 'USA', foundedYear: 1964 },
        { _id: '2', name: 'Adidas', country: 'Germany', foundedYear: 1949 },
      ],
      total: 2,
    }),
  },
  wardrobe: {
    getStats: jest.fn().mockResolvedValue({
      totalItems: 10,
      itemsByCategory: [
        { category: 'TOP', count: 4 },
        { category: 'BOTTOM', count: 3 },
        { category: 'SHOE', count: 2 },
        { category: 'ACCESSORY', count: 1 },
      ],
      itemsByBrand: [
        { brand: 'Nike', count: 3 },
        { brand: 'Adidas', count: 2 },
      ],
      itemsByUser: [
        { userId: 'user1', count: 5 },
        { userId: 'user2', count: 5 },
      ],
    }),
  },
  users: {
    getStats: jest.fn().mockResolvedValue({
      totalUsers: 25,
      usersByRole: [
        { role: 'USER', count: 23 },
        { role: 'ADMIN', count: 2 },
      ],
      recentSignups: 5,
    }),
  },
  audit: {
    getStats: jest.fn().mockResolvedValue({
      totalLogs: 100,
      logsByAction: [
        { action: 'CREATE_BRAND', count: 20 },
        { action: 'UPDATE_BRAND', count: 15 },
        { action: 'DELETE_BRAND', count: 5 },
      ],
      logsByResource: [
        { resource: 'brand', count: 40 },
        { resource: 'wardrobe-item', count: 60 },
      ],
      recentActivity: 12,
    }),
    getAll: jest.fn().mockResolvedValue({
      logs: [
        {
          _id: '1',
          action: 'CREATE_BRAND',
          resource: 'brand',
          userEmail: 'admin@test.com',
          timestamp: new Date().toISOString(),
        },
        {
          _id: '2',
          action: 'UPDATE_WARDROBE_ITEM',
          resource: 'wardrobe-item',
          userEmail: 'admin@test.com',
          timestamp: new Date().toISOString(),
        },
      ],
      total: 2,
    }),
  },
}

// Mock the admin API hook
jest.mock('@/lib/admin-api', () => ({
  useAdminApi: () => mockApiResponses,
}))

// Mock the admin loading hook
jest.mock('@/hooks/use-admin-loading', () => ({
  useAdminLoading: () => ({
    isLoading: false,
    error: null,
    execute: jest.fn().mockImplementation((fn) => fn()),
  }),
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}))

describe('Admin Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load and display dashboard statistics correctly', async () => {
    const { DashboardStats } = await import('@/components/admin/dashboard-stats')
    
    render(<DashboardStats />)

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument() // Total brands
      expect(screen.getByText('10')).toBeInTheDocument() // Total items
      expect(screen.getByText('25')).toBeInTheDocument() // Total users
      expect(screen.getByText('12')).toBeInTheDocument() // Recent activity
    })

    // Check that API calls were made
    expect(mockApiResponses.brands.getStats).toHaveBeenCalled()
    expect(mockApiResponses.wardrobe.getStats).toHaveBeenCalled()
    expect(mockApiResponses.users.getStats).toHaveBeenCalled()
    expect(mockApiResponses.audit.getStats).toHaveBeenCalled()
  })

  it('should display recent activity feed', async () => {
    const { DashboardStats } = await import('@/components/admin/dashboard-stats')
    
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('CREATE BRAND')).toBeInTheDocument()
      expect(screen.getByText('UPDATE WARDROBE ITEM')).toBeInTheDocument()
    })
  })

  it('should handle loading states properly', async () => {
    // Mock loading state
    jest.doMock('@/hooks/use-admin-loading', () => ({
      useAdminLoading: () => ({
        isLoading: true,
        error: null,
        execute: jest.fn(),
      }),
    }))

    const { DashboardStats } = await import('@/components/admin/dashboard-stats')
    
    render(<DashboardStats />)

    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('should handle API errors gracefully', async () => {
    // Mock error state
    const mockError = {
      message: 'Failed to load statistics',
      code: 'API_ERROR',
    }

    jest.doMock('@/hooks/use-admin-loading', () => ({
      useAdminLoading: () => ({
        isLoading: false,
        error: mockError,
        execute: jest.fn().mockRejectedValue(new Error('API Error')),
      }),
    }))

    const { DashboardStats } = await import('@/components/admin/dashboard-stats')
    
    render(<DashboardStats />)

    // Should handle error gracefully without crashing
    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })
})

describe('Admin Error Boundary Integration', () => {
  it('should catch and display errors properly', async () => {
    const { AdminErrorBoundary } = await import('@/components/admin/admin-error-boundary')
    
    // Component that throws an error
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })
  })

  it('should allow retry after error', async () => {
    const { AdminErrorBoundary } = await import('@/components/admin/admin-error-boundary')
    
    let shouldThrow = true
    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Success!</div>
    }

    render(
      <AdminErrorBoundary>
        <ConditionalError />
      </AdminErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    // Click retry
    shouldThrow = false
    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument()
    })
  })
})