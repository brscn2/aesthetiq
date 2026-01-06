export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'modified' | 'removed';
}

export class ChangeFormatter {
  static detectChanges(oldData: any, newData: any): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    
    if (!oldData && !newData) {
      return changes;
    }
    
    // If no old data, everything is new
    if (!oldData && newData) {
      Object.keys(newData).forEach(key => {
        if (newData[key] !== undefined && newData[key] !== null) {
          changes.push({
            field: key,
            oldValue: null,
            newValue: newData[key],
            type: 'added'
          });
        }
      });
      return changes;
    }
    
    // If no new data, everything is removed
    if (oldData && !newData) {
      Object.keys(oldData).forEach(key => {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: null,
          type: 'removed'
        });
      });
      return changes;
    }
    
    // Compare old and new data
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach(key => {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Skip internal fields
      if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt') {
        return;
      }
      
      if (oldValue === undefined && newValue !== undefined) {
        changes.push({
          field: key,
          oldValue: null,
          newValue: newValue,
          type: 'added'
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: null,
          type: 'removed'
        });
      } else if (this.isDifferent(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: newValue,
          type: 'modified'
        });
      }
    });
    
    return changes;
  }
  
  static formatChanges(changes: ChangeDetail[]): string {
    if (changes.length === 0) {
      return 'No changes detected';
    }
    
    return changes.map(change => {
      switch (change.type) {
        case 'added':
          return `Added ${change.field}: ${this.formatValue(change.newValue)}`;
        case 'removed':
          return `Removed ${change.field}: ${this.formatValue(change.oldValue)}`;
        case 'modified':
          return `Changed ${change.field}: ${this.formatValue(change.oldValue)} → ${this.formatValue(change.newValue)}`;
        default:
          return `${change.field} changed`;
      }
    }).join(', ');
  }
  
  private static isDifferent(oldValue: any, newValue: any): boolean {
    // Handle null/undefined
    if (oldValue === null || oldValue === undefined) {
      return newValue !== null && newValue !== undefined;
    }
    if (newValue === null || newValue === undefined) {
      return oldValue !== null && oldValue !== undefined;
    }
    
    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true;
      return oldValue.some((item, index) => this.isDifferent(item, newValue[index]));
    }
    
    // Handle objects
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(newValue);
      
      if (oldKeys.length !== newKeys.length) return true;
      
      return oldKeys.some(key => this.isDifferent(oldValue[key], newValue[key]));
    }
    
    // Handle primitives
    return oldValue !== newValue;
  }
  
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}