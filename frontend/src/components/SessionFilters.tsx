import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SessionFilters as SessionFiltersType, FilterOptions, TransformationCategory } from '../../../shared/types';

interface SessionFiltersProps {
  filters: SessionFiltersType;
  onFiltersChange: (filters: SessionFiltersType) => void;
  filterOptions: FilterOptions;
}

const SessionFilters: React.FC<SessionFiltersProps> = ({
  filters,
  onFiltersChange,
  filterOptions
}) => {
  const [localFilters, setLocalFilters] = useState<SessionFiltersType>(filters);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Debounced filter change handler
  const debouncedOnFiltersChange = useCallback((newFilters: SessionFiltersType) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    const timer = setTimeout(() => {
      onFiltersChange(newFilters);
    }, 300);
    setSearchDebounceTimer(timer);
  }, [onFiltersChange, searchDebounceTimer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  const handleFilterChange = (key: keyof SessionFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);

    // Announce filter change to screen readers
    announceFilterChange(key, value);

    // Debounce only search text changes, apply others immediately
    if (key === 'searchText') {
      debouncedOnFiltersChange(newFilters);
    } else {
      onFiltersChange(newFilters);
    }
  };

  // Announce filter changes to screen readers
  const announceFilterChange = (key: keyof SessionFiltersType, value: any) => {
    if (!announcementRef.current) return;
    
    let message = '';
    switch (key) {
      case 'dateFrom':
        message = value ? `Start date filter set to ${new Date(value).toLocaleDateString()}` : 'Start date filter cleared';
        break;
      case 'dateTo':
        message = value ? `End date filter set to ${new Date(value).toLocaleDateString()}` : 'End date filter cleared';
        break;
      case 'category':
        message = value ? `Category filter set to ${value}` : 'Category filter cleared';
        break;
      case 'subject':
        message = value ? `Subject filter set to ${value}` : 'Subject filter cleared';
        break;
      case 'model':
        message = value ? `Model filter set to ${value}` : 'Model filter cleared';
        break;
      case 'status':
        message = value ? `Status filter set to ${value}` : 'Status filter cleared';
        break;
      case 'searchText':
        message = value ? `Searching for: ${value}` : 'Search cleared';
        break;
    }
    
    announcementRef.current.textContent = message;
  };

  const handleClearAll = () => {
    const emptyFilters: SessionFiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    
    // Announce to screen readers
    if (announcementRef.current) {
      announcementRef.current.textContent = 'All filters cleared';
    }
  };

  // Validate date range (from <= to)
  const isDateRangeValid = () => {
    if (localFilters.dateFrom && localFilters.dateTo) {
      return new Date(localFilters.dateFrom) <= new Date(localFilters.dateTo);
    }
    return true;
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
    minHeight: '44px',
    outline: 'none'
  };

  const inputFocusStyle: React.CSSProperties = {
    ...inputStyle,
    outline: '3px solid #007bff',
    outlineOffset: '2px',
    borderColor: '#007bff'
  };

  const errorInputStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#dc3545'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '44px',
    minHeight: '44px',
    outline: 'none'
  };

  const buttonFocusStyle: React.CSSProperties = {
    ...buttonStyle,
    outline: '3px solid #007bff',
    outlineOffset: '2px'
  };

  return (
    <div style={containerStyle} role="search" aria-label="Session filters">
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }} id="filter-heading">Filter Sessions</h3>
        <button
          onClick={handleClearAll}
          style={buttonStyle}
          aria-label="Clear all filters"
          onFocus={(e) => Object.assign(e.currentTarget.style, buttonFocusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
        >
          Clear All Filters
        </button>
      </div>

      <div style={gridStyle}>
        {/* Date From */}
        <div>
          <label htmlFor="dateFrom" style={labelStyle}>
            Date From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={localFilters.dateFrom ? localFilters.dateFrom.split('T')[0] : ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value).toISOString() : '')}
            style={!isDateRangeValid() ? errorInputStyle : inputStyle}
            aria-label="Filter by start date"
            aria-invalid={!isDateRangeValid()}
            aria-describedby={!isDateRangeValid() ? 'date-range-error' : undefined}
            onFocus={(e) => !isDateRangeValid() ? null : Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, !isDateRangeValid() ? errorInputStyle : inputStyle)}
          />
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="dateTo" style={labelStyle}>
            Date To
          </label>
          <input
            id="dateTo"
            type="date"
            value={localFilters.dateTo ? localFilters.dateTo.split('T')[0] : ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value).toISOString() : '')}
            style={!isDateRangeValid() ? errorInputStyle : inputStyle}
            aria-label="Filter by end date"
            aria-invalid={!isDateRangeValid()}
            aria-describedby={!isDateRangeValid() ? 'date-range-error' : undefined}
            onFocus={(e) => !isDateRangeValid() ? null : Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, !isDateRangeValid() ? errorInputStyle : inputStyle)}
          />
          {!isDateRangeValid() && (
            <div id="date-range-error" role="alert" style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
              End date must be after start date
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" style={labelStyle}>
            Category
          </label>
          <select
            id="category"
            value={localFilters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value as TransformationCategory)}
            style={inputStyle}
            aria-label="Filter by category"
            onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" style={labelStyle}>
            Subject
          </label>
          <select
            id="subject"
            value={localFilters.subject || ''}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
            style={inputStyle}
            aria-label="Filter by subject"
            onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          >
            <option value="">All Subjects</option>
            {filterOptions.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label htmlFor="model" style={labelStyle}>
            Model
          </label>
          <select
            id="model"
            value={localFilters.model || ''}
            onChange={(e) => handleFilterChange('model', e.target.value)}
            style={inputStyle}
            aria-label="Filter by model"
            onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          >
            <option value="">All Models</option>
            {filterOptions.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" style={labelStyle}>
            Status
          </label>
          <select
            id="status"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as 'active' | 'completed' | 'manual_review')}
            style={inputStyle}
            aria-label="Filter by status"
            onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="manual_review">Manual Review</option>
          </select>
        </div>
      </div>

      {/* Search Input - Full Width */}
      <div>
        <label htmlFor="searchText" style={labelStyle}>
          Search
        </label>
        <input
          id="searchText"
          type="text"
          placeholder="Search in process descriptions, rationale, or comments..."
          value={localFilters.searchText || ''}
          onChange={(e) => handleFilterChange('searchText', e.target.value)}
          style={inputStyle}
          aria-label="Search sessions by text"
          aria-describedby="search-help"
          maxLength={500}
          onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
        />
        <div id="search-help" style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
          Search is debounced by 300ms to avoid excessive filtering
        </div>
      </div>
    </div>
  );
};

export default SessionFilters;
