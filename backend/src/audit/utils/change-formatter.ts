export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
  displayName: string;
}

export class ChangeFormatter {
  private static readonly FIELD_DISPLAY_NAMES: Record<string, string> = {
    // Brand fields
    name: 'Name',
    description: 'Description',
    logoUrl: 'Logo URL',
    website: 'Website',
    foundedYear: 'Founded Year',
    country: 'Country',
    
    // Wardrobe item fields
    category: 'Category',
    subCategory: 'Sub Category',
    brand: 'Brand',
    brandId: 'Brand ID',
    colorHex: 'Color',
    colorName: 'Color Name',
    imageUrl: 'Image URL',
    processedImageUrl: 'Processed Image URL',
    userId: 'User ID',
    
    // Common fields
    createdAt: 'Created At',
    updatedAt: 'Updated At',
  };

  static formatChanges(oldData: any, newData: any): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    
    if (!oldData || !newData) {
      return changes;
    }

    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData)
    ]);

    for (const key of allKeys) {
      // Skip internal MongoDB fields and timestamps for comparison
      if (key.startsWith('_') || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
        continue;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];

      // Check if values are different
      if (!this.areValuesEqual(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue: this.formatValue(oldValue),
          newValue: this.formatValue(newValue),
          displayName: this.FIELD_DISPLAY_NAMES[key] || this.capitalizeField(key),
        });
      }
    }

    return changes;
  }

  private static areValuesEqual(value1: any, value2: any): boolean {
    // Handle null/undefined
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;

    // Handle ObjectId comparison
    if (value1._id && value2._id) {
      return value1._id.toString() === value2._id.toString();
    }
    if (value1._id) {
      return value1._id.toString() === value2.toString();
    }
    if (value2._id) {
      return value1.toString() === value2._id.toString();
    }

    // Handle objects (like populated brand data)
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }

    // Handle primitive values
    return value1 === value2;
  }

  private static formatValue(value: any): string {
    if (value == null) {
      return 'Not set';
    }

    // Handle ObjectId
    if (value._id) {
      return value._id.toString();
    }

    // Handle populated objects (like brand data)
    if (typeof value === 'object' && value.name) {
      return value.name;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle color hex values
    if (typeof value === 'string' && value.startsWith('#')) {
      return `${value} (${this.getColorName(value)})`;
    }

    return value.toString();
  }

  private static capitalizeField(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  private static getColorName(hex: string): string {
    // Simple color name mapping - in a real app, you might use a color library
    const colorMap: Record<string, string> = {
      '#000000': 'Black',
      '#FFFFFF': 'White',
      '#FF0000': 'Red',
      '#00FF00': 'Green',
      '#0000FF': 'Blue',
      '#FFFF00': 'Yellow',
      '#FF00FF': 'Magenta',
      '#00FFFF': 'Cyan',
      '#808080': 'Gray',
      '#800000': 'Maroon',
      '#008000': 'Dark Green',
      '#000080': 'Navy',
    };

    return colorMap[hex.toUpperCase()] || 'Custom Color';
  }

  static formatChangesSummary(changes: ChangeDetail[]): string {
    if (changes.length === 0) {
      return 'No changes detected';
    }

    if (changes.length === 1) {
      const change = changes[0];
      return `${change.displayName}: ${change.oldValue} → ${change.newValue}`;
    }

    return `${changes.length} fields changed: ${changes.map(c => c.displayName).join(', ')}`;
  }
}