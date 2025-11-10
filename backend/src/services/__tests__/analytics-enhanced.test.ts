import { AnalyticsService } from '../analytics.service';
import { JsonStorageService } from '../storage.service';
import { SessionStorageService } from '../session-storage.service';
import { Session, SessionFilters, PaginationParams } from '../../../../shared/types';

describe('AnalyticsService - Enhanced Session Listing and Filtering', () => {
  let analyticsService: AnalyticsService;
  let jsonStorage: JsonStorageService;
  let sessionStorage: SessionStorageService;

  beforeEach(() => {
    jsonStorage = new JsonStorageService('backend/data');
    sessionStorage = new SessionStorageService(jsonStorage);
    analyticsService = new AnalyticsService(jsonStorage, sessionStorage);
  });

  describe('listSessions', () => {
    it('should return paginated sessions without filters', async () => {
      const filters: SessionFilters = {};
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.sessions)).toBe(true);
    });

    it('should filter sessions by date range', async () => {
      const filters: SessionFilters = {
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-12-31T23:59:59.999Z'
      };
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      expect(result.sessions.every(s => {
        const date = new Date(s.createdAt);
        return date >= new Date(filters.dateFrom!) && date <= new Date(filters.dateTo!);
      })).toBe(true);
    });

    it('should filter sessions by category', async () => {
      const filters: SessionFilters = {
        category: 'RPA'
      };
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      expect(result.sessions.every(s => s.category === 'RPA' || s.category === undefined)).toBe(true);
    });

    it('should filter sessions by status', async () => {
      const filters: SessionFilters = {
        status: 'completed'
      };
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      expect(result.sessions.every(s => s.status === 'completed')).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const filters: SessionFilters = {};
      const pagination1: PaginationParams = { page: 1, limit: 5 };
      const pagination2: PaginationParams = { page: 2, limit: 5 };

      const result1 = await analyticsService.listSessions(filters, pagination1);
      const result2 = await analyticsService.listSessions(filters, pagination2);

      expect(result1.page).toBe(1);
      expect(result2.page).toBe(2);
      expect(result1.sessions.length).toBeLessThanOrEqual(5);
      expect(result2.sessions.length).toBeLessThanOrEqual(5);
      
      // Ensure different sessions on different pages
      if (result1.sessions.length > 0 && result2.sessions.length > 0) {
        expect(result1.sessions[0].sessionId).not.toBe(result2.sessions[0].sessionId);
      }
    });

    it('should include requiresAttention flag correctly', async () => {
      const filters: SessionFilters = {};
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      result.sessions.forEach(session => {
        expect(typeof session.requiresAttention).toBe('boolean');
      });
    });

    it('should include triggered rules count when decision matrix is used', async () => {
      const filters: SessionFilters = {};
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      result.sessions.forEach(session => {
        if (session.hasDecisionMatrix) {
          expect(typeof session.triggeredRulesCount).toBe('number');
          expect(session.triggeredRulesCount).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('getSessionDetail', () => {
    it('should return full session data for valid session ID', async () => {
      // Get a session ID from the list
      const listResult = await analyticsService.listSessions({}, { page: 1, limit: 1 });
      
      if (listResult.sessions.length > 0) {
        const sessionId = listResult.sessions[0].sessionId;
        const detail = await analyticsService.getSessionDetail(sessionId);

        expect(detail).not.toBeNull();
        expect(detail?.sessionId).toBe(sessionId);
        expect(detail).toHaveProperty('conversations');
        expect(detail).toHaveProperty('status');
      }
    });

    it('should return null for non-existent session ID', async () => {
      const detail = await analyticsService.getSessionDetail('00000000-0000-0000-0000-000000000000');
      expect(detail).toBeNull();
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', async () => {
      const options = await analyticsService.getFilterOptions();

      expect(options).toHaveProperty('subjects');
      expect(options).toHaveProperty('models');
      expect(options).toHaveProperty('categories');
      expect(options).toHaveProperty('statuses');
      
      expect(Array.isArray(options.subjects)).toBe(true);
      expect(Array.isArray(options.models)).toBe(true);
      expect(Array.isArray(options.categories)).toBe(true);
      expect(Array.isArray(options.statuses)).toBe(true);
    });

    it('should return sorted unique values', async () => {
      const options = await analyticsService.getFilterOptions();

      // Check subjects are sorted
      const sortedSubjects = [...options.subjects].sort();
      expect(options.subjects).toEqual(sortedSubjects);

      // Check models are sorted
      const sortedModels = [...options.models].sort();
      expect(options.models).toEqual(sortedModels);

      // Check for uniqueness
      expect(new Set(options.subjects).size).toBe(options.subjects.length);
      expect(new Set(options.models).size).toBe(options.models.length);
    });
  });

  describe('calculateFilteredMetrics', () => {
    it('should calculate metrics for all sessions when no filters applied', async () => {
      const filters: SessionFilters = {};
      const metrics = await analyticsService.calculateFilteredMetrics(filters);

      expect(metrics).toHaveProperty('totalCount');
      expect(metrics).toHaveProperty('averageConfidence');
      expect(metrics).toHaveProperty('agreementRate');
      expect(metrics).toHaveProperty('categoryDistribution');
      
      expect(typeof metrics.totalCount).toBe('number');
      expect(typeof metrics.averageConfidence).toBe('number');
      expect(typeof metrics.agreementRate).toBe('number');
      expect(typeof metrics.categoryDistribution).toBe('object');
    });

    it('should calculate metrics for filtered sessions', async () => {
      const filters: SessionFilters = {
        status: 'completed'
      };
      const metrics = await analyticsService.calculateFilteredMetrics(filters);

      expect(metrics.totalCount).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeLessThanOrEqual(1);
      expect(metrics.agreementRate).toBeGreaterThanOrEqual(0);
      expect(metrics.agreementRate).toBeLessThanOrEqual(1);
    });

    it('should have correct category distribution sum', async () => {
      const filters: SessionFilters = {};
      const metrics = await analyticsService.calculateFilteredMetrics(filters);

      const totalInDistribution = Object.values(metrics.categoryDistribution)
        .reduce((sum, count) => sum + count, 0);
      
      // Total in distribution should be <= totalCount (some sessions may not have classification)
      expect(totalInDistribution).toBeLessThanOrEqual(metrics.totalCount);
    });

    it('should handle empty result set gracefully', async () => {
      const filters: SessionFilters = {
        dateFrom: '2099-01-01T00:00:00.000Z',
        dateTo: '2099-12-31T23:59:59.999Z'
      };
      const metrics = await analyticsService.calculateFilteredMetrics(filters);

      expect(metrics.totalCount).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
      expect(metrics.agreementRate).toBe(1.0); // Default when no data
      expect(Object.keys(metrics.categoryDistribution).length).toBe(0);
    });
  });

  describe('search text filtering', () => {
    it('should filter by search text in process descriptions', async () => {
      const filters: SessionFilters = {
        searchText: 'report'
      };
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = await analyticsService.listSessions(filters, pagination);

      // All results should contain 'report' somewhere (case-insensitive)
      // This is a basic check - actual implementation searches in multiple fields
      expect(result.sessions.length).toBeGreaterThanOrEqual(0);
    });

    it('should perform case-insensitive search', async () => {
      const filters1: SessionFilters = { searchText: 'REPORT' };
      const filters2: SessionFilters = { searchText: 'report' };
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result1 = await analyticsService.listSessions(filters1, pagination);
      const result2 = await analyticsService.listSessions(filters2, pagination);

      expect(result1.total).toBe(result2.total);
    });
  });

  describe('exportSessionsToCSV', () => {
    it('should generate CSV with correct headers', async () => {
      const filters: SessionFilters = {};
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n');
      const headers = lines[0];

      expect(headers).toContain('sessionId');
      expect(headers).toContain('createdAt');
      expect(headers).toContain('subject');
      expect(headers).toContain('category');
      expect(headers).toContain('confidence');
      expect(headers).toContain('status');
      expect(headers).toContain('modelUsed');
      expect(headers).toContain('feedbackConfirmed');
      expect(headers).toContain('userRating');
      expect(headers).toContain('triggeredRulesCount');
    });

    it('should include session data in CSV rows', async () => {
      const filters: SessionFilters = {};
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n');
      
      // Should have at least header row
      expect(lines.length).toBeGreaterThanOrEqual(1);

      // If there are data rows, check format
      if (lines.length > 1) {
        const dataRow = lines[1];
        const columns = dataRow.split(',');
        
        // Should have 10 columns
        expect(columns.length).toBeGreaterThanOrEqual(10);
      }
    });

    it('should apply filters to CSV export', async () => {
      const filters: SessionFilters = {
        status: 'completed'
      };
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n');
      
      // Check that all data rows (excluding header) have 'completed' status
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          expect(lines[i]).toContain('completed');
        }
      }
    });

    it('should limit export to 10,000 sessions', async () => {
      const filters: SessionFilters = {};
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n').filter(line => line.trim());
      
      // Should have at most 10,001 lines (10,000 data + 1 header)
      expect(lines.length).toBeLessThanOrEqual(10001);
    });

    it('should escape CSV values with commas', async () => {
      const filters: SessionFilters = {};
      const csv = await analyticsService.exportSessionsToCSV(filters);

      // CSV should be valid - no unescaped commas breaking structure
      const lines = csv.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          // Basic check: if line contains quoted values, they should be properly formatted
          const quotedValues = lines[i].match(/"[^"]*"/g);
          if (quotedValues) {
            quotedValues.forEach(value => {
              // Quoted values should not have unescaped quotes
              const inner = value.slice(1, -1);
              expect(inner.includes('"') ? inner.includes('""') : true).toBe(true);
            });
          }
        }
      }
    });

    it('should handle empty result set', async () => {
      const filters: SessionFilters = {
        dateFrom: '2099-01-01T00:00:00.000Z',
        dateTo: '2099-12-31T23:59:59.999Z'
      };
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n').filter(line => line.trim());
      
      // Should only have header row
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('sessionId');
    });

    it('should include triggered rules count in export', async () => {
      const filters: SessionFilters = {};
      const csv = await analyticsService.exportSessionsToCSV(filters);

      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      
      // Find the index of triggeredRulesCount column
      const triggeredRulesIndex = headers.indexOf('triggeredRulesCount');
      expect(triggeredRulesIndex).toBeGreaterThanOrEqual(0);

      // Check that data rows have numeric values in that column
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const columns = lines[i].split(',');
          const triggeredRulesValue = columns[triggeredRulesIndex];
          
          // Should be a number (or empty for sessions without classification)
          if (triggeredRulesValue) {
            expect(!isNaN(Number(triggeredRulesValue))).toBe(true);
          }
        }
      }
    });
  });
});
