import { useMemo, useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  PromoCampaign,
  useCreatePromoMutation,
  useDeletePromoMutation,
  useGetPromosQuery,
  useUpdatePromoMutation,
  PromoFilters,
} from '../../store/api/promoApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { useServerTable } from '../../hooks/useServerTable';
import { ColumnSelector } from '../../components/ColumnSelector';

const statusColor: Record<string, string> = {
  active: 'green',
  upcoming: 'gold',
  expired: 'red',
};

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'title', title: 'Название' },
  { key: 'casino', title: 'Казино' },
  { key: 'promo_code', title: 'Промо код' },
  { key: 'bonus', title: 'Бонус' },
  { key: 'status', title: 'Статус' },
  { key: 'actions', title: 'Действия' },
];

export default function Promos() {
  // Server-side table state
  const table = useServerTable<PromoFilters>({
    defaultSortField: 'created_at',
    defaultSortOrder: 'desc',
  });

  // API queries
  const { data: response, isLoading } = useGetPromosQuery(table.params);
  const { data: casinos } = useGetAllCasinosQuery();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();
  const [createPromo] = useCreatePromoMutation();
  const [updatePromo] = useUpdatePromoMutation();
  const [deletePromo] = useDeletePromoMutation();
  const columnSettings = useColumnSettings('promos', COLUMN_CONFIG);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCampaign | null>(null);
  const [form] = Form.useForm();

  // Data from response
  const rows = response?.data ?? [];
  const total = response?.pagination?.total ?? 0;

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'upcoming' });
    setOpen(true);
  };

  const showEdit = (p: PromoCampaign) => {
    setEditing(p);
    form.resetFields();
    form.setFieldsValue({
      ...p,
      start_date: p.start_date ? String(p.start_date).split('T')[0] : undefined,
      end_date: p.end_date ? String(p.end_date).split('T')[0] : undefined,
    });
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    try {
      const payload = {
        ...values,
        casino_id: Number(values.casino_id),
        bonus_amount: values.bonus_amount ?? undefined,
        wagering_requirement: values.wagering_requirement ?? undefined,
      };
      if (editing) await updatePromo({ id: editing.id, data: payload }).unwrap();
      else await createPromo(payload).unwrap();
      message.success('Сохранено');
      setOpen(false);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>Промо кампании</Typography.Title>
        <Space wrap>
          <ColumnSelector {...columnSettings} />
          <Button type="primary" onClick={showCreate}>Добавить промо</Button>
        </Space>
      </div>

      {/* Filters */}
      <Card size="small">
        <Space wrap>
          <Input
            placeholder="Поиск..."
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
          <Select
            placeholder="Казино"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            value={table.filters.casino_id}
            onChange={(value) => table.updateFilter('casino_id', value)}
            options={casinoOptions}
          />
          <Select
            placeholder="Статус"
            allowClear
            style={{ width: 150 }}
            value={table.filters.status}
            onChange={(value) => table.updateFilter('status', value)}
            options={[
              { value: 'active', label: 'Активный' },
              { value: 'upcoming', label: 'Ожидание' },
              { value: 'expired', label: 'Истёкший' },
            ]}
          />
          {(table.search || table.filters.casino_id || table.filters.status) && (
            <Button onClick={table.reset}>Сбросить</Button>
          )}
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            pagination={table.paginationConfig(total)}
            onChange={table.handleTableChange}
            scroll={{ x: 'max-content' }}
            columns={[
              columnSettings.isVisible('title') && {
                title: 'Название',
                dataIndex: 'title',
                sorter: true,
                sortOrder: table.sortField === 'title' ? (table.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
              },
              columnSettings.isVisible('casino') && {
                title: 'Казино',
                dataIndex: 'casino_id',
                render: (id: number) => casinos?.find((c) => c.id === id)?.name ?? '—',
              },
              columnSettings.isVisible('promo_code') && {
                title: 'Промо код',
                dataIndex: 'promo_code',
                width: 140,
                render: (v: string) => v || '—',
              },
              columnSettings.isVisible('bonus') && {
                title: 'Бонус',
                render: (_: any, p: PromoCampaign) => (p.bonus_amount ? `${p.bonus_amount} ${p.bonus_type || ''}` : '—'),
              },
              columnSettings.isVisible('status') && {
                title: 'Статус',
                dataIndex: 'status',
                width: 120,
                sorter: true,
                sortOrder: table.sortField === 'status' ? (table.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
                render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>,
              },
              columnSettings.isVisible('actions') && {
                title: 'Действия',
                width: 120,
                align: 'right' as const,
                render: (_: any, p: PromoCampaign) => (
                  <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEdit(p)} />
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        try {
                          await deletePromo(p.id).unwrap();
                          message.success('Удалено');
                        } catch (e: any) {
                          message.error(e?.data?.error ?? 'Ошибка удаления');
                        }
                      }}
                    />
                  </Space>
                ),
              },
            ].filter(Boolean) as any}
          />
        </div>

        {/* Drawer */}
        <Drawer
          title={editing ? 'Редактировать промо' : 'Добавить промо'}
          open={open}
          onClose={() => setOpen(false)}
          width={520}
          destroyOnClose
        >
          <Form layout="vertical" form={form} onFinish={onFinish}>
            <Form.Item name="casino_id" label="Казино" rules={[{ required: true }]}>
              <Select options={casinoOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="title" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="geo" label="GEO">
              <Select
                mode="tags"
                placeholder="Например: RU, DE, BR"
                tokenSeparators={[',', ';', ' ']}
                options={geoOptions}
                allowClear
                onChange={async (values: string[]) => {
                  if (!values || values.length === 0) return;
                  const geoCodes = (geos ?? []).map((g) => g.code);
                  const newGeos = values.map((v) => v.toUpperCase().trim()).filter((v) => v && !geoCodes.includes(v));
                  for (const code of newGeos) {
                    try {
                      await createGeo({ code, name: code }).unwrap();
                    } catch (e) {
                      console.error('Failed to create geo:', e);
                    }
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="description" label="Описание">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Space style={{ width: '100%' }} align="start">
              <Form.Item name="start_date" label="Дата начала" style={{ flex: 1 }}>
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item name="end_date" label="Дата окончания" style={{ flex: 1 }}>
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Space>
            <Form.Item name="promo_code" label="Промо код">
              <Input />
            </Form.Item>
            <Space style={{ width: '100%' }} align="start">
              <Form.Item name="bonus_type" label="Тип бонуса" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item name="bonus_amount" label="Сумма" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Space>
            <Form.Item name="wagering_requirement" label="Вейджер">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="Статус" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'upcoming', label: 'Ожидание' },
                  { value: 'active', label: 'Активный' },
                  { value: 'expired', label: 'Истёкший' },
                ]}
              />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Сохранить</Button>
              <Button onClick={() => setOpen(false)}>Отмена</Button>
            </Space>
          </Form>
        </Drawer>
      </Card>
    </Space>
  );
}
