import { useMemo, useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  PromoCampaign,
  useCreatePromoMutation,
  useDeletePromoMutation,
  useGetPromosQuery,
  useUpdatePromoMutation,
} from '../../store/api/promoApi';
import { useGetCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
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
  const { data: promos, isLoading } = useGetPromosQuery();
  const { data: casinos } = useGetCasinosQuery();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();
  const [createPromo] = useCreatePromoMutation();
  const [updatePromo] = useUpdatePromoMutation();
  const [deletePromo] = useDeletePromoMutation();
  const columnSettings = useColumnSettings('promos', COLUMN_CONFIG);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCampaign | null>(null);
  const [form] = Form.useForm();

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>
          Промо кампании
        </Typography.Title>
        <Space wrap>
          <ColumnSelector {...columnSettings} />
          <Button type="primary" onClick={showCreate}>
            Добавить промо
          </Button>
        </Space>
      </div>
      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={promos ?? []}
            pagination={{ pageSize: 20, showSizeChanger: true, responsive: true }}
            scroll={{ x: 'max-content' }}
            columns={[
          columnSettings.isVisible('title') && { title: 'Название', dataIndex: 'title' },
          columnSettings.isVisible('casino') && {
            title: 'Казино',
            dataIndex: 'casino_id',
            render: (id: number) => casinos?.find((c) => c.id === id)?.name ?? '—',
          },
          columnSettings.isVisible('promo_code') && { 
            title: 'Промо код', 
            dataIndex: 'promo_code', 
            width: 140, 
            render: (v: string) => v || '—' 
          },
          columnSettings.isVisible('bonus') && {
            title: 'Бонус',
            render: (_: any, p: PromoCampaign) => (p.bonus_amount ? `${p.bonus_amount} ${p.bonus_type || ''}` : '—'),
          },
          columnSettings.isVisible('status') && {
            title: 'Статус',
            dataIndex: 'status',
            width: 120,
            render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>,
          },
          columnSettings.isVisible('actions') && {
            title: 'Действия',
            width: 120,
            align: 'right',
            render: (_: any, p: PromoCampaign) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => showEdit(p)}
                />
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

      <Drawer
        title={editing ? 'Редактировать промо' : 'Добавить промо'}
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item name="casino_id" label="Казино" rules={[{ required: true }]}>
            <Select options={casinoOptions} showSearch />
          </Form.Item>
          <Form.Item name="title" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="geo" label="GEO">
            <Select
              mode="tags"
              placeholder="Например: RU, DE, BR или выберите из списка"
              tokenSeparators={[',', ';', ' ']}
              options={geoOptions}
              allowClear
              onChange={async (values: string[]) => {
                if (!values || values.length === 0) return;
                const geoCodes = (geos ?? []).map((g) => g.code);
                const newGeos = values
                  .map((v) => v.toUpperCase().trim())
                  .filter((v) => v && !geoCodes.includes(v));
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
            <Select options={[{ value: 'upcoming' }, { value: 'active' }, { value: 'expired' }].map((o) => ({ value: o.value, label: o.value }))} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Сохранить
            </Button>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
          </Space>
        </Form>
      </Drawer>
      </Card>
    </Space>
  );
}
