import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DescriptionsProps } from 'antd';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  LinkOutlined,
  PlusOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import {
  useCreateCasinoMutation,
  useDeleteCasinoMutation,
  useGetCasinosQuery,
  useUpdateCasinoMutation,
  Casino,
  CasinoFilters,
} from '../../store/api/casinoApi';
import { getApiErrorMessage } from '../../store/api/baseApi';
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
import { PageHeaderCard } from '../../components/PageHeaderCard';

const BASE_COLUMNS: ColumnConfig[] = [
  { key: 'name', title: 'Название' },
  { key: 'meta', title: 'Статус и «Наш»', default: true },
  { key: 'tags', title: 'Теги' },
  { key: 'geo', title: 'GEO' },
  { key: 'website', title: 'Сайт' },
  { key: 'description', title: 'Описание', default: false },
  { key: 'actions', title: 'Действия' },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Активный',
  inactive: 'Неактивный',
  pending: 'Ожидание',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
};

/** Группы в выпадающем списке (без сортировки по статусу) */
const CASINO_SORT_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  {
    label: 'Дата',
    options: [
      { value: 'created_at:desc', label: 'Добавлено · сначала новые' },
      { value: 'created_at:asc', label: 'Добавлено · сначала старые' },
      { value: 'updated_at:desc', label: 'Обновлено · сначала свежие' },
      { value: 'updated_at:asc', label: 'Обновлено · сначала старые' },
    ],
  },
  {
    label: 'Название',
    options: [
      { value: 'name:asc', label: 'По алфавиту А → Я' },
      { value: 'name:desc', label: 'По алфавиту Я → А' },
    ],
  },
  {
    label: 'ID записи',
    options: [
      { value: 'id:desc', label: 'От большего к меньшему' },
      { value: 'id:asc', label: 'От меньшего к большему' },
    ],
  },
];

const CASINO_SORT_VALUES = new Set(
  CASINO_SORT_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
);

type DescriptionItem = NonNullable<DescriptionsProps['items']>[number];

/** Как в предложениях ИИ / анкете казино */
function profileStyleFieldLabel(text: string) {
  return (
    <Typography.Text strong style={{ fontSize: 13, color: 'inherit' }}>
      {text}
    </Typography.Text>
  );
}

const casinoListDescriptionsStyles = {
  label: { width: 200, minWidth: 200 },
  content: { minWidth: 0 },
} as const;

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

