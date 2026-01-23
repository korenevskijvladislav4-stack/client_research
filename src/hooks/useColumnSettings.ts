import { useState, useEffect, useCallback, useMemo } from 'react';

const COOKIE_PREFIX = 'table_columns_';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 год

function getCookie(name: string): string | null {
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return matches ? decodeURIComponent(matches[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export interface ColumnConfig {
  key: string;
  title: string;
  default?: boolean; // показывать по умолчанию (true если не указано)
}

export function useColumnSettings(tableKey: string, allColumns: ColumnConfig[]) {
  const cookieKey = COOKIE_PREFIX + tableKey;

  // Получаем дефолтные колонки (те у которых default !== false)
  const getDefaultVisible = useCallback(
    (cols: ColumnConfig[]) => cols.filter((c) => c.default !== false).map((c) => c.key),
    []
  );

  // Читаем сохранённые настройки из cookie
  const savedFromCookie = useMemo(() => {
    const saved = getCookie(cookieKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as string[];
        }
      } catch {
        // ignore
      }
    }
    return null;
  }, [cookieKey]);

  // Состояние видимых колонок
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => {
    // Если есть сохранённые настройки - используем их
    if (savedFromCookie) {
      return savedFromCookie;
    }
    // Иначе - дефолтные
    return getDefaultVisible(allColumns);
  });

  // Когда allColumns меняется (например, загрузились profileFields)
  // НЕ сбрасываем настройки, просто убеждаемся что сохранённые ключи валидны
  useEffect(() => {
    if (allColumns.length === 0) return;

    setVisibleKeys((prev) => {
      // Если текущий список пуст — инициализируем
      if (prev.length === 0) {
        if (savedFromCookie && savedFromCookie.length > 0) {
          // Фильтруем только существующие ключи
          const valid = savedFromCookie.filter((k) =>
            allColumns.some((c) => c.key === k)
          );
          if (valid.length > 0) return valid;
        }
        return getDefaultVisible(allColumns);
      }

      // Если уже есть настройки — не трогаем
      // (даже если появились новые колонки, не добавляем их автоматически)
      return prev;
    });
  }, [allColumns, savedFromCookie, getDefaultVisible]);

  // Сохраняем в cookie при изменении
  useEffect(() => {
    if (visibleKeys.length > 0) {
      setCookie(cookieKey, JSON.stringify(visibleKeys));
    }
  }, [cookieKey, visibleKeys]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) {
        // Не даём убрать последнюю колонку
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setVisibleKeys(getDefaultVisible(allColumns));
  }, [allColumns, getDefaultVisible]);

  const isVisible = useCallback(
    (key: string) => visibleKeys.includes(key),
    [visibleKeys]
  );

  return {
    visibleKeys,
    setVisibleKeys,
    toggleColumn,
    resetToDefault,
    isVisible,
    allColumns,
  };
}
