import { Button, DatePicker, Select, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReadFilter = 'all' | 'unread' | 'read';

interface CasinoOption {
  value: number;
  label: string;
}

interface GeoOption {
  value: string;
  label: string;
}

export interface AccountEmail {
  email: string;
  geo: string;
}

interface EmailFiltersProps {
  casinoOptions: CasinoOption[];
  accountEmails: AccountEmail[];
  geoOptions: GeoOption[];
  filterCasinoId: number | undefined;
  filterToEmail: string | undefined;
  filterGeo: string | undefined;
  readFilter: ReadFilter;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onCasinoChange: (value: number | undefined) => void;
  onRecipientChange: (value: string | undefined) => void;
  onGeoChange: (value: string | undefined) => void;
  onReadFilterChange: (value: ReadFilter) => void;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
  onReset?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailFilters({
  casinoOptions,
  accountEmails,
  geoOptions,
  filterCasinoId,
  filterToEmail,
  filterGeo,
  readFilter,
  dateFrom,
  dateTo,
  onCasinoChange,
  onRecipientChange,
  onGeoChange,
  onReadFilterChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: EmailFiltersProps) {
  const hasFilters =
    filterCasinoId || filterToEmail || filterGeo || readFilter !== 'all' || dateFrom || dateTo;

  // Unique emails from accounts
  const emailOptions = Array.from(
    new Map(accountEmails.map((a) => [a.email, a])).values(),
  ).map((a) => ({ value: a.email, label: a.email }));

  return (
    <Space
      wrap
      style={{
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Select
        allowClear
        showSearch
        placeholder="Фильтр по казино"
        style={{ minWidth: 220 }}
        options={casinoOptions}
        value={filterCasinoId}
        onChange={onCasinoChange}
        filterOption={(input, option) =>
          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
        }
      />
      <Select
        allowClear
        showSearch
        placeholder="Получатель"
        style={{ minWidth: 220 }}
        options={emailOptions}
        value={filterToEmail}
        onChange={onRecipientChange}
        filterOption={(input, option) =>
          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
        }
      />
      <Select
        allowClear
        showSearch
        placeholder="GEO"
        style={{ minWidth: 140 }}
        options={geoOptions}
        value={filterGeo}
        onChange={onGeoChange}
        filterOption={(input, option) =>
          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
        }
      />
      <Select<ReadFilter>
        value={readFilter}
        style={{ minWidth: 180 }}
        onChange={onReadFilterChange}
        options={[
          { value: 'all', label: 'Все письма' },
          { value: 'unread', label: 'Непрочитанные' },
          { value: 'read', label: 'Прочитанные' },
        ]}
      />
      <DatePicker
        placeholder="Дата от"
        format="DD.MM.YYYY"
        value={dateFrom ? dayjs(dateFrom) : null}
        onChange={(d: Dayjs | null) => onDateFromChange(d ? d.format('YYYY-MM-DD') : undefined)}
        allowClear
      />
      <DatePicker
        placeholder="Дата до"
        format="DD.MM.YYYY"
        value={dateTo ? dayjs(dateTo) : null}
        onChange={(d: Dayjs | null) => onDateToChange(d ? d.format('YYYY-MM-DD') : undefined)}
        allowClear
      />
      {hasFilters && onReset && (
        <Button onClick={onReset}>Сбросить</Button>
      )}
    </Space>
  );
}
