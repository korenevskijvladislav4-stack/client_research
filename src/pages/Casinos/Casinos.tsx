import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useCreateCasinoMutation,
  useDeleteCasinoMutation,
  useGetCasinosQuery,
  useUpdateCasinoMutation,
  Casino,
} from '../../store/api/casinoApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import {
  useListProfileFieldsQuery,
  useGetAllProfileValuesQuery,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { ColumnSelector } from '../../components/ColumnSelector';

const BASE_COLUMNS: ColumnConfig[] = [
  { key: 'name', title: 'Название' },
  { key: 'geo', title: 'GEO' },
  { key: 'website', title: 'Сайт' },
  { key: 'description', title: 'Описание', default: false },
  { key: 'actions', title: 'Действия' },
];

// Рендер значения дополнительного поля
function renderFieldValue(field: ProfileField, value: any): React.ReactNode {
  if (value == null || value === '') return '—';

  switch (field.field_type) {
    case 'boolean':
      return <Badge status={value ? 'success' : 'default'} text={value ? 'Да' : 'Нет'} />;
    case 'rating':
      return <Typography.Text strong>{value}/10</Typography.Text>;
    case 'multiselect':
      return (
        <Space wrap size={[4, 4]}>
          {(Array.isArray(value) ? value : []).map((v: any) => (
            <Tag key={String(v)} style={{ margin: 0 }}>{String(v)}</Tag>
          ))}
        </Space>
      );
    case 'select':
      return <Tag>{String(value)}</Tag>;
    case 'url':
      return (
        <a href={String(value)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          {String(value).length > 30 ? String(value).slice(0, 30) + '...' : String(value)}
        </a>
      );
    default:
      const str = String(value);
      return str.length > 50 ? str.slice(0, 50) + '...' : str;
  }
}

export default function Casinos() {
  const nav = useNavigate();
  const { data, isLoading } = useGetCasinosQuery();
  const [createCasino] = useCreateCasinoMutation();
  const [updateCasino] = useUpdateCasinoMutation();
  const [deleteCasino] = useDeleteCasinoMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();
  
  // Дополнительные поля профиля
  const { data: profileFields } = useListProfileFieldsQuery();
  const { data: allProfileValues } = useGetAllProfileValuesQuery();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Casino | null>(null);
  const [form] = Form.useForm();

  // Формируем конфигурацию колонок с дополнительными полями
  const allColumnConfig = useMemo<ColumnConfig[]>(() => {
    const dynamicColumns: ColumnConfig[] = (profileFields ?? [])
      .filter((f) => f.is_active)
      .map((f) => ({
        key: `field_${f.key_name}`,
        title: f.label,
        default: false, // Дополнительные поля скрыты по умолчанию
      }));
    
    // Вставляем дополнительные поля перед "Действия"
    const actionsIndex = BASE_COLUMNS.findIndex((c) => c.key === 'actions');
    return [
      ...BASE_COLUMNS.slice(0, actionsIndex),
      ...dynamicColumns,
      ...BASE_COLUMNS.slice(actionsIndex),
    ];
  }, [profileFields]);

  const columnSettings = useColumnSettings('casinos', allColumnConfig);

  const rows = data ?? [];

  const title = useMemo(
    () => (
      <Space direction="vertical" size={0}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Казино
        </Typography.Title>
        <Typography.Text type="secondary">
          Список казино. Нажмите на строку, чтобы открыть профиль и оценки.
        </Typography.Text>
      </Space>
    ),
    []
  );

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const showEdit = (r: Casino) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({ ...r });
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        await updateCasino({ id: editing.id, data: values }).unwrap();
        message.success('Казино обновлено');
      } else {
        await createCasino(values).unwrap();
        message.success('Казино создано');
      }
      setOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения казино');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {title}
        <Space wrap>
          <ColumnSelector {...columnSettings} />
          <Button type="primary" onClick={showCreate}>
            Добавить казино
          </Button>
        </Space>
      </div>
      <Card>
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: true, responsive: true }}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => nav(`/casinos/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
          columnSettings.isVisible('name') && {
            title: 'Название',
            dataIndex: 'name',
            render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
          },
          columnSettings.isVisible('geo') && {
            title: 'GEO',
            dataIndex: 'geo',
            width: 200,
            render: (geo: string[]) =>
              geo && geo.length > 0 ? (
                <Space wrap size={[4, 4]}>
                  {geo.map((g) => (
                    <Tag key={g} style={{ margin: 0 }}>
                      {g}
                    </Tag>
                  ))}
                </Space>
              ) : (
                '—'
              ),
          },
          columnSettings.isVisible('website') && {
            title: 'Сайт',
            dataIndex: 'website',
            render: (v: string) =>
              v ? (
                <a
                  href={v}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {v}
                </a>
              ) : (
                '—'
              ),
          },
          columnSettings.isVisible('description') && {
            title: 'Описание',
            dataIndex: 'description',
            ellipsis: true,
            render: (v: string) => v || '—',
          },
          // Динамические колонки для дополнительных полей профиля
          ...(profileFields ?? [])
            .filter((f) => f.is_active && columnSettings.isVisible(`field_${f.key_name}`))
            .map((field) => ({
              title: field.label,
              key: `field_${field.key_name}`,
              width: field.field_type === 'boolean' ? 80 : field.field_type === 'rating' ? 70 : 150,
              ellipsis: true,
              render: (_: any, record: Casino) => {
                const casinoValues = allProfileValues?.[record.id];
                const value = casinoValues?.[field.key_name];
                return renderFieldValue(field, value);
              },
            })),
          columnSettings.isVisible('actions') && {
            title: 'Действия',
            width: 120,
            align: 'right',
            render: (_: any, r: Casino) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => showEdit(r)}
                />
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={async () => {
                    try {
                      await deleteCasino(r.id).unwrap();
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
        title={editing ? 'Редактировать казино' : 'Добавить казино'}
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        width={580}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название казино' }]}
          >
            <Input placeholder="Например: Casino X" />
          </Form.Item>

          <Form.Item
            name="geo"
            label="GEO (страны работы)"
            tooltip="Выберите страны, в которых работает казино"
          >
            <Select
              mode="tags"
              placeholder="Например: RU, DE, BR или выберите из списка"
              tokenSeparators={[',', ';', ' ']}
              options={(geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` }))}
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

          <Form.Item name="is_our" label="Наш" valuePropName="checked">
            <Switch checkedChildren="Да" unCheckedChildren="Нет" />
          </Form.Item>

          <Form.Item
            name="website"
            label="Website"
            rules={[
              {
                type: 'url',
                message: 'Введите корректный URL',
              },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea
              rows={4}
              placeholder="Короткое описание казино"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setOpen(false);
                setEditing(null);
                form.resetFields();
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit" style={{ minWidth: 120 }}>
                {editing ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
      </Card>
    </Space>
  );
}
