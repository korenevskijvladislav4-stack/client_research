/**
 * Сериализация состояния серверной таблицы в query string (переживает F5).
 * Трогаем только перечисленные ключи — остальные параметры URL сохраняются.
 */

import { DEFAULT_PAGE } from '../types/api.types';

const KEYS = {
  page: 'page',
  pageSize: 'page_size',
  search: 'search',
  sortField: 'sort_field',
  sortOrder: 'sort_order',
  filters: 'filters',
} as const;

export type UrlTableDefaults = {
  defaultPageSize: number;
  defaultSortField?: string;
  defaultSortOrder: 'asc' | 'desc';
};

export type ParsedUrlTableState = {
  page: number;
  pageSize: number;
  search: string;
  sortField?: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, unknown>;
};

function parseFiltersJson(raw: string | null): Record<string, unknown> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

/** Чтение из window — только клиент, первый рендер */
export function readTableStateFromWindowSearch(defaults: UrlTableDefaults): ParsedUrlTableState {
  const sp = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const page = Math.max(DEFAULT_PAGE, Number(sp.get(KEYS.page)) || DEFAULT_PAGE);
  const psRaw = Number(sp.get(KEYS.pageSize));
  const pageSize =
    Number.isFinite(psRaw) && psRaw > 0 ? Math.min(100, psRaw) : defaults.defaultPageSize;
  const search = sp.get(KEYS.search) ?? '';
  const sf = sp.get(KEYS.sortField);
  const sortField = sf && sf.trim() ? sf : defaults.defaultSortField;
  const so = sp.get(KEYS.sortOrder);
  const sortOrder =
    so === 'asc' || so === 'desc' ? so : defaults.defaultSortOrder;
  const filters = parseFiltersJson(sp.get(KEYS.filters));
  return { page, pageSize, search, sortField, sortOrder, filters };
}

function filtersToJsonParam(filters: Record<string, unknown>): string | null {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v === '') continue;
    clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return null;
  return JSON.stringify(clean);
}

/** Записать только «табличные» ключи, не трогая tag_id и проч. */
export function mergeTableStateIntoSearchParams(
  prev: URLSearchParams,
  state: {
    page: number;
    pageSize: number;
    search: string;
    sortField?: string;
    sortOrder: 'asc' | 'desc';
    filters: Record<string, unknown>;
  },
  defaults: UrlTableDefaults,
): URLSearchParams {
  const next = new URLSearchParams(prev);

  if (state.page <= DEFAULT_PAGE) next.delete(KEYS.page);
  else next.set(KEYS.page, String(state.page));

  if (state.pageSize === defaults.defaultPageSize) next.delete(KEYS.pageSize);
  else next.set(KEYS.pageSize, String(state.pageSize));

  if (!state.search.trim()) next.delete(KEYS.search);
  else next.set(KEYS.search, state.search);

  if (!state.sortField || state.sortField === defaults.defaultSortField) {
    next.delete(KEYS.sortField);
  } else {
    next.set(KEYS.sortField, state.sortField);
  }

  if (state.sortOrder === defaults.defaultSortOrder) next.delete(KEYS.sortOrder);
  else next.set(KEYS.sortOrder, state.sortOrder);

  const fj = filtersToJsonParam(state.filters);
  if (!fj) next.delete(KEYS.filters);
  else next.set(KEYS.filters, fj);

  return next;
}

export { KEYS as TABLE_URL_KEYS };