function buildCasinoCardDescriptionItems(params: {
  record: Casino;
  tags: TagType[];
  isVisible: (key: string) => boolean;
  profileFields: ProfileField[] | undefined;
  allProfileValues: Record<number, Record<string, unknown>> | undefined;
}): DescriptionItem[] {
  const { record, tags, isVisible, profileFields, allProfileValues } = params;
  const items: DescriptionItem[] = [];

  if (isVisible('name')) {
    items.push({
      key: 'name',
      label: profileStyleFieldLabel('Название'),
      children: record.name || '—',
    });
  }

  if (isVisible('meta')) {
    items.push({
      key: 'status',
      label: profileStyleFieldLabel('Статус'),
      children: (
        <Tag color={STATUS_COLORS[record.status] ?? 'default'}>
          {STATUS_LABELS[record.status] ?? record.status}
        </Tag>
      ),
    });
    items.push({
      key: 'our',
      label: profileStyleFieldLabel('Наш'),
      children: record.is_our ? <Tag color="blue">Да</Tag> : <Tag>Нет</Tag>,
    });
  }

  if (isVisible('tags')) {
    items.push({
      key: 'tags',
      label: profileStyleFieldLabel('Теги'),
      children:
        tags.length === 0 ? (
          '—'
        ) : (
          <Space wrap size={[4, 4]}>
            {tags.map((t) => (
              <Tag key={t.id} color={t.color} style={{ margin: 0 }}>
                {t.name}
              </Tag>
            ))}
          </Space>
        ),
    });
  }

  if (isVisible('geo')) {
    items.push({
      key: 'geo',
      label: profileStyleFieldLabel('GEO'),
      children:
        record.geo && record.geo.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {record.geo.map((g) => (
              <Tag key={g} style={{ margin: 0 }}>
                {g}
              </Tag>
            ))}
          </Space>
        ) : (
          '—'
        ),
    });
  }

  if (isVisible('website')) {
    items.push({
      key: 'website',
      label: profileStyleFieldLabel('Сайт'),
      children: record.website ? (
        <a href={record.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          {record.website.replace(/^https?:\/\//i, '')}
        </a>
      ) : (
        '—'
      ),
    });
  }

  if (isVisible('description')) {
    items.push({
      key: 'description',
      label: profileStyleFieldLabel('Описание'),
      children: record.description?.trim() ? record.description : '—',
    });
  }

  for (const field of profileFields ?? []) {
    if (!field.is_active || !isVisible(`field_${field.key_name}`)) continue;
    const casinoValues = allProfileValues?.[record.id];
    const value = casinoValues?.[field.key_name];
    items.push({
      key: field.key_name,
      label: profileStyleFieldLabel(field.label),
      children: renderFieldValue(field, value),
    });
  }

  return items;
}

export default function Casinos() {
  const nav = useNavigate();
  const { token } = theme.useToken();

  // Server-side table state
  const table = useServerTable<CasinoFilters>({
    defaultSortField: 'created_at',
    defaultSortOrder: 'desc',
  });

  const sortSelectValue = useMemo(() => {
    const v = `${table.sortField ?? 'created_at'}:${table.sortOrder ?? 'desc'}`;
    return CASINO_SORT_VALUES.has(v) ? v : 'created_at:desc';
  }, [table.sortField, table.sortOrder]);

  useEffect(() => {
    const v = `${table.sortField ?? ''}:${table.sortOrder ?? ''}`;
    if (!CASINO_SORT_VALUES.has(v)) {
      table.setSorting('created_at', 'desc');
      table.setPage(1);
    }
  }, [table.sortField, table.sortOrder, table.setSorting, table.setPage]);

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
      message.error(getApiErrorMessage(e, 'Ошибка сохранения казино'));
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title="Казино"
        description="Список казино. Нажмите на карточку, чтобы открыть профиль."
        actions={
          <>
            <ColumnSelector {...columnSettings} />
            <Button type="primary" onClick={showCreate}>
              Добавить казино
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
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

      {/* Карточки (как блоки анкеты) */}
      <Card size="small">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <Typography.Text type="secondary">
              {isLoading ? 'Загрузка…' : `Найдено: ${total}`}
            </Typography.Text>
            <Select
              value={sortSelectValue}
              options={CASINO_SORT_GROUPS}
              variant="filled"
              size="middle"
              popupMatchSelectWidth={false}
              placement="bottomRight"
              prefix={
                <SortAscendingOutlined
                  style={{ color: token.colorTextSecondary, fontSize: 15, marginInlineEnd: 2 }}
                />
              }
              style={{
                minWidth: 300,
                borderRadius: token.borderRadiusLG,
              }}
              styles={{
                popup: {
                  root: {
                    borderRadius: token.borderRadiusLG,
                    minWidth: 300,
                    padding: 4,
                  },
                },
              }}
              onChange={(v) => {
                const [field, order] = v.split(':') as [string, 'asc' | 'desc'];
                table.setSorting(field, order);
                table.setPage(1);
              }}
            />
          </div>

          <Spin spinning={isLoading}>
            {rows.length === 0 && !isLoading ? (
              <Empty description="Нет казино по заданным условиям" />
            ) : (
              <Row gutter={[18, 18]}>
                {rows.map((record) => {
                  const tags = allCasinoTags[record.id] ?? [];
                  const showName = columnSettings.isVisible('name');
                  const titleText = showName ? record.name : `Казино #${record.id}`;
                  const descItemsRaw = buildCasinoCardDescriptionItems({
                    record,
                    tags,
                    isVisible: columnSettings.isVisible,
                    profileFields,
                    allProfileValues,
                  });
                  const descItems = showName
                    ? descItemsRaw.filter((it) => it.key !== 'name')
                    : descItemsRaw;

                  return (
                    <Col key={record.id} xs={24} sm={12} lg={8} xl={6}>
                      <Card
                        hoverable
                        size="small"
                        onClick={() => nav(`/casinos/${record.id}`)}
                        title={
                          <Typography.Text
                            strong
                            ellipsis={{ tooltip: titleText }}
                            style={{
                              display: 'block',
                              maxWidth: columnSettings.isVisible('actions') ? 'calc(100% - 72px)' : '100%',
                              fontSize: 14,
                            }}
                          >
                            {titleText}
                          </Typography.Text>
                        }
                        extra={
                          columnSettings.isVisible('actions') ? (
                            <Space size={0} onClick={(e) => e.stopPropagation()}>
                              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => showEdit(record)} />
                              <Popconfirm
                                title="Удалить казино?"
                                description="Вы уверены, что хотите удалить это казино? Действие необратимо."
                                okText="Удалить"
                                cancelText="Отмена"
                                okButtonProps={{ danger: true }}
                                onConfirm={async () => {
                                  try {
                                    await deleteCasino(record.id).unwrap();
                                    message.success('Казино удалено');
                                  } catch (e: any) {
                                    message.error(getApiErrorMessage(e, 'Ошибка удаления'));
                                  }
                                }}
                              >
                                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          ) : undefined
                        }
                        styles={{
                          header: {
                            minHeight: 40,
                            padding: '8px 12px',
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          },
                          body: { padding: 0 },
                        }}
                        style={{
                          height: '100%',
                          cursor: 'pointer',
                          borderRadius: token.borderRadiusLG,
                          borderColor: token.colorBorderSecondary,
                        }}
                      >
                        {descItems.length > 0 ? (
                          <Descriptions
                            bordered
                            column={1}
                            size="small"
                            colon
                            styles={casinoListDescriptionsStyles}
                            items={descItems}
                          />
                        ) : (
                          <div style={{ padding: 12 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                              Все поля скрыты в настройках колонок — включите хотя бы одно, чтобы видеть данные здесь.
                            </Typography.Text>
                          </div>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Spin>

          {rows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <Pagination
                {...table.paginationConfig(total)}
                onChange={(p, ps) => {
                  table.setPage(p);
                  if (ps !== table.pageSize) {
                    table.setPageSize(ps);
                    table.setPage(1);
                  }
                }}
              />
            </div>
          )}
        </Space>

        {/* Drawer: создание / редактирование казино */}
        <Drawer
          open={open}
          onClose={() => { setOpen(false); setEditing(null); form.resetFields(); }}
          width={640}
          destroyOnClose
          styles={{
            body: { paddingTop: 16 },
            footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
          }}
          title={
            <Space align="start" size={14} style={{ paddingRight: 32 }}>
              <Avatar
                size={48}
                style={{
                  background: editing ? token.colorWarning : token.colorPrimary,
                  flexShrink: 0,
                }}
                icon={editing ? <EditOutlined /> : <PlusOutlined />}
              />
              <div style={{ minWidth: 0 }}>
                <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>
                  {editing ? 'Редактировать казино' : 'Новое казино'}
                </Typography.Title>
                <Typography.Paragraph
                  type="secondary"
                  style={{ margin: '6px 0 0', fontSize: 13, marginBottom: 0 }}
                >
                  {editing
                    ? 'Обновите данные карточки. Расширенный профиль, теги и бонусы — на странице казино.'
                    : 'Создайте запись: минимум название. Остальное можно добавить сразу или позже в профиле.'}
                </Typography.Paragraph>
              </div>
            </Space>
          }
          footer={
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" style={{ minWidth: 128 }} onClick={() => form.submit()}>
                {editing ? 'Сохранить' : 'Создать казино'}
              </Button>
            </Space>
          }
        >
          {editing ? (
            <Alert
              type="info"
              showIcon
              icon={<EditOutlined />}
              message="Редактирование"
              description={
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Изменения сохраняются в этой карточке. Чтобы настроить дополнительные поля профиля, скриншоты,
                  платежи и акции — откройте казино из списка.
                </Typography.Text>
              }
              style={{ marginBottom: 20 }}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Как заполнить форму"
              description={
                <div style={{ fontSize: 13 }}>
                  <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
                    Ниже — базовые поля для списка и карточек. После создания откройте профиль казино: там теги,
                    кастомные поля, бонусы, платежи и заметки.
                  </Typography.Paragraph>
                  <ul style={{ margin: 0, paddingLeft: 20, color: token.colorTextSecondary }}>
                    <li style={{ marginBottom: 6 }}>
                      <Typography.Text strong>Название</Typography.Text> — обязательно: бренд или рабочее имя, как в
                      списках.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      <Typography.Text strong>GEO</Typography.Text> — страны работы: выберите из списка или введите код
                      (например, <Typography.Text code>DE</Typography.Text>). Неизвестный код можно добавить — он
                      попадёт в справочник.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      <Typography.Text strong>Наш</Typography.Text> — отметьте, если казино «наше» для внутреннего
                      учёта и фильтров.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      <Typography.Text strong>Сайт</Typography.Text> — полный адрес с{' '}
                      <Typography.Text code>https://</Typography.Text> (необязательно, но удобно для перехода из
                      карточки).
                    </li>
                    <li>
                      <Typography.Text strong>Описание</Typography.Text> — кратко о бренде (до 500 символов), видно в
                      списках.
                    </li>
                  </ul>
                </div>
              }
              style={{ marginBottom: 20 }}
            />
          )}

          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
            <Card
              size="small"
              title={
                <Space size={8}>
                  <BankOutlined style={{ color: token.colorPrimary }} />
                  <span>Основные данные</span>
                </Space>
              }
              styles={{ body: { paddingBottom: 8 } }}
              style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            >
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Укажите название казино' }]}
                extra="Как казино будет отображаться в CRM и в карточках."
              >
                <Input size="large" placeholder="Например: SpinCity" allowClear />
              </Form.Item>

              <Form.Item
                name="geo"
                label="GEO (страны работы)"
                tooltip="Выберите страны, в которых работает казино"
                extra="Можно ввести код вручную — при сохранении новый GEO добавится в справочник."
              >
                <Select
                  mode="tags"
                  placeholder="Выберите или введите коды: RU, DE, BR…"
                  tokenSeparators={[',', ';', ' ']}
                  suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
                  options={(geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` }))}
                  onChange={async (values: string[]) => {
                    if (!values || values.length === 0) return;
                    const GEO_CODE_MAX = 10;
                    const geoCodes = (geos ?? []).map((g) => g.code);
                    const normalized = values.map((v) => v.toUpperCase().trim()).filter(Boolean);
                    const tooLong = normalized.filter((c) => c.length > GEO_CODE_MAX);
                    if (tooLong.length > 0) {
                      message.warning(
                        `Код GEO не длиннее ${GEO_CODE_MAX} символов (как в базе CRM): ${tooLong.join(', ')}`,
                      );
                    }
                    const newGeos = normalized.filter(
                      (v) => v.length <= GEO_CODE_MAX && !geoCodes.includes(v),
                    );
                    for (const code of newGeos) {
                      try {
                        await createGeo({ code, name: code }).unwrap();
                      } catch (e) {
                        message.error(getApiErrorMessage(e, 'Не удалось добавить GEO в справочник'));
                      }
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                name="is_our"
                label="Наше казино"
                valuePropName="checked"
                extra="Влияет на фильтр «Наш» в списке и на отчёты по «своим» брендам."
              >
                <Switch checkedChildren="Да" unCheckedChildren="Нет" />
              </Form.Item>
            </Card>

            <Card
              size="small"
              title={
                <Space size={8}>
                  <LinkOutlined style={{ color: token.colorPrimary }} />
                  <span>Сайт и описание</span>
                </Space>
              }
              styles={{ body: { paddingBottom: 4 } }}
              style={{ marginBottom: 8, borderColor: token.colorBorderSecondary }}
            >
              <Form.Item
                name="website"
                label="Сайт"
                rules={[{ type: 'url', message: 'Введите корректный URL (с https://)' }]}
                extra="Ссылка для быстрого перехода из карточки казино."
              >
                <Input
                  placeholder="https://example.com"
                  prefix={<LinkOutlined style={{ color: token.colorTextQuaternary }} />}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Описание"
                extra="Краткий текст для списков; подробности лучше вынести в профиль или заметки."
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Коротко: позиционирование, особенности бренда, важные факты…"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Card>
          </Form>
        </Drawer>
      </Card>
    </Space>
  );
}
