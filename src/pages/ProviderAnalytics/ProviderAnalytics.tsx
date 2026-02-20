import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Select, Space, Table, Typography } from 'antd';
import { CheckOutlined, ApiOutlined } from '@ant-design/icons';
import { useGetProviderAnalyticsQuery } from '../../store/api/casinoProviderApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetProvidersQuery } from '../../store/api/referenceApi';

interface AnalyticsRow {
  casino_id: number;
  casino_name: string;
  hasProvider: Record<number, boolean>;
}

export default function ProviderAnalytics() {
  const nav = useNavigate();
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);
  const [filterCasinoId, setFilterCasinoId] = useState<number | undefined>(undefined);
  const [filterProviderId, setFilterProviderId] = useState<number | undefined>(undefined);

  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: providersList = [] } = useGetProvidersQuery();
  const { data: resp, isLoading } = useGetProviderAnalyticsQuery({
    geo: filterGeo,
    casino_id: filterCasinoId,
    provider_id: filterProviderId,
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

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <Space direction="vertical" size={0}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <ApiOutlined style={{ marginRight: 8 }} />
            Аналитика по провайдерам
          </Typography.Title>
          <Typography.Text type="secondary">
            Строки — казино, столбцы — провайдеры. Галочка — подключено для выбранного GEO, прочерк — нет.
          </Typography.Text>
        </Space>
      </div>

      <Card size="small">
        <Space wrap size={16}>
          <Space>
            <Typography.Text type="secondary">Казино:</Typography.Text>
            <Select
              style={{ minWidth: 200 }}
              placeholder="Все казино"
              allowClear
              showSearch
              value={filterCasinoId}
              onChange={(v) => setFilterCasinoId(v ?? undefined)}
              options={casinoOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
          <Space>
            <Typography.Text type="secondary">GEO:</Typography.Text>
            <Select
              style={{ minWidth: 160 }}
              placeholder="Все GEO"
              allowClear
              showSearch
              value={filterGeo}
              onChange={(v) => setFilterGeo(v ?? undefined)}
              options={geoOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
          <Space>
            <Typography.Text type="secondary">Провайдер:</Typography.Text>
            <Select
              style={{ minWidth: 200 }}
              placeholder="Все провайдеры"
              allowClear
              showSearch
              value={filterProviderId}
              onChange={(v) => setFilterProviderId(v ?? undefined)}
              options={providerOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
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
        />
      </Card>
    </Space>
  );
}
