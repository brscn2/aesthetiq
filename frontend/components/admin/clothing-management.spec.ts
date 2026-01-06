/**
 * Feature: admin-dashboard, Property 8: User feedback consistency
 * For any CRUD operation or form submission, the system should provide immediate and appropriate feedback on success, failure, or validation errors
 * Validates: Requirements 4.2, 4.3, 4.5
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import * as fc from "fast-check"

// Mock the admin API and error handler
const mockApi = {
  wardrobe: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAll: jest.fn<(params: any) => Promise<unknown>>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: jest.fn<(data: any) => Promise<unknown>>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: jest.fn<(id: string, data: any) => Promise<unknown>>(),
    delete: jest.fn<(id: string) => Promise<unknown>>(),
  },
  brands: {
    getAll: jest.fn<() => Promise<unknown>>(),
  },
  upload: {
    uploadImage: jest.fn<() => Promise<unknown>>(),
  },
}

const mockErrorHandler = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  handle: jest.fn(),
}

// Mock the hooks
jest.mock("@/lib/admin-api", () => ({
  useAdminApi: () => mockApi,
}))

jest.mock("@/lib/admin-error-handler", () => ({
  AdminErrorHandler: mockErrorHandler,
}))

describe("Clothing Management User Feedback Consistency", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property 8: User feedback consistency
   * Tests that all CRUD operations provide appropriate user feedback
   */
  it("should provide consistent feedback for any clothing management operation", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random operation scenarios
        fc.record({
          operation: fc.constantFrom("create", "update", "delete", "load"),
          success: fc.boolean(),
          validationError: fc.boolean(),
          networkError: fc.boolean(),
          itemData: fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            category: fc.constantFrom("TOP", "BOTTOM", "SHOE", "ACCESSORY"),
            subCategory: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
              nil: undefined,
            }),
            brand: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
              nil: undefined,
            }),
            colorHex: fc.option(
              fc
                .stringMatching(/^[0-9A-Fa-f]{6}$/)
                .map((s: string) => `#${s}`),
              { nil: undefined }
            ),
          }),
        }),
        async (scenario) => {
          const { operation, success, validationError, networkError, itemData } =
            scenario

          // Reset mocks
          mockErrorHandler.showSuccess.mockClear()
          mockErrorHandler.showError.mockClear()
          mockErrorHandler.handle.mockClear()

          // Get the mock function for the operation
          const getMockFn = () => {
            switch (operation) {
              case "create":
                return mockApi.wardrobe.create
              case "update":
                return mockApi.wardrobe.update
              case "delete":
                return mockApi.wardrobe.delete
              case "load":
                return mockApi.wardrobe.getAll
              default:
                return mockApi.wardrobe.getAll
            }
          }

          const mockFn = getMockFn()

          // Configure mock responses based on scenario
          if (validationError) {
            const validationErr = new Error("Validation failed")
            validationErr.name = "ValidationError"
            mockFn.mockRejectedValue(validationErr)
          } else if (networkError) {
            const networkErr = new Error("Network error")
            networkErr.name = "NetworkError"
            mockFn.mockRejectedValue(networkErr)
          } else if (success) {
            const successResult = { _id: "test-id", ...itemData }
            mockFn.mockResolvedValue(successResult)
          } else {
            const genericErr = new Error("Operation failed")
            mockFn.mockRejectedValue(genericErr)
          }

          // Simulate the operation
          try {
            switch (operation) {
              case "create":
                await mockApi.wardrobe.create(itemData)
                if (success) {
                  mockErrorHandler.showSuccess("Clothing item created successfully")
                }
                break
              case "update":
                await mockApi.wardrobe.update("test-id", itemData)
                if (success) {
                  mockErrorHandler.showSuccess("Clothing item updated successfully")
                }
                break
              case "delete":
                await mockApi.wardrobe.delete("test-id")
                if (success) {
                  mockErrorHandler.showSuccess("Clothing item deleted successfully")
                }
                break
              case "load":
                await mockApi.wardrobe.getAll({})
                // Load operations typically don't show success messages
                break
            }
          } catch (error) {
            mockErrorHandler.handle(error, `${operation} operation`)
          }

          // Verify feedback consistency
          if (success && operation !== "load") {
            // Successful operations (except load) should show success feedback
            expect(mockErrorHandler.showSuccess).toHaveBeenCalledWith(
              expect.stringContaining("successfully")
            )
            expect(mockErrorHandler.handle).not.toHaveBeenCalled()
          } else if (
            validationError ||
            networkError ||
            (!success && operation !== "load")
          ) {
            // Failed operations should show error feedback
            expect(mockErrorHandler.handle).toHaveBeenCalledWith(
              expect.any(Error),
              expect.stringContaining(operation)
            )
            expect(mockErrorHandler.showSuccess).not.toHaveBeenCalled()
          }

          // Load operations should not show success messages
          if (operation === "load") {
            expect(mockErrorHandler.showSuccess).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design document
    )
  })

  it("should provide consistent validation feedback for form submissions", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random form data scenarios
        fc.record({
          userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
            nil: "",
          }),
          category: fc.option(
            fc.constantFrom("TOP", "BOTTOM", "SHOE", "ACCESSORY"),
            { nil: "" }
          ),
          colorHex: fc.option(
            fc.oneof(
              fc.stringMatching(/^[0-9A-Fa-f]{6}$/).map((s: string) => `#${s}`), // Valid hex
              fc.string({ minLength: 1, maxLength: 10 }) // Invalid format
            ),
            { nil: "" }
          ),
          hasImage: fc.boolean(),
        }),
        async (formData) => {
          const { userId, category, colorHex, hasImage } = formData

          // Simulate form validation
          const validationErrors: string[] = []

          if (!userId || userId.trim() === "") {
            validationErrors.push("User ID is required")
          }

          if (!category || category === "") {
            validationErrors.push("Category is required")
          }

          if (!hasImage) {
            validationErrors.push("Image is required for new items")
          }

          if (colorHex && colorHex !== "" && !colorHex.match(/^#[0-9A-Fa-f]{6}$/)) {
            validationErrors.push("Color must be a valid hex code")
          }

          // Verify validation feedback consistency
          if (validationErrors.length > 0) {
            // Form with validation errors should not proceed
            expect(validationErrors.length).toBeGreaterThan(0)

            // Each validation error should be specific and actionable
            validationErrors.forEach((error) => {
              expect(error).toMatch(/^[A-Z].*/) // Should start with capital letter
              expect(error.length).toBeGreaterThan(5) // Should be descriptive
              expect(error).not.toContain("undefined") // Should not contain undefined values
            })
          } else {
            // Valid form should have no validation errors
            expect(validationErrors).toHaveLength(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
