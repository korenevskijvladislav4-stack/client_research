import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useGetAllAccountsQuery, CasinoAccount } from '../../store/api/casinoAccountApi';
import { useGetCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetUsersQuery } from '../../store/api/userApi';

export default function Accounts() {
  const { data: casinos = [] } = useGetCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();
  const { data: users = [] } = useGetUsersQuery();

  const [filterCasino, setFilterCasino] = useState<number | undefined>(undefined);
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);
  const [filterOwner, setFilterOwner] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data: accounts = [], isLoading } = useGetAllAccountsQuery({
    casino_id: filterCasino,
    geo: filterGeo,
    owner_id: filterOwner,
    search: search || undefined,
  });

  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );
  const geoOptions = useMemo(
    () => geos.map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );
  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` })),
    [users]
  );

  return (
    <Card
      title={<Typography.Text strong>Аккаунты</Typography.Text>}
      extra={<Typography.Text type="secondary">{accounts.length} записей</Typography.Text>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Поиск (проект/почта/телефон/пароль/владелец)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />

        <Select
          style={{ minWidth: 220 }}
          allowClear
          showSearch
          placeholder="Проект (казино)"
          value={filterCasino}
          options={casinoOptions}
          onChange={(val) => setFilterCasino(val)}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />

        <Select
          style={{ minWidth: 180 }}
          allowClear
          showSearch
          placeholder="GEO"
          value={filterGeo}
          options={geoOptions}
          onChange={(val) => setFilterGeo(val)}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />

        <Select
          style={{ minWidth: 220 }}
          allowClear
          showSearch
          placeholder="Владелец"
          value={filterOwner}
          options={userOptions}
          onChange={(val) => setFilterOwner(val)}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />

        <Button
          onClick={() => {
            setSearch('');
            setFilterCasino(undefined);
            setFilterGeo(undefined);
            setFilterOwner(undefined);
          }}
        >
          Сбросить
        </Button>
      </Space>

      <Table<CasinoAccount>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={accounts}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Проект',
            dataIndex: 'casino_name',
            key: 'casino_name',
            width: 220,
            render: (v: string | null | undefined, r) => v || `#${r.casino_id}`,
          },
          { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 80 },
          {
            title: 'Почта',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            render: (email: string | null) =>
              email ? <Typography.Text copyable={{ text: email }}>{email}</Typography.Text> : '—',
          },
          {
            title: 'Телефон',
            dataIndex: 'phone',
            key: 'phone',
            width: 160,
            render: (phone: string | null) =>
              phone ? <Typography.Text copyable={{ text: phone }}>{phone}</Typography.Text> : '—',
          },
          {
            title: 'Пароль',
            dataIndex: 'password',
            key: 'password',
            width: 180,
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
            render: (v: string | null) => v || '—',
          },
          {
            title: 'Последнее изменение',
            dataIndex: 'last_modified_at',
            key: 'last_modified_at',
            width: 170,
            render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '—'),
          },
        ]}
      />
    </Card>
  );
}

