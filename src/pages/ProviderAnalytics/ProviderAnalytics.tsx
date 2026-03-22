import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Typography, theme, message } from 'antd';
import { CheckOutlined, ApiOutlined, DownloadOutlined } from '@ant-design/icons';
import { useGetProviderAnalyticsQuery } from '../../store/api/casinoProviderApi';
import { getApiBaseUrl } from '../../config/api';
import { useAppSelector } from '../../hooks/redux';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetProvidersQuery } from '../../store/api/referenceApi';
import { PageHeaderCard } from '../../components/PageHeaderCard';

interface AnalyticsRow {
  casino_id: number;
  casino_name: string;
  hasProvider: Record<number, boolean>;
}

function parseCsvNumbers(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseCsvStrings(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProviderAnalytics() {
  const nav = useNavigate();
  const { token } = theme.useToken();
  const authToken = useAppSelector((s) => s.auth.token);
  const [, setSearchParams] = useSearchParams();
  const urlInit = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return {
      filterGeos: parseCsvStrings(sp.get('geos')),
      filterCasinoIds: parseCsvNumbers(sp.get('casino_ids')),
      filterProviderIds: parseCsvNumbers(sp.get('provider_ids')),
    };
  }, []);

  const [filterGeos, setFilterGeos] = useState<string[]>(urlInit.filterGeos);
  const [filterCasinoIds, setFilterCasinoIds] = useState<number[]>(urlInit.filterCasinoIds);
  const [filterProviderIds, setFilterProviderIds] = useState<number[]>(urlInit.filterProviderIds);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (filterGeos.length > 0) next.set('geos', filterGeos.join(','));
        else next.delete('geos');
        if (filterCasinoIds.length > 0) next.set('casino_ids', filterCasinoIds.join(','));
        else next.delete('casino_ids');
        if (filterProviderIds.length > 0) next.set('provider_ids', filterProviderIds.join(','));
        else next.delete('provider_ids');
        return next;
      },
      { replace: true },
    );
  }, [filterGeos, filterCasinoIds, filterProviderIds, setSearchParams]);

  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: providersList = [] } = useGetProvidersQuery();
  const { data: resp, isLoading } = useGetProviderAnalyticsQuery({
    geo: filterGeos.length > 0 ? filterGeos : undefined,
    casino_id: filterCasinoIds.length > 0 ? filterCasinoIds : undefined,
    provider_id: filterProviderIds.length > 0 ? filterProviderIds : undefined,
  });

  const connectionSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of resp?.connections ?? []) {
      set.add(`${c.casino_id}-${c.provider_id}`);
    }
    return set;
  }, [resp?.connections]);

  const rows: AnalyticsRow[] = useMemo(() => {
    const list = resp?.casinos ?? [];
    const provs = resp?.providers ?? [];
    return list.map((casino) => {
      const hasProvider: Record<number, boolean> = {};
      for (const p of provs) {
        hasProvider[p.id] = connectionSet.has(`${casino.id}-${p.id}`);
      }
      return {
        casino_id: casino.id,
        casino_name: casino.name,
        hasProvider,
      };
    });
  }, [resp?.casinos, resp?.providers, connectionSet]);

  const geoOptions = useMemo(
    () => geos.map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );
  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos],
  );
  const providerOptions = useMemo(
    () => providersList.map((p) => ({ value: p.id, label: p.name })),
    [providersList],
  );

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: 'Казино',
        dataIndex: 'casino_name',
        key: 'casino_name',
        fixed: 'left' as const,
        width: 220,
        render: (name: string, row: AnalyticsRow) => (
          <Typography.Link onClick={() => nav(`/casinos/${row.casino_id}`)}>
            {name}
          </Typography.Link>
        ),
      },
    ];
    for (const p of resp?.providers ?? []) {
      cols.push({
        title: p.name,
        key: `provider_${p.id}`,
        width: 80,
        align: 'center' as const,
        render: (_: unknown, row: AnalyticsRow) =>
          row.hasProvider[p.id] ? (
            <CheckOutlined style={{ color: 'var(--ant-color-success)' }} />
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      });
    }
    return cols;
  }, [resp?.providers, nav]);

  const scrollX = 220 + (resp?.providers?.length ?? 0) * 80;

  const providerCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of resp?.providers ?? []) {
      counts[p.id] = rows.filter((r) => r.hasProvider[p.id]).length;
    }
    return counts;
  }, [resp?.providers, rows]);

  const handleExport = () => {
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      filterGeos.forEach((g) => params.append('geo', g));
      filterCasinoIds.forEach((id) => params.append('casino_id', String(id)));
      filterProviderIds.forEach((id) => params.append('provider_id', String(id)));
      if (authToken) {
        params.set('token', authToken);
      }
      const qs = params.toString();
      const url = `${baseUrl}/providers/analytics/export${qs ? `?${qs}` : ''}`;
      window.open(url, '_blank');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to export provider analytics', e);
      message.error('Не удалось выгрузить аналитику провайдеров');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ApiOutlined />
            Аналитика по провайдерам
          </span>
        }
        description="Строки — казино, столбцы — провайдеры. Галочка — подключено для выбранного GEO, прочерк — нет."
        actions={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Выгрузить XLSX
          </Button>
        }
      />

      <Card size="small">
        <Space wrap size={16}>
          <Space align="center">
            <Typography.Text type="secondary">Казино:</Typography.Text>
            <Select
              mode="multiple"
              style={{ minWidth: 260 }}
              placeholder="Все казино"
              allowClear
              showSearch
              value={filterCasinoIds}
              onChange={(v) => setFilterCasinoIds(v ?? [])}
              options={casinoOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount="responsive"
            />
          </Space>
          <Space align="center">
            <Typography.Text type="secondary">GEO:</Typography.Text>
            <Select
              mode="multiple"
              style={{ minWidth: 220 }}
              placeholder="Все GEO"
              allowClear
              showSearch
              value={filterGeos}
              onChange={(v) => setFilterGeos(v ?? [])}
              options={geoOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount="responsive"
            />
          </Space>
          <Space align="center">
            <Typography.Text type="secondary">Провайдер:</Typography.Text>
            <Select
              mode="multiple"
              style={{ minWidth: 260 }}
              placeholder="Все провайдеры"
              allowClear
              showSearch
              value={filterProviderIds}
              onChange={(v) => setFilterProviderIds(v ?? [])}
              options={providerOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount="responsive"
            />
          </Space>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table<AnalyticsRow>
          rowKey="casino_id"
          size="small"
          loading={isLoading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          scroll={{ x: scrollX }}
          locale={{ emptyText: 'Нет данных. Измените фильтры или добавьте провайдеров в анкетах казино.' }}
          summary={() => {
            if ((resp?.providers ?? []).length === 0) return null;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row
                  style={{
                    background: token.colorFillQuaternary,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Table.Summary.Cell index={0} align="center">
                    <Typography.Text strong style={{ color: token.colorText }}>
                      На проектах
                    </Typography.Text>
                  </Table.Summary.Cell>
                  {(resp?.providers ?? []).map((p, i) => (
                    <Table.Summary.Cell key={p.id} index={i + 1} align="center">
                      <Typography.Text
                        strong={providerCounts[p.id] > 0}
                        type={providerCounts[p.id] === 0 ? 'secondary' : undefined}
                      >
                        {providerCounts[p.id] ?? 0}
                      </Typography.Text>
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </Space>
  );
}
