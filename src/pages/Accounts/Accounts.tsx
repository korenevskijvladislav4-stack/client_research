import { useMemo } from 'react';
import { Button, Card, Input, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useGetAllAccountsQuery, CasinoAccount } from '../../store/api/casinoAccountApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetUsersQuery } from '../../store/api/userApi';
import { useServerTable } from '../../hooks/useServerTable';

interface AccountFilters {
  casino_id?: number;
  geo?: string;
  owner_id?: number;
}

export default function Accounts() {
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
    <Card
      title={<Typography.Text strong>Аккаунты</Typography.Text>}
      extra={<Typography.Text type="secondary">{total} записей</Typography.Text>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Поиск (проект/почта/телефон/пароль/владелец)"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          style={{ width: 320 }}
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
        ]}
      />
    </Card>
  );
}
