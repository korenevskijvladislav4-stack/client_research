/**
 * Hook for managing server-side pagination, sorting, and filtering
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TablePaginationConfig } from 'antd';
import { SorterResult, FilterValue } from 'antd/es/table/interface';
import { QueryParams, DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../types/api.types';
import {
  readTableStateFromWindowSearch,
  mergeTableStateIntoSearchParams,
  type UrlTableDefaults,
} from './tableUrlPersistence';

export interface UseServerTableOptions {
  defaultPageSize?: number;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  /** Сохранять page / фильтры / сортировку / поиск в URL (F5 и шаринг) */
  persistInUrl?: boolean;
  /**
   * Доп. query-параметры в том же URL, что и таблица (напр. tag_id на странице казино).
   * Пустая строка или undefined — удалить ключ.
   */
  urlExtraParams?: Record<string, string | undefined>;
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
    persistInUrl = false,
    urlExtraParams,
  } = options;

  const urlExtraSerialized = useMemo(
    () => JSON.stringify(urlExtraParams ?? {}),
    [urlExtraParams],
  );

  const urlDefaults: UrlTableDefaults = useMemo(
    () => ({
      defaultPageSize,
      defaultSortField,
      defaultSortOrder,
    }),
    [defaultPageSize, defaultSortField, defaultSortOrder],
  );

  const initialFromUrl = persistInUrl ? readTableStateFromWindowSearch(urlDefaults) : null;

  const [, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(initialFromUrl?.page ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(initialFromUrl?.pageSize ?? defaultPageSize);
  const [search, setSearchState] = useState(initialFromUrl?.search ?? '');
  const [filters, setFilters] = useState<F>((initialFromUrl?.filters ?? {}) as F);
  const [sortField, setSortField] = useState<string | undefined>(
    initialFromUrl?.sortField ?? defaultSortField,
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialFromUrl?.sortOrder ?? defaultSortOrder,
  );

  useEffect(() => {
    if (!persistInUrl) return;
    const extras = urlExtraSerialized ? (JSON.parse(urlExtraSerialized) as Record<string, string | undefined>) : {};
    setSearchParams(
      (prev) => {
        let next = mergeTableStateIntoSearchParams(
          prev,
          {
            page,
            pageSize,
            search,
            sortField,
            sortOrder,
            filters: filters as Record<string, unknown>,
          },
          urlDefaults,
        );
        for (const [k, v] of Object.entries(extras)) {
          if (v === undefined || v === '') next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  }, [
    persistInUrl,
    page,
    pageSize,
    search,
    sortField,
    sortOrder,
    filters,
    setSearchParams,
    urlDefaults,
    urlExtraSerialized,
  ]);

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
