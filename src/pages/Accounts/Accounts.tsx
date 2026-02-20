import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useGetAllAccountsQuery, CasinoAccount } from '../../store/api/casinoAccountApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetUsersQuery } from '../../store/api/userApi';
import { useServerTable } from '../../hooks/useServerTable';
import { TransactionModal } from './TransactionModal';

interface AccountFilters {
  casino_id?: number;
  geo?: string;
  owner_id?: number;
}


export default function Accounts() {
  const [transactionAccount, setTransactionAccount] = useState<CasinoAccount | null>(null);
  const table = useServerTable<AccountFilters>({
    defaultPageSize: 20,
    defaultSortField: 'last_modified_at',
    defaultSortOrder: 'desc',
  });

  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: usersResp } = useGetUsersQuery({
    page: 1,
    pageSize: 100,
    sortField: 'username',
    sortOrder: 'asc',
  });
  const users = usersResp?.data ?? [];

  const { data: accountsResp, isLoading } = useGetAllAccountsQuery(table.params);
  const accounts = accountsResp?.data ?? [];
  const total = accountsResp?.pagination?.total ?? 0;

  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );
  const geoOptions = useMemo(
    () => geos.map((g) => ({ value: g.code, label: `${g.code} - ${g.name}` })),
    [geos]
  );
  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` })),
    [users]
  );

  return (
    <>
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <Space direction="vertical" size={0} style={{ flex: 1, minWidth: 200 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Аккаунты</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Аккаунты казино. Депозиты и выводы по каждому аккаунту. Всего: {total} записей.
          </Typography.Text>
        </Space>
        <Space wrap>
          <Link to="/accounts/transactions">
            <Button>История транзакций</Button>
          </Link>
        </Space>
      </div>

      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Input
            placeholder="Поиск (проект, почта, телефон, пароль, владелец)"
            prefix={<SearchOutlined />}
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            style={{ width: 320, minWidth: 260 }}
            allowClear
          />
          <Select
            style={{ minWidth: 220 }}
            allowClear
            showSearch
            placeholder="Проект (казино)"
            value={table.filters.casino_id}
            options={casinoOptions}
            onChange={(val) => table.updateFilter('casino_id', val)}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            style={{ minWidth: 180 }}
            allowClear
            showSearch
            placeholder="GEO"
            value={table.filters.geo}
            options={geoOptions}
            onChange={(val) => table.updateFilter('geo', val)}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            style={{ minWidth: 220 }}
            allowClear
            showSearch
            placeholder="Владелец"
            value={table.filters.owner_id}
            options={userOptions}
            onChange={(val) => table.updateFilter('owner_id', val)}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Button onClick={() => table.reset()}>Сбросить</Button>
        </Space>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
      <Table<CasinoAccount>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={accounts}
        pagination={table.paginationConfig(total)}
        onChange={table.handleTableChange}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Проект',
            dataIndex: 'casino_name',
            key: 'casino_name',
            width: 220,
            sorter: true,
            render: (v: string | null | undefined, r) => v || `#${r.casino_id}`,
          },
          { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 80, sorter: true },
          {
            title: 'Почта',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            sorter: true,
            render: (email: string | null) =>
              email ? <Typography.Text copyable={{ text: email }}>{email}</Typography.Text> : '-',
          },
          {
            title: 'Телефон',
            dataIndex: 'phone',
            key: 'phone',
            width: 160,
            sorter: true,
            render: (phone: string | null) =>
              phone ? <Typography.Text copyable={{ text: phone }}>{phone}</Typography.Text> : '-',
          },
          {
            title: 'Пароль',
            dataIndex: 'password',
            key: 'password',
            width: 180,
            sorter: true,
            render: (password: string) => (
              <Typography.Text copyable={{ text: password }} style={{ fontFamily: 'monospace' }}>
                {password}
              </Typography.Text>
            ),
          },
          {
            title: 'Депозиты',
            key: 'deposit_count',
            width: 100,
            align: 'right',
            render: (_: any, r: CasinoAccount) => r.deposit_count ?? 0,
          },
          {
            title: 'Выводы',
            key: 'withdrawal_count',
            width: 100,
            align: 'right',
            render: (_: any, r: CasinoAccount) => r.withdrawal_count ?? 0,
          },
          {
            title: 'Владелец',
            dataIndex: 'owner_username',
            key: 'owner_username',
            width: 160,
            sorter: true,
            render: (v: string | null) => v || '-',
          },
          {
            title: 'Последнее изменение',
            dataIndex: 'last_modified_at',
            key: 'last_modified_at',
            width: 170,
            sorter: true,
            render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
          },
          {
            title: '',
            key: 'tx',
            width: 100,
            render: (_: any, record: CasinoAccount) => (
              <Button type="link" size="small" onClick={() => setTransactionAccount(record)}>
                Деп / Вывод
              </Button>
            ),
          },
        ]}
      />
        </div>
      </Card>
    </Space>
    <TransactionModal
      open={!!transactionAccount}
      onClose={() => setTransactionAccount(null)}
      account={transactionAccount}
      onSuccess={() => setTransactionAccount(null)}
    />
    </>
  );
}
