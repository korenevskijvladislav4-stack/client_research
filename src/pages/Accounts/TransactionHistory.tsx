import { Button, Card, DatePicker, Select, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useGetTransactionsQuery, AccountTransaction } from '../../store/api/casinoAccountApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useServerTable } from '../../hooks/useServerTable';
import { getApiBaseUrl } from '../../config/api';
import { useAppSelector } from '../../hooks/redux';

export default function TransactionHistory() {
  const table = useServerTable<{ casino_id?: number; account_id?: number; type?: 'deposit' | 'withdrawal'; date_from?: string; date_to?: string }>({
    defaultPageSize: 20,
    defaultSortField: 'transaction_date',
    defaultSortOrder: 'desc',
  });

  const { data: casinos = [] } = useGetAllCasinosQuery();
  const params = {
    page: table.params.page,
    pageSize: table.params.pageSize,
    casino_id: table.filters.casino_id,
    account_id: table.filters.account_id,
    type: table.filters.type,
    date_from: table.filters.date_from,
    date_to: table.filters.date_to,
  };
  const { data: resp, isLoading } = useGetTransactionsQuery(params);
  const transactions = resp?.data ?? [];
  const total = resp?.pagination?.total ?? 0;

  const casinoOptions = casinos.map((c) => ({ value: c.id, label: c.name }));
  const token = useAppSelector((s) => s.auth.token);

  const fmt = (n: number, cur?: string | null) =>
    cur ? `${Number(n).toLocaleString('ru-RU')} ${cur}` : Number(n).toLocaleString('ru-RU');

  const handleExport = () => {
    try {
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      const urlParams = new URLSearchParams();
      if (table.filters.casino_id != null) urlParams.set('casino_id', String(table.filters.casino_id));
      if (table.filters.account_id != null) urlParams.set('account_id', String(table.filters.account_id));
      if (table.filters.type) urlParams.set('type', table.filters.type);
      if (table.filters.date_from) urlParams.set('date_from', table.filters.date_from);
      if (table.filters.date_to) urlParams.set('date_to', table.filters.date_to);
      if (token) urlParams.set('token', token);
      const qs = urlParams.toString();
      const url = `${baseUrl}/accounts/transactions/export${qs ? `?${qs}` : ''}`;
      window.open(url, '_blank');
    } catch (e) {
      message.error('Не удалось выгрузить историю транзакций');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <Space direction="vertical" size={0} style={{ flex: 1, minWidth: 200 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>История транзакций</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Депозиты и выводы по аккаунтам. Экспорт в XLSX с учётом фильтров.
          </Typography.Text>
        </Space>
        <Space wrap>
          <Button type="primary" onClick={handleExport}>Выгрузить XLSX</Button>
        </Space>
      </div>

      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Select
            placeholder="Проект (казино)"
            allowClear
            style={{ minWidth: 200 }}
            value={table.filters.casino_id}
            options={casinoOptions}
            onChange={(v) => table.updateFilter('casino_id', v)}
            showSearch
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <Select
            placeholder="Тип"
            allowClear
            style={{ width: 140 }}
            value={table.filters.type}
            options={[
              { value: 'deposit', label: 'Депозит' },
              { value: 'withdrawal', label: 'Вывод' },
            ]}
            onChange={(v) => table.updateFilter('type', v)}
          />
          <DatePicker.RangePicker
            value={
              table.filters.date_from && table.filters.date_to
                ? [dayjs(table.filters.date_from), dayjs(table.filters.date_to)]
                : null
            }
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                table.updateFilter('date_from', dates[0].format('YYYY-MM-DD'));
                table.updateFilter('date_to', dates[1].format('YYYY-MM-DD'));
              } else {
                table.updateFilter('date_from', undefined);
                table.updateFilter('date_to', undefined);
              }
            }}
          />
          <Button onClick={() => table.reset()}>Сбросить</Button>
        </Space>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
      <Table<AccountTransaction>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={transactions}
        pagination={table.paginationConfig(total)}
        onChange={table.handleTableChange}
        scroll={{ x: 1000 }}
        tableLayout="fixed"
        columns={[
          {
            title: 'Дата',
            dataIndex: 'transaction_date',
            width: '14%',
            sorter: true,
            render: (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '—'),
          },
          {
            title: 'Проект',
            dataIndex: 'casino_name',
            width: '14%',
            ellipsis: true,
            render: (v: string) => v || '—',
          },
          { title: 'GEO', dataIndex: 'geo', width: '12%', ellipsis: true, render: (v: string) => v || '—' },
          {
            title: 'Аккаунт (email)',
            dataIndex: 'email',
            width: '16%',
            ellipsis: true,
            render: (v: string) => v || '—',
          },
          {
            title: 'Тип',
            dataIndex: 'type',
            width: '12%',
            render: (t: string) => (
              <Tag color={t === 'deposit' ? 'green' : 'orange'}>
                {t === 'deposit' ? 'Депозит' : 'Вывод'}
              </Tag>
            ),
          },
          {
            title: 'Сумма',
            width: '14%',
            render: (_, r) => fmt(r.amount, r.currency),
          },
          {
            title: 'Заметки',
            dataIndex: 'notes',
            width: '14%',
            ellipsis: true,
            render: (v: string) => v || '—',
          },
        ]}
      />
        </div>
      </Card>
    </Space>
  );
}
