/**
 * DataRegistry stores task-level data for easy retrieval across agents.
 * Provides structured storage and lookup by task ID or slug.
 */

interface DataEntry {
  taskId: string;
  slug?: string;
  data: any;
  timestamp: Date;
}

export class DataRegistry {
  private dataStore: Map<string, DataEntry> = new Map();

  /**
   * Store data for a completed task
   */
  store(taskId: string, data: any, slug?: string): void {
    this.dataStore.set(taskId, {
      taskId,
      slug,
      data,
      timestamp: new Date(),
    });

    // Also store by slug if provided for easy lookup
    if (slug) {
      this.dataStore.set(slug, {
        taskId,
        slug,
        data,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get data by task ID or slug
   */
  get(identifier: string): any | undefined {
    return this.dataStore.get(identifier)?.data;
  }

  /**
   * Check if data exists for a task
   */
  has(identifier: string): boolean {
    return this.dataStore.has(identifier);
  }

  /**
   * Get all stored task identifiers (both IDs and slugs)
   */
  listKeys(): string[] {
    return Array.from(this.dataStore.keys());
  }

  /**
   * Get summary of available data for context building
   */
  getSummary(): string {
    // Get unique entries (filter out duplicate slug entries)
    const uniqueEntries = new Map<string, DataEntry>();
    for (const entry of this.dataStore.values()) {
      uniqueEntries.set(entry.taskId, entry);
    }

    if (uniqueEntries.size === 0) {
      return "No task data stored yet.";
    }

    const entries = Array.from(uniqueEntries.values());
    return entries
      .map((entry) => {
        const identifier = entry.slug || entry.taskId;
        const dataSize = Array.isArray(entry.data) ? entry.data.length : 1;
        return `  - ${identifier}: ${dataSize} item(s)`;
      })
      .join("\n");
  }

  /**
   * Get detailed info about all stored data
   */
  getAll(): DataEntry[] {
    // Return unique entries only (filter out slug duplicates)
    const uniqueEntries = new Map<string, DataEntry>();
    for (const entry of this.dataStore.values()) {
      uniqueEntries.set(entry.taskId, entry);
    }
    return Array.from(uniqueEntries.values());
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.dataStore.clear();
  }
}
