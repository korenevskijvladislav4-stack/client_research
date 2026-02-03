/**
 * Hook for managing server-side pagination, sorting, and filtering
 */

import { useState, useCallback, useMemo } from 'react';
import { TablePaginationConfig } from 'antd';
import { SorterResult, FilterValue } from 'antd/es/table/interface';
import { QueryParams, DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../types/api.types';

export interface UseServerTableOptions {
  defaultPageSize?: number;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export interface UseServerTableReturn<F = Record<string, any>> {
  // Current state
  params: QueryParams;
  page: number;
  pageSize: number;
  search: string;
  filters: F;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';

  // Setters
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setFilters: (filters: F) => void;
  updateFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  setSorting: (field?: string, order?: 'asc' | 'desc') => void;
  reset: () => void;

  // Ant Design Table handlers
  handleTableChange: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<any> | SorterResult<any>[]
  ) => void;

  // Pagination config for Ant Design Table
  paginationConfig: (total: number) => TablePaginationConfig;
}

export function useServerTable<F = Record<string, any>>(
  options: UseServerTableOptions = {}
): UseServerTableReturn<F> {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    defaultSortField,
    defaultSortOrder = 'desc',
  } = options;

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearchState] = useState('');
  const [filters, setFilters] = useState<F>({} as F);
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  // Reset to first page when filters change
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const setFiltersWithReset = useCallback((value: F) => {
    setFilters(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const updateFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(DEFAULT_PAGE);
  }, []);

  const setSorting = useCallback((field?: string, order?: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order || 'desc');
  }, []);

  const reset = useCallback(() => {
    setPage(DEFAULT_PAGE);
    setPageSize(defaultPageSize);
    setSearchState('');
    setFilters({} as F);
    setSortField(defaultSortField);
    setSortOrder(defaultSortOrder);
  }, [defaultPageSize, defaultSortField, defaultSortOrder]);

  // Handle Ant Design Table change
  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      _filters: Record<string, FilterValue | null>,
      sorter: SorterResult<any> | SorterResult<any>[]
    ) => {
      // Handle pagination
      if (pagination.current) {
        setPage(pagination.current);
      }
      if (pagination.pageSize && pagination.pageSize !== pageSize) {
        setPageSize(pagination.pageSize);
        setPage(DEFAULT_PAGE);
      }

      // Handle sorting
      const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      if (singleSorter?.field) {
        setSortField(singleSorter.field as string);
        setSortOrder(singleSorter.order === 'ascend' ? 'asc' : 'desc');
      } else if (!singleSorter?.order) {
        setSortField(defaultSortField);
        setSortOrder(defaultSortOrder);
      }
    },
    [pageSize, defaultSortField, defaultSortOrder]
  );

  // Build query params
  const params = useMemo<QueryParams>(() => {
    const cleanFilters: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters as Record<string, any>)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanFilters[key] = value;
      }
    }

    return {
      page,
      pageSize,
      search: search || undefined,
      filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
      sortField,
      sortOrder,
    };
  }, [page, pageSize, search, filters, sortField, sortOrder]);

  // Pagination config for Ant Design Table
  const paginationConfig = useCallback(
    (total: number): TablePaginationConfig => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      showTotal: (t, range) => `${range[0]}-${range[1]} из ${t}`,
      pageSizeOptions: ['10', '20', '50', '100'],
    }),
    [page, pageSize]
  );

  return {
    params,
    page,
    pageSize,
    search,
    filters,
    sortField,
    sortOrder,
    setPage,
    setPageSize,
    setSearch,
    setFilters: setFiltersWithReset,
    updateFilter,
    setSorting,
    reset,
    handleTableChange,
    paginationConfig,
  };
}
