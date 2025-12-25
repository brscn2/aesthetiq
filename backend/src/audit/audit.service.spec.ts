import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fc from 'fast-check';
import { AuditService, AuditLogOptions } from './audit.service';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditLogModel: jest.Mocked<Model<AuditLogDocument>>;

  beforeEach(async () => {
    const mockModel = jest.fn();
    mockModel.find = jest.fn();
    mockModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    mockAuditLogModel = module.get(getModelToken(AuditLog.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Feature: admin-dashboard, Property 7: Admin action audit logging
   * For any administrative action performed, the system should create an audit log entry with appropriate details
   * Validates: Requirements 3.4
   */
  describe('Property 7: Admin action audit logging', () => {
    it('should create audit log entries for any valid admin action', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random audit log options
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            userEmail: fc.emailAddress(),
            action: fc.constantFrom(
              'CREATE_BRAND',
              'UPDATE_BRAND', 
              'DELETE_BRAND',
              'CREATE_WARDROBE_ITEM',
              'UPDATE_WARDROBE_ITEM',
              'DELETE_WARDROBE_ITEM',
              'UPLOAD_BRAND_LOGO'
            ),
            resource: fc.constantFrom('brand', 'wardrobe-item', 'brand-logo'),
            resourceId: fc.option(fc.string({ minLength: 1, maxLength: 24 }), { nil: undefined }),
            oldData: fc.option(fc.object(), { nil: undefined }),
            newData: fc.option(fc.object(), { nil: undefined }),
            ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
            userAgent: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          }),
          async (auditOptions: AuditLogOptions) => {
            // Mock the model constructor and save method
            const mockAuditLogInstance = {
              save: jest.fn().mockResolvedValue({
                _id: 'mock-id',
                ...auditOptions,
                timestamp: new Date(),
              }),
            };
            
            mockAuditLogModel.mockImplementation(() => mockAuditLogInstance);

            // Execute the audit logging
            const result = await service.logAction(auditOptions);

            // Verify that the audit log was created with correct data
            expect(mockAuditLogModel).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: auditOptions.userId,
                userEmail: auditOptions.userEmail,
                action: auditOptions.action,
                resource: auditOptions.resource,
                resourceId: auditOptions.resourceId,
                oldData: auditOptions.oldData,
                newData: auditOptions.newData,
                ipAddress: auditOptions.ipAddress,
                userAgent: auditOptions.userAgent,
              })
            );

            expect(mockAuditLogInstance.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.userId).toBe(auditOptions.userId);
            expect(result.action).toBe(auditOptions.action);
            expect(result.resource).toBe(auditOptions.resource);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design document
      );
    });

    it('should handle audit log retrieval with various filter combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 10 }),
            limit: fc.integer({ min: 1, max: 100 }),
            userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            resource: fc.option(fc.constantFrom('brand', 'wardrobe-item', 'brand-logo'), { nil: undefined }),
            action: fc.option(fc.constantFrom('CREATE_BRAND', 'UPDATE_BRAND', 'DELETE_BRAND'), { nil: undefined }),
            startDate: fc.option(fc.date(), { nil: undefined }),
            endDate: fc.option(fc.date(), { nil: undefined }),
          }),
          async (filters) => {
            // Mock the query chain
            const mockQuery = {
              sort: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              exec: jest.fn().mockResolvedValue([]),
            };

            mockAuditLogModel.find.mockReturnValue(mockQuery as any);
            mockAuditLogModel.countDocuments.mockResolvedValue(0);

            const result = await service.getAuditLogs(filters.page, filters.limit, filters);

            // Verify that the query was constructed correctly
            expect(mockAuditLogModel.find).toHaveBeenCalled();
            expect(mockAuditLogModel.countDocuments).toHaveBeenCalled();
            expect(result).toHaveProperty('logs');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page', filters.page);
            expect(result).toHaveProperty('totalPages');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});