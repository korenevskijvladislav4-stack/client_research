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
import { EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  useCreateCasinoMutation,
  useDeleteCasinoMutation,
  useGetCasinosQuery,
  useUpdateCasinoMutation,
  Casino,
  CasinoFilters,
} from '../../store/api/casinoApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import { useGetTagsQuery, useGetAllCasinoTagsQuery, type Tag as TagType } from '../../store/api/tagApi';
import {
  useListProfileFieldsQuery,
  useGetAllProfileValuesQuery,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { useServerTable } from '../../hooks/useServerTable';
import { ColumnSelector } from '../../components/ColumnSelector';

const BASE_COLUMNS: ColumnConfig[] = [
  { key: 'name', title: 'Название' },
  { key: 'tags', title: 'Теги' },
  { key: 'geo', title: 'GEO' },
  { key: 'website', title: 'Сайт' },
  { key: 'description', title: 'Описание', default: false },
  { key: 'actions', title: 'Действия' },
];

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
  
  // Server-side table state
  const table = useServerTable<CasinoFilters>({
    defaultSortField: 'created_at',
    defaultSortOrder: 'desc',
  });

  // API queries
  const { data: response, isLoading } = useGetCasinosQuery(table.params);
  const [createCasino] = useCreateCasinoMutation();
  const [updateCasino] = useUpdateCasinoMutation();
  const [deleteCasino] = useDeleteCasinoMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();
  const { data: profileFields } = useListProfileFieldsQuery();
  const { data: allProfileValues } = useGetAllProfileValuesQuery();
  const { data: allTags = [] } = useGetTagsQuery();
  const { data: allCasinoTags = {} } = useGetAllCasinoTagsQuery();

  const [filterTag, setFilterTag] = useState<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Casino | null>(null);
  const [form] = Form.useForm();

  // Data from response (normalized by getCasinos transformResponse)
  const allRows = Array.isArray(response?.data) ? response.data : [];
  // Client-side tag filter
  const rows = useMemo(() => {
    if (!filterTag) return allRows;
    return allRows.filter((casino) => {
      const tags = allCasinoTags[casino.id];
      return tags && tags.some((t: TagType) => t.id === filterTag);
    });
  }, [allRows, filterTag, allCasinoTags]);
  const total = filterTag ? rows.length : (response?.pagination?.total ?? 0);

  // Column config with dynamic fields
  const allColumnConfig = useMemo<ColumnConfig[]>(() => {
    const dynamicColumns: ColumnConfig[] = (profileFields ?? [])
      .filter((f) => f.is_active)
      .map((f) => ({
        key: `field_${f.key_name}`,
        title: f.label,
        default: false,
      }));

    const actionsIndex = BASE_COLUMNS.findIndex((c) => c.key === 'actions');
    return [
      ...BASE_COLUMNS.slice(0, actionsIndex),
      ...dynamicColumns,
      ...BASE_COLUMNS.slice(actionsIndex),
    ];
  }, [profileFields]);

  const columnSettings = useColumnSettings('casinos', allColumnConfig);

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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <Space direction="vertical" size={0}>
          <Typography.Title level={4} style={{ margin: 0 }}>Казино</Typography.Title>
          <Typography.Text type="secondary">
            Список казино. Нажмите на строку, чтобы открыть профиль.
          </Typography.Text>
        </Space>
        <Space wrap>
          <ColumnSelector {...columnSettings} />
          <Button type="primary" onClick={showCreate}>Добавить казино</Button>
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
            placeholder="Статус"
            allowClear
            style={{ width: 150 }}
            value={table.filters.status}
            onChange={(value) => table.updateFilter('status', value)}
            options={[
              { value: 'active', label: 'Активный' },
              { value: 'inactive', label: 'Неактивный' },
              { value: 'pending', label: 'Ожидание' },
            ]}
          />
          <Select
            placeholder="Наш"
            allowClear
            style={{ width: 120 }}
            value={table.filters.is_our}
            onChange={(value) => table.updateFilter('is_our', value)}
            options={[
              { value: true, label: 'Да' },
              { value: false, label: 'Нет' },
            ]}
          />
          <Select
            placeholder="Тег"
            allowClear
            style={{ width: 160 }}
            value={filterTag}
            onChange={(value) => setFilterTag(value)}
            options={allTags.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
            optionRender={(option) => {
              const tag = allTags.find((t) => t.id === option.value);
              return (
                <Space>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: tag?.color || '#1677ff',
                    }}
                  />
                  {option.label}
                </Space>
              );
            }}
          />
          {(table.search || table.filters.status || table.filters.is_our !== undefined || filterTag) && (
            <Button onClick={() => { table.reset(); setFilterTag(undefined); }}>Сбросить</Button>
          )}
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading}
            dataSource={rows}
            pagination={table.paginationConfig(total)}
            onChange={table.handleTableChange}
            scroll={{ x: 'max-content' }}
            onRow={(record) => ({
              onClick: () => nav(`/casinos/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            columns={[
              columnSettings.isVisible('name') && {
                title: 'Название',
                dataIndex: 'name',
                sorter: true,
                sortOrder: table.sortField === 'name' ? (table.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
                render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
              },
              columnSettings.isVisible('tags') && {
                title: 'Теги',
                key: 'tags',
                width: 200,
                render: (_: any, record: Casino) => {
                  const tags = allCasinoTags[record.id] ?? [];
                  if (tags.length === 0) return '—';
                  return (
                    <Space wrap size={[4, 4]}>
                      {tags.map((t: TagType) => (
                        <Tag key={t.id} color={t.color} style={{ margin: 0 }}>{t.name}</Tag>
                      ))}
                    </Space>
                  );
                },
              },
              columnSettings.isVisible('geo') && {
                title: 'GEO',
                dataIndex: 'geo',
                width: 200,
                render: (geo: string[]) =>
                  geo && geo.length > 0 ? (
                    <Space wrap size={[4, 4]}>
                      {geo.map((g) => (
                        <Tag key={g} style={{ margin: 0 }}>{g}</Tag>
                      ))}
                    </Space>
                  ) : '—',
              },
              columnSettings.isVisible('website') && {
                title: 'Сайт',
                dataIndex: 'website',
                render: (v: string) =>
                  v ? (
                    <a href={v} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      {v}
                    </a>
                  ) : '—',
              },
              columnSettings.isVisible('description') && {
                title: 'Описание',
                dataIndex: 'description',
                ellipsis: true,
                render: (v: string) => v || '—',
              },
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
                align: 'right' as const,
                render: (_: any, r: Casino) => (
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEdit(r)} />
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

        {/* Drawer for create/edit */}
        <Drawer
          title={editing ? 'Редактировать казино' : 'Добавить казино'}
          open={open}
          onClose={() => { setOpen(false); setEditing(null); form.resetFields(); }}
          width={580}
          destroyOnClose
        >
          <Form layout="vertical" form={form} onFinish={onFinish}>
            <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название казино' }]}>
              <Input placeholder="Например: Casino X" />
            </Form.Item>

            <Form.Item name="geo" label="GEO (страны работы)" tooltip="Выберите страны, в которых работает казино">
              <Select
                mode="tags"
                placeholder="Например: RU, DE, BR"
                tokenSeparators={[',', ';', ' ']}
                options={(geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` }))}
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

            <Form.Item name="is_our" label="Наш" valuePropName="checked">
              <Switch checkedChildren="Да" unCheckedChildren="Нет" />
            </Form.Item>

            <Form.Item name="website" label="Website" rules={[{ type: 'url', message: 'Введите корректный URL' }]}>
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Form.Item name="description" label="Описание">
              <Input.TextArea rows={4} placeholder="Короткое описание казино" showCount maxLength={500} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>Отмена</Button>
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
