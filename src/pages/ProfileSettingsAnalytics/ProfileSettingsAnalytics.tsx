import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Tag, Tooltip, Typography, theme } from 'antd';
import { BarChartOutlined, CheckCircleFilled } from '@ant-design/icons';
import {
  useGetSettingsFieldsQuery,
  useGetProfileContextsQuery,
  useGetAggregatedProfileSettingsQuery,
  AggregatedSettingCasino,
} from '../../store/api/profileSettingsApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { PageHeaderCard } from '../../components/PageHeaderCard';

const { Text } = Typography;

function parseCsvIds(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export default function ProfileSettingsAnalytics() {
  const { token } = theme.useToken();
  const [, setSearchParams] = useSearchParams();
  const urlInit = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const g = sp.get('geo')?.trim();
    return {
      selectedGeo: g || undefined,
      selectedCasinos: parseCsvIds(sp.get('casino_ids')),
    };
  }, []);

  const [selectedGeo, setSelectedGeo] = useState<string | undefined>(urlInit.selectedGeo);
  const [selectedCasinos, setSelectedCasinos] = useState<number[]>(urlInit.selectedCasinos);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (selectedGeo?.trim()) next.set('geo', selectedGeo.trim());
        else next.delete('geo');
        if (selectedCasinos.length > 0) next.set('casino_ids', selectedCasinos.join(','));
        else next.delete('casino_ids');
        return next;
      },
      { replace: true },
    );
  }, [selectedGeo, selectedCasinos, setSearchParams]);

  const { data: fields = [] } = useGetSettingsFieldsQuery();
  const { data: contexts = [] } = useGetProfileContextsQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: casinos = [] } = useGetAllCasinosQuery();

  const { data: aggregatedSettings = [], isLoading } = useGetAggregatedProfileSettingsQuery({
    geo: selectedGeo,
    casino_ids: selectedCasinos.length > 0 ? selectedCasinos : undefined,
  });

  // Filter only active fields and contexts, sorted
  const activeFields = useMemo(
    () => fields.filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const activeContexts = useMemo(
    () => contexts.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [contexts]
  );

  // Active GEOs
  const activeGeos = useMemo(
    () => geos.filter((g) => g.is_active),
    [geos]
  );

  // Build a map of (field_id, context_id) -> { casinos, count }
  const settingsMap = useMemo(() => {
    const map = new Map<string, { casinos: AggregatedSettingCasino[]; count: number }>();
    for (const s of aggregatedSettings) {
      map.set(`${s.field_id}_${s.context_id}`, { casinos: s.casinos, count: s.count });
    }
    return map;
  }, [aggregatedSettings]);

  const renderCell = (fieldId: number, contextId: number) => {
    const key = `${fieldId}_${contextId}`;
    const data = settingsMap.get(key);

    if (!data || data.count === 0) {
      return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
    }

    const tooltipContent = (
      <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
        <div style={{ 
          fontWeight: 600, 
          marginBottom: 12, 
          paddingBottom: 8,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <CheckCircleFilled style={{ color: token.colorSuccess }} />
          Казино: {data.count}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.casinos.map((casino) => (
            <div 
              key={`${casino.id}_${casino.geo}`} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12 
              }}
            >
              <span style={{ fontWeight: 500 }}>{casino.name}</span>
              <Tag 
                color="blue" 
                style={{ 
                  margin: 0, 
                  fontSize: 10, 
                  lineHeight: '16px',
                  padding: '0 4px'
                }}
              >
                {casino.geo}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    );

    // Color intensity based on count
    const getTagColor = (count: number) => {
      if (count >= 10) return 'green';
      if (count >= 5) return 'cyan';
      if (count >= 2) return 'blue';
      return 'default';
    };

    return (
      <Tooltip 
        title={tooltipContent} 
        placement="top" 
        overlayStyle={{ maxWidth: 350 }}
        overlayInnerStyle={{ padding: '12px 16px' }}
      >
        <Tag 
          color={getTagColor(data.count)}
          icon={<CheckCircleFilled />}
          style={{ 
            cursor: 'pointer',
            margin: 0,
            fontWeight: 500,
          }}
        >
          {data.count}
        </Tag>
      </Tooltip>
    );
  };

  // Build table data: each row is a field
  const dataSource = activeFields.map((field) => ({
    key: field.id,
    field_name: field.name,
    field_id: field.id,
  }));

  // Build columns: first column is field name, then one column per context
  const columns = [
    {
      title: 'Поле',
      dataIndex: 'field_name',
      key: 'field_name',
      fixed: 'left' as const,
      width: 250,
    },
    ...activeContexts.map((context) => ({
      title: context.name,
      key: `context_${context.id}`,
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => renderCell(record.field_id, context.id),
    })),
  ];

  // Casino options for Select
  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  const hasMatrix = activeFields.length > 0 && activeContexts.length > 0;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined />
            Аналитика настроек профиля
          </span>
        }
        description="Матрица: поля профиля × контексты (этапы). В ячейке — число казино с включённой настройкой; наведите для списка."
        actions={
          hasMatrix ? (
            <>
              <Tag style={{ padding: '2px 10px', fontSize: 13 }}>Полей: {activeFields.length}</Tag>
              <Tag color="blue" style={{ padding: '2px 10px', fontSize: 13 }}>
                Контекстов: {activeContexts.length}
              </Tag>
            </>
          ) : undefined
        }
      />

      <Card size="small">
        <Space wrap size={16}>
          <Space align="center">
            <Text type="secondary">GEO:</Text>
            <Space wrap size={8}>
              <Button
                size="small"
                type={!selectedGeo ? 'primary' : 'default'}
                onClick={() => setSelectedGeo(undefined)}
              >
                Все
              </Button>
              {activeGeos.map((g) => (
                <Button
                  key={g.code}
                  size="small"
                  type={selectedGeo === g.code ? 'primary' : 'default'}
                  onClick={() => setSelectedGeo(g.code)}
                >
                  {g.code}
                </Button>
              ))}
            </Space>
          </Space>
          <Space align="center">
            <Text type="secondary">Казино:</Text>
            <Select
              mode="multiple"
              allowClear
              placeholder="Все казино"
              value={selectedCasinos}
              onChange={setSelectedCasinos}
              options={casinoOptions}
              style={{ minWidth: 200, maxWidth: 320 }}
              maxTagCount="responsive"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
        </Space>
      </Card>

      {!hasMatrix ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: token.colorTextTertiary }}>
            Настройки профиля не настроены. Добавьте поля и контексты в разделе «Настройки профиля».
          </div>
        </Card>
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table
              dataSource={dataSource}
              columns={columns}
              pagination={false}
              size="small"
              bordered
              loading={isLoading}
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Card>
      )}
    </Space>
  );
}
