import { AnalyticsService } from '../analytics.service';
import { JsonStorageService } from '../storage.service';
import { SessionStorageService } from '../session-storage.service';
import { Session } from '../../types';

describe('AnalyticsService - Caching', () => {
  let analyticsService: AnalyticsService;
  let sessionStorage: SessionStorageService;
  let mockSessions: Session[];

  beforeEach(() => {
    // Create mock sessions
    mockSessions = [
      {
        sessionId: '550e8400-e29b-41d4-a716-446655440001',
        initiativeId: '550e8400-e29b-41d4-a716-446655440011',
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:05:00Z',
        status: 'completed',
        modelUsed: 'gpt-4',
        conversations: [],
        subject: 'Finance',
        classification: {
          category: 'Digitise',
          confidence: 0.85,
          rationale: 'Test',
          categoryProgression: 'Test progression',
          futureOpportunities: 'Test opportunities',
          timestamp: '2025-01-01T10:05:00Z',
          modelUsed: 'gpt-4',
          llmProvider: 'openai'
        }
      },
      {
        sessionId: '550e8400-e29b-41d4-a716-446655440002',
        initiativeId: '550e8400-e29b-41d4-a716-446655440012',
        createdAt: '2025-01-02T10:00:00Z',
        updatedAt: '2025-01-02T10:05:00Z',
        status: 'completed',
        modelUsed: 'gpt-4',
        conversations: [],
        subject: 'HR',
        classification: {
          category: 'RPA',
          confidence: 0.75,
          rationale: 'Test',
          categoryProgression: 'Test progression',
          futureOpportunities: 'Test opportunities',
          timestamp: '2025-01-02T10:05:00Z',
          modelUsed: 'gpt-4',
          llmProvider: 'openai'
        }
      }
    ];

    // Mock session storage
    sessionStorage = {
      listSessions: jest.fn().mockResolvedValue(['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']),
      loadSession: jest.fn().mockImplementation((sessionId: string) => {
        return Promise.resolve(mockSessions.find(s => s.sessionId === sessionId));
      }),
      saveSession: jest.fn(),
      createSession: jest.fn()
    } as any;

    const jsonStorage = {} as JsonStorageService;
    analyticsService = new AnalyticsService(jsonStorage, sessionStorage);
  });

  describe('getFilterOptions caching', () => {
    it('should cache filter options for 5 minutes', async () => {
      // First call - should hit storage
      const options1 = await analyticsService.getFilterOptions();
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1);
      expect(sessionStorage.loadSession).toHaveBeenCalledTimes(2);

      // Second call within TTL - should use cache
      const options2 = await analyticsService.getFilterOptions();
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1); // No additional call
      expect(sessionStorage.loadSession).toHaveBeenCalledTimes(2); // No additional calls

      // Results should be the same
      expect(options1).toEqual(options2);
      expect(options1.subjects).toEqual(['Finance', 'HR']);
      expect(options1.categories).toEqual(['Digitise', 'RPA']);
    });

    it('should invalidate cache when invalidateCache is called', async () => {
      // First call
      await analyticsService.getFilterOptions();
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1);

      // Invalidate cache
      analyticsService.invalidateCache();

      // Second call - should hit storage again
      await analyticsService.getFilterOptions();
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(2);
    });
  });

  describe('listSessions caching', () => {
    it('should cache session list for 1 minute', async () => {
      const filters = { category: 'Digitise' as any };
      const pagination = { page: 1, limit: 20 };

      // First call - should hit storage
      const result1 = await analyticsService.listSessions(filters, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1);
      expect(sessionStorage.loadSession).toHaveBeenCalledTimes(2);

      // Second call with same filters - should use cache
      const result2 = await analyticsService.listSessions(filters, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1); // No additional call
      expect(sessionStorage.loadSession).toHaveBeenCalledTimes(2); // No additional calls

      // Results should be the same
      expect(result1).toEqual(result2);
      expect(result1.sessions.length).toBe(1);
      expect(result1.sessions[0].sessionId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should not use cache for different filter combinations', async () => {
      const filters1 = { category: 'Digitise' as any };
      const filters2 = { category: 'RPA' as any };
      const pagination = { page: 1, limit: 20 };

      // First call
      const result1 = await analyticsService.listSessions(filters1, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1);

      // Second call with different filters - should hit storage
      const result2 = await analyticsService.listSessions(filters2, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(2);

      // Results should be different
      expect(result1.sessions[0].sessionId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result2.sessions[0].sessionId).toBe('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should invalidate session list cache when invalidateCache is called', async () => {
      const filters = {};
      const pagination = { page: 1, limit: 20 };

      // First call
      await analyticsService.listSessions(filters, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(1);

      // Invalidate cache
      analyticsService.invalidateCache();

      // Second call - should hit storage again
      await analyticsService.listSessions(filters, pagination);
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache invalidation', () => {
    it('should clear both filter options and session list caches', async () => {
      // Populate both caches
      await analyticsService.getFilterOptions();
      await analyticsService.listSessions({}, { page: 1, limit: 20 });
      
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(2);

      // Invalidate
      analyticsService.invalidateCache();

      // Both should hit storage again
      await analyticsService.getFilterOptions();
      await analyticsService.listSessions({}, { page: 1, limit: 20 });
      
      expect(sessionStorage.listSessions).toHaveBeenCalledTimes(4);
    });
  });
});
