import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, DatePicker, Progress, Select, Space, Table, Tag, Typography, theme } from 'antd';
import { DownloadOutlined, TagsOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useGetEmailTopicAnalyticsQuery, useGetRecipientsQuery } from '../../store/api/emailApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { PageHeaderCard } from '../../components/PageHeaderCard';

const { RangePicker } = DatePicker;
const { Text } = Typography;

function parseUrl() {
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const df = sp.get('date_from');
  const dt = sp.get('date_to');
  let range: [Dayjs, Dayjs] = [dayjs().subtract(29, 'day'), dayjs()];
  if (df && dt && dayjs(df).isValid() && dayjs(dt).isValid()) {
    range = [dayjs(df), dayjs(dt)];
  }
  return {
    range,
    toEmail: sp.get('to_email') || undefined,
    filterGeo: sp.get('geo') || undefined,
  };
}

const aiTargetLabel: Record<string, string> = {
  none: '—',
  bonus: 'Бонус',
  promo: 'Промо',
};

export default function EmailTopicsAnalytics() {
  const nav = useNavigate();
  const { token } = theme.useToken();
  const [, setSearchParams] = useSearchParams();
  const urlInit = useMemo(() => parseUrl(), []);

  const [range, setRange] = useState<[Dayjs, Dayjs]>(urlInit.range);
  const [toEmail, setToEmail] = useState<string | undefined>(urlInit.toEmail);
  const [filterGeo, setFilterGeo] = useState<string | undefined>(urlInit.filterGeo);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('date_from', range[0].format('YYYY-MM-DD'));
        next.set('date_to', range[1].format('YYYY-MM-DD'));
        if (toEmail?.trim()) next.set('to_email', toEmail.trim());
        else next.delete('to_email');
        if (filterGeo?.trim()) next.set('geo', filterGeo.trim());
        else next.delete('geo');
        return next;
      },
      { replace: true },
    );
  }, [range, toEmail, filterGeo, setSearchParams]);

  const dateFrom = range[0].format('YYYY-MM-DD');
  const dateTo = range[1].format('YYYY-MM-DD');

  const { data: resp, isLoading } = useGetEmailTopicAnalyticsQuery({
    date_from: dateFrom,
    date_to: dateTo,
    to_email: toEmail,
    geo: filterGeo,
  });

  const { data: accountEmails = [] } = useGetRecipientsQuery();
  const { data: geos = [] } = useGetGeosQuery();

  const emailOptions = useMemo(
    () => accountEmails.map((a) => ({ value: a.email, label: `${a.email} (${a.geo})` })),
    [accountEmails],
  );

  const geoOptions = useMemo(
    () => geos.filter((g) => g.is_active).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );

  const rows = resp?.data ?? [];
  const total = resp?.total ?? 0;

  const handleExportCsv = () => {
    const header = ['Тематика', 'ИИ-цель', 'Писем', 'Доля %'];
    const lines = rows.map((r) => {
      const pct = total > 0 ? ((100 * r.cnt) / total).toFixed(1) : '0';
      const ai = r.ai_target ? aiTargetLabel[r.ai_target] ?? r.ai_target : '';
      return [r.topic_name, ai, String(r.cnt), pct].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';');
    });
    const bom = '\uFEFF';
    const csv = bom + [header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `email_topics_analytics_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openEmailsFiltered = (topicId: number) => {
    const p = new URLSearchParams();
    p.set('date_from', dateFrom);
    p.set('date_to', dateTo);
    if (toEmail?.trim()) p.set('to_email', toEmail.trim());
    if (filterGeo?.trim()) p.set('geo', filterGeo.trim());
    p.set('topic_id', String(topicId));
    nav(`/emails?${p.toString()}`);
  };

  const columns = [
    {
      title: 'Тематика',
      dataIndex: 'topic_name',
      key: 'topic_name',
      width: 200,
      ellipsis: { showTitle: true },
      render: (name: string, r: (typeof rows)[0]) =>
        r.topic_id != null ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => openEmailsFiltered(r.topic_id!)}
          >
            {name}
          </Button>
        ) : (
          <Text type="secondary">{name}</Text>
        ),
    },
    {
      title: 'Тема',
      dataIndex: 'ai_target',
      key: 'ai_target',
      width: 110,
      render: (v: string | null) => {
        if (!v || v === 'none') return <Text type="secondary">—</Text>;
        const label = aiTargetLabel[v] ?? v;
        const color = v === 'bonus' ? 'blue' : v === 'promo' ? 'purple' : 'default';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Писем',
      dataIndex: 'cnt',
      key: 'cnt',
      width: 100,
      align: 'right' as const,
      sorter: (a: (typeof rows)[0], b: (typeof rows)[0]) => a.cnt - b.cnt,
    },
    {
      title: 'Доля',
      key: 'share',
      width: 200,
      render: (_: unknown, r: (typeof rows)[0]) => {
        const pct = total > 0 ? (100 * r.cnt) / total : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Progress
              percent={Number(pct.toFixed(1))}
              size="small"
              showInfo={false}
              strokeColor={token.colorPrimary}
              style={{ flex: 1, margin: 0, minWidth: 80 }}
            />
            <Text type="secondary" style={{ width: 44, textAlign: 'right', fontSize: 12 }}>
              {pct.toFixed(1)}%
            </Text>
          </div>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <TagsOutlined />
            Аналитика по тематикам писем
          </span>
        }
        description="Сколько писем отнесено к каждой тематике за период (по данным ИИ-классификации). Клик по названию — список писем с теми же фильтрами."
        actions={
          <>
            <Tag style={{ padding: '2px 10px', fontSize: 13 }}>Всего: {total}</Tag>
            <Tag color="blue" style={{ padding: '2px 10px', fontSize: 13 }}>
              Тем: {rows.length}
            </Tag>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={rows.length === 0}>
              CSV
            </Button>
          </>
        }
      />

      <Card size="small">
        <Space wrap size={16}>
          <Space>
            <Text type="secondary">Период:</Text>
            <RangePicker
              value={range}
              onChange={(vals) => {
                if (vals?.[0] && vals[1]) setRange([vals[0], vals[1]]);
              }}
              format="DD.MM.YYYY"
              allowClear={false}
              presets={[
                { label: '7 дней', value: [dayjs().subtract(6, 'day'), dayjs()] },
                { label: '30 дней', value: [dayjs().subtract(29, 'day'), dayjs()] },
                { label: '90 дней', value: [dayjs().subtract(89, 'day'), dayjs()] },
                { label: 'Этот месяц', value: [dayjs().startOf('month'), dayjs()] },
              ]}
            />
          </Space>
          <Space>
            <Text type="secondary">Получатель:</Text>
            <Select
              style={{ minWidth: 220 }}
              placeholder="Все ящики"
              allowClear
              showSearch
              value={toEmail}
              onChange={(v) => setToEmail(v || undefined)}
              options={emailOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
          <Space>
            <Text type="secondary">GEO:</Text>
            <Select
              style={{ minWidth: 160 }}
              placeholder="Все GEO"
              allowClear
              showSearch
              value={filterGeo}
              onChange={(v) => setFilterGeo(v || undefined)}
              options={geoOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey={(r) => String(r.topic_id ?? 'none')}
          size="small"
          tableLayout="fixed"
          loading={isLoading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          locale={{ emptyText: 'Нет писем за выбранный период' }}
        />
      </Card>
    </Space>
  );
}
