import { Connection } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { TestingModule } from '@nestjs/testing';
import { Brand } from '../../src/brands/schemas/brand.schema';
import { User } from '../../src/users/schemas/user.schema';
import { AuditLog } from '../../src/audit/schemas/audit-log.schema';
import { WardrobeItem } from '../../src/wardrobe/schemas/wardrobe-item.schema';
import { testBrands, testUsers, testWardrobeItems, testAuditLogs } from '../fixtures/test-data';

export class TestSetup {
  constructor(
    private readonly moduleRef: TestingModule,
    private readonly connection: Connection
  ) {}

  async cleanDatabase(): Promise<void> {
    const collections = this.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  async seedBrands(): Promise<any[]> {
    const brandModel = this.moduleRef.get(getModelToken(Brand.name));
    const createdBrands = [];
    
    for (const brandData of testBrands) {
      const brand = new brandModel(brandData);
      const saved = await brand.save();
      createdBrands.push(saved);
    }
    
    return createdBrands;
  }

  async seedUsers(): Promise<any[]> {
    const userModel = this.moduleRef.get(getModelToken(User.name));
    const createdUsers = [];
    
    for (const userData of testUsers) {
      const user = new userModel(userData);
      const saved = await user.save();
      createdUsers.push(saved);
    }
    
    return createdUsers;
  }

  async seedWardrobeItems(): Promise<any[]> {
    const wardrobeModel = this.moduleRef.get(getModelToken(WardrobeItem.name));
    const createdItems = [];
    
    for (const itemData of testWardrobeItems) {
      const item = new wardrobeModel(itemData);
      const saved = await item.save();
      createdItems.push(saved);
    }
    
    return createdItems;
  }

  async seedAuditLogs(): Promise<any[]> {
    const auditModel = this.moduleRef.get(getModelToken(AuditLog.name));
    const createdLogs = [];
    
    for (const logData of testAuditLogs) {
      const log = new auditModel(logData);
      const saved = await log.save();
      createdLogs.push(saved);
    }
    
    return createdLogs;
  }

  async seedAll(): Promise<{
    brands: any[];
    users: any[];
    wardrobeItems: any[];
    auditLogs: any[];
  }> {
    const brands = await this.seedBrands();
    const users = await this.seedUsers();
    const wardrobeItems = await this.seedWardrobeItems();
    const auditLogs = await this.seedAuditLogs();

    return { brands, users, wardrobeItems, auditLogs };
  }
}