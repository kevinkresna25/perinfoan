import { describe, it, expect, vi } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';

describe('Database Migration', () => {
  it('executes create table statements and initial seed', async () => {
    const executedQueries: string[] = [];
    const mockPool = {
      query: vi.fn().mockImplementation((sql: string) => {
        executedQueries.push(sql);
        return Promise.resolve([[], []]);
      }),
    } as any;

    await runMigrations(mockPool);
    expect(mockPool.query).toHaveBeenCalledTimes(3);
    expect(executedQueries[0]).toContain('CREATE TABLE IF NOT EXISTS rarities');
    expect(executedQueries[1]).toContain('CREATE TABLE IF NOT EXISTS cards');
    expect(executedQueries[2]).toContain('INSERT IGNORE INTO rarities');
  });
});
