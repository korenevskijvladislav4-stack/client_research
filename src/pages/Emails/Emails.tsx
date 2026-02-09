import { useMemo, useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message } from 'antd';
import { DownloadOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../config/api';
import {
  EmailFilters,
  EmailList,
  EmailDetailDrawer,
  type ReadFilter,
} from './components';
import { PAGE_SIZE } from './constants';
import {
  useGetEmailsQuery,
  useGetRecipientsQuery,
  useSyncEmailsMutation,
  type Email,
} from '../../store/api/emailApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';

const { Title } = Typography;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Emails() {
  const [searchParams] = useSearchParams();

  // -------------------------------------------------------------------------
  // Filters state (pre-filled from URL query params if present)
  // -------------------------------------------------------------------------

  const [currentPage, setCurrentPage] = useState(1);
  const [filterCasinoId, setFilterCasinoId] = useState<number | undefined>(() => {
    const v = searchParams.get('related_casino_id');
    return v ? Number(v) : undefined;
  });
  const [filterToEmail, setFilterToEmail] = useState<string | undefined>();
  const [filterGeo, setFilterGeo] = useState<string | undefined>();
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string | undefined>(() =>
    searchParams.get('date_from') || undefined,
  );
  const [filterDateTo, setFilterDateTo] = useState<string | undefined>(() =>
    searchParams.get('date_to') || undefined,
  );

  // -------------------------------------------------------------------------
  // RTK Query
  // -------------------------------------------------------------------------

  const { data: emailsResponse, isLoading, refetch } = useGetEmailsQuery({
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
    ...(readFilter !== 'all' ? { is_read: readFilter === 'read' } : {}),
    ...(filterCasinoId ? { related_casino_id: filterCasinoId } : {}),
    ...(filterToEmail ? { to_email: filterToEmail } : {}),
    ...(filterGeo ? { geo: filterGeo } : {}),
    ...(filterDateFrom ? { date_from: filterDateFrom } : {}),
    ...(filterDateTo ? { date_to: filterDateTo } : {}),
  });

  const { data: accountEmails = [] } = useGetRecipientsQuery();
  const { data: casinos } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const [syncEmails] = useSyncEmailsMutation();

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const emails = emailsResponse?.data ?? [];
  const total = emailsResponse?.total ?? 0;

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos],
  );

  const geoOptions = useMemo(
    () => geos.map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );

  // -------------------------------------------------------------------------
  // Drawer state
  // -------------------------------------------------------------------------

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const closeDrawer = useCallback(() => setSelectedEmail(null), []);
  const handleUpdated = useCallback((updatedEmail?: Email) => {
    if (updatedEmail) setSelectedEmail(updatedEmail);
    refetch();
  }, [refetch]);

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncEmails().unwrap();
      refetch();
      message.success(res.message ?? 'Синхронизация завершена');
    } catch {
      message.error('Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const handleExport = useCallback(() => {
    const p = new URLSearchParams();
    if (filterCasinoId) p.set('related_casino_id', String(filterCasinoId));
    if (filterToEmail) p.set('to_email', filterToEmail);
    if (filterGeo) p.set('geo', filterGeo);
    if (filterDateFrom) p.set('date_from', filterDateFrom);
    if (filterDateTo) p.set('date_to', filterDateTo);
    if (readFilter !== 'all') p.set('is_read', readFilter === 'read' ? 'true' : 'false');

    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    p.set('token', token);

    const url = `${baseUrl}/emails/export?${p.toString()}`;
    window.open(url, '_blank');
  }, [filterCasinoId, filterToEmail, filterGeo, filterDateFrom, filterDateTo, readFilter]);

  // -------------------------------------------------------------------------
  // Filter change helpers (reset page to 1)
  // -------------------------------------------------------------------------

  const handleCasinoChange = useCallback((v: number | undefined) => {
    setFilterCasinoId(v);
    setCurrentPage(1);
  }, []);

  const handleRecipientChange = useCallback((v: string | undefined) => {
    setFilterToEmail(v);
    setCurrentPage(1);
  }, []);

  const handleGeoChange = useCallback((v: string | undefined) => {
    setFilterGeo(v);
    setCurrentPage(1);
  }, []);

  const handleReadFilterChange = useCallback((v: ReadFilter) => {
    setReadFilter(v);
    setCurrentPage(1);
  }, []);

  const handleDateFromChange = useCallback((v: string | undefined) => {
    setFilterDateFrom(v);
    setCurrentPage(1);
  }, []);

  const handleDateToChange = useCallback((v: string | undefined) => {
    setFilterDateTo(v);
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterCasinoId(undefined);
    setFilterToEmail(undefined);
    setFilterGeo(undefined);
    setReadFilter('all');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setCurrentPage(1);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) return <Card loading />;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={3} style={{ margin: 0, fontWeight: 500 }}>
          Почта
        </Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Выгрузить XLSX
          </Button>
          <Link to="/emails/imap-accounts">
            <Button icon={<SettingOutlined />}>Настройки</Button>
          </Link>
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSync}
          >
            Синхронизировать
          </Button>
        </Space>
      </div>

      {/* Content */}
      <Card>
        <EmailFilters
          casinoOptions={casinoOptions}
          accountEmails={accountEmails}
          geoOptions={geoOptions}
          filterCasinoId={filterCasinoId}
          filterToEmail={filterToEmail}
          filterGeo={filterGeo}
          readFilter={readFilter}
          dateFrom={filterDateFrom}
          dateTo={filterDateTo}
          onCasinoChange={handleCasinoChange}
          onRecipientChange={handleRecipientChange}
          onGeoChange={handleGeoChange}
          onReadFilterChange={handleReadFilterChange}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
          onReset={handleResetFilters}
        />

        <EmailList
          emails={emails}
          total={total}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSelect={setSelectedEmail}
        />
      </Card>

      {/* Detail drawer */}
      <EmailDetailDrawer
        email={selectedEmail}
        casinoOptions={casinoOptions}
        onClose={closeDrawer}
        onUpdated={handleUpdated}
      />
    </Space>
  );
}
