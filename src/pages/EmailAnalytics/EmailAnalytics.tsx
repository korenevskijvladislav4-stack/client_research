import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Select, Space, Table, Tag, Tooltip, Typography, message, theme } from 'antd';
import { DownloadOutlined, LinkOutlined, MailOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useGetEmailAnalyticsQuery, useGetRecipientsQuery, useRelinkEmailsMutation } from '../../store/api/emailApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { getApiBaseUrl } from '../../config/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CasinoRow {
  casino_id: number;
  casino_name: string;
  total: number;
  byDate: Record<string, number>; // "YYYY-MM-DD" -> count
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailAnalytics() {
  const nav = useNavigate();
  const { token: themeToken } = theme.useToken();

  // Default: last 30 days
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [toEmail, setToEmail] = useState<string | undefined>(undefined);
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);

  const dateFrom = range[0].format('YYYY-MM-DD');
  const dateTo = range[1].format('YYYY-MM-DD');

  const { data: accountEmails = [] } = useGetRecipientsQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: resp, isLoading, refetch } = useGetEmailAnalyticsQuery({
    date_from: dateFrom,
    date_to: dateTo,
    to_email: toEmail,
    geo: filterGeo,
  });

  const [relinkEmails, { isLoading: relinking }] = useRelinkEmailsMutation();

  const handleRelink = async (reset = false) => {
    try {
      const res = await relinkEmails({ reset }).unwrap();
      message.success(res.message);
      refetch();
    } catch {
      message.error('Ошибка привязки');
    }
  };

  // Unique emails from accounts
  const emailOptions = useMemo(
    () =>
      Array.from(new Map(accountEmails.map((a) => [a.email, a])).values()).map(
        (a) => ({ value: a.email, label: a.email }),
      ),
    [accountEmails],
  );

  const geoOptions = useMemo(
    () => geos.map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );

  const handleExport = useCallback(() => {
    const p = new URLSearchParams();
    p.set('date_from', dateFrom);
    p.set('date_to', dateTo);
    if (toEmail) p.set('to_email', toEmail);
    if (filterGeo) p.set('geo', filterGeo);

    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const token = localStorage.getItem('token') || '';
    p.set('token', token);

    window.open(`${baseUrl}/emails/export?${p.toString()}`, '_blank');
  }, [dateFrom, dateTo, toEmail, filterGeo]);

  // Build unique sorted dates and casino rows
  const { dates, rows, grandTotal } = useMemo(() => {
    const raw = resp?.data ?? [];
    const dateSet = new Set<string>();
    const casinoMap = new Map<number, CasinoRow>();

    for (const item of raw) {
      const dt = typeof item.dt === 'string'
        ? item.dt.slice(0, 10)
        : dayjs(item.dt).format('YYYY-MM-DD');
      const cnt = Number(item.cnt) || 0;
      dateSet.add(dt);

      let row = casinoMap.get(item.casino_id);
      if (!row) {
        row = {
          casino_id: item.casino_id,
          casino_name: item.casino_name || `Casino #${item.casino_id}`,
          total: 0,
          byDate: {},
        };
        casinoMap.set(item.casino_id, row);
      }
      row.byDate[dt] = (row.byDate[dt] ?? 0) + cnt;
      row.total += cnt;
    }

    const dates = Array.from(dateSet).sort();
    const rows = Array.from(casinoMap.values()).sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return { dates, rows, grandTotal };
  }, [resp]);

  // Column totals for footer
  const dateTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of dates) {
      totals[d] = rows.reduce((s, r) => s + (r.byDate[d] ?? 0), 0);
    }
    return totals;
  }, [dates, rows]);

  // Build antd columns
  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: 'Казино',
        dataIndex: 'casino_name',
        key: 'casino_name',
        fixed: 'left' as const,
        width: 180,
        render: (name: string, row: CasinoRow) => (
          <Typography.Link onClick={() => nav(`/casinos/${row.casino_id}`)}>
            {name}
          </Typography.Link>
        ),
      },
      {
        title: 'Всего',
        dataIndex: 'total',
        key: 'total',
        fixed: 'left' as const,
        width: 70,
        align: 'center' as const,
        sorter: (a: CasinoRow, b: CasinoRow) => a.total - b.total,
        defaultSortOrder: 'descend' as const,
        render: (v: number, row: CasinoRow) => (
          <Typography.Link
            strong
            onClick={() =>
              nav(`/emails?related_casino_id=${row.casino_id}&date_from=${dateFrom}&date_to=${dateTo}`)
            }
          >
            {v}
          </Typography.Link>
        ),
      },
    ];

    for (const dt of dates) {
      const d = dayjs(dt);
      const isWeekend = d.day() === 0 || d.day() === 6;
      const isToday = d.isSame(dayjs(), 'day');

      cols.push({
        title: (
          <Space direction="vertical" size={0} style={{ lineHeight: 1.2, textAlign: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>
              {d.format('dd')}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>
              {d.format('DD.MM')}
            </Text>
          </Space>
        ),
        key: dt,
        width: 56,
        align: 'center' as const,
        onHeaderCell: () => ({
          style: {
            backgroundColor: isToday
              ? themeToken.colorPrimaryBg
              : isWeekend
                ? themeToken.colorFillQuaternary
                : undefined,
            padding: '4px 2px',
          },
        }),
        onCell: () => ({
          style: {
            backgroundColor: isToday
              ? themeToken.colorPrimaryBg
              : isWeekend
                ? themeToken.colorFillQuaternary
                : undefined,
          },
        }),
        render: (_: unknown, row: CasinoRow) => {
          const count = row.byDate[dt] ?? 0;
          if (count === 0) return <Text type="secondary">—</Text>;
          return (
            <Typography.Link
              onClick={() =>
                nav(
                  `/emails?related_casino_id=${row.casino_id}&date_from=${dt}&date_to=${dt}`,
                )
              }
            >
              {count}
            </Typography.Link>
          );
        },
      });
    }

    return cols;
  }, [dates, nav, dateFrom, dateTo, themeToken]);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            <MailOutlined style={{ marginRight: 8 }} />
            Аналитика почты
          </Title>
          <Text type="secondary">
            Количество писем по казино и датам. Кликните на число для перехода к письмам.
          </Text>
        </Space>
        <Space>
          <Tag style={{ padding: '2px 10px', fontSize: 13 }}>
            Всего: {grandTotal}
          </Tag>
          <Tag color="blue" style={{ padding: '2px 10px', fontSize: 13 }}>
            Казино: {rows.length}
          </Tag>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Выгрузить XLSX
          </Button>
          <Tooltip title="Привязать только новые (непривязанные) письма к казино">
            <Button
              icon={<LinkOutlined />}
              loading={relinking}
              onClick={() => handleRelink(false)}
            >
              Привязать новые
            </Button>
          </Tooltip>
          <Tooltip title="Сбросить все привязки и пересканировать все письма заново">
            <Button
              icon={<LinkOutlined />}
              loading={relinking}
              onClick={() => handleRelink(true)}
            >
              Перепривязать все
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Filters */}
      <Card size="small">
        <Space wrap size={16}>
          <Space>
            <Text type="secondary">Период:</Text>
            <RangePicker
              value={range}
              onChange={(vals) => {
                if (vals && vals[0] && vals[1]) {
                  setRange([vals[0], vals[1]]);
                }
              }}
              format="DD.MM.YYYY"
              allowClear={false}
              presets={[
                { label: '7 дней', value: [dayjs().subtract(6, 'day'), dayjs()] },
                { label: '14 дней', value: [dayjs().subtract(13, 'day'), dayjs()] },
                { label: '30 дней', value: [dayjs().subtract(29, 'day'), dayjs()] },
                { label: '90 дней', value: [dayjs().subtract(89, 'day'), dayjs()] },
                { label: 'Этот месяц', value: [dayjs().startOf('month'), dayjs()] },
                { label: 'Прошлый месяц', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
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

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="casino_id"
          size="small"
          loading={isLoading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          scroll={{ x: 180 + 70 + dates.length * 56 }}
          locale={{ emptyText: 'Нет данных за выбранный период' }}
          summary={() => {
            if (rows.length === 0) return null;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Итого</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center">
                    <Text strong>{grandTotal}</Text>
                  </Table.Summary.Cell>
                  {dates.map((dt, i) => (
                    <Table.Summary.Cell key={dt} index={i + 2} align="center">
                      <Text strong={dateTotals[dt] > 0} type={dateTotals[dt] === 0 ? 'secondary' : undefined}>
                        {dateTotals[dt] || '—'}
                      </Text>
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
