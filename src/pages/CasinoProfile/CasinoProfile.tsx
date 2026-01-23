import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Upload,
  Image,
  Pagination,
  // Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  UserOutlined,
  DeleteOutlined,
  PlusOutlined,
  PictureOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { ProfileSettingsTable } from '../../components/ProfileSettingsTable';
import { AccountsTable } from '../../components/AccountsTable';
import { useGetCasinoByIdQuery } from '../../store/api/casinoApi';
import {
  useGetCasinoProfileHistoryQuery,
  useGetCasinoProfileQuery,
  useUpdateCasinoProfileMutation,
  CasinoProfileItem,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import {
  useGetCasinoBonusesQuery,
  useCreateCasinoBonusMutation,
  useUpdateCasinoBonusMutation,
  useDeleteCasinoBonusMutation,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  useDeleteBonusImageMutation,
  CasinoBonus,
  BonusCategory,
  BonusKind,
  BonusType,
  CasinoBonusImage,
} from '../../store/api/casinoBonusApi';
import {
  useGetCasinoPaymentsQuery,
  useCreateCasinoPaymentMutation,
  useUpdateCasinoPaymentMutation,
  useDeleteCasinoPaymentMutation,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  useDeletePaymentImageMutation,
  CasinoPayment,
  CasinoPaymentImage,
} from '../../store/api/casinoPaymentApi';
import {
  useGetCasinoAccountsQuery,
  useCreateCasinoAccountMutation,
  useUpdateCasinoAccountMutation,
  useDeleteCasinoAccountMutation,
  CasinoAccount,
  CreateCasinoAccountDto,
} from '../../store/api/casinoAccountApi';
import {
  useGetSelectorsByCasinoQuery,
  useCreateSelectorMutation,
  useUpdateSelectorMutation,
  useDeleteSelectorMutation,
  useGetScreenshotsByCasinoQuery,
  useTakeScreenshotMutation,
  SlotSelector,
  SlotScreenshot,
} from '../../store/api/slotSelectorApi';
import { useGetUsersQuery } from '../../store/api/userApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../store/api/casinoCommentApi';
import {
  useGetBonusNamesQuery,
  useCreateBonusNameMutation,
  useGetPaymentTypesQuery,
  useCreatePaymentTypeMutation,
  useGetPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
} from '../../store/api/referenceApi';
import { useSelector } from 'react-redux';
import {
  useGetEmailsForCasinoByNameQuery,
  useMarkEmailAsReadMutation,
  Email,
} from '../../store/api/emailApi';
import dayjs from 'dayjs';

// Форматирование числа
const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return n;
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};

// Форматирование суммы с валютой
const fmtAmount = (value: any, currency?: string | null) => {
  if (value == null) return '—';
  const formatted = fmt(value);
  return currency ? `${formatted} ${currency}` : formatted;
};

function buildFieldInput(field: ProfileField) {
  switch (field.field_type) {
    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.label} />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} />;
    case 'boolean':
      return <Switch />;
    case 'url':
      return <Input placeholder="https://..." />;
    case 'date':
      return <Input placeholder="YYYY-MM-DD" />;
    case 'rating': {
      return (
        <Select
          options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: v }))}
          placeholder="1..5"
        />
      );
    }
    case 'select': {
      const opts = field.options_json?.options ?? [];
      return <Select options={opts} allowClear placeholder="Выберите..." />;
    }
    case 'multiselect': {
      const opts = field.options_json?.options ?? [];
      return <Select mode="multiple" options={opts} allowClear placeholder="Выберите..." />;
    }
    default:
      return <Input placeholder={field.label} />;
  }
}

function valuePropNameFor(field: ProfileField) {
  return field.field_type === 'boolean' ? 'checked' : 'value';
}

function serializeValue(field: ProfileField, v: any) {
  if (field.field_type === 'boolean') return !!v;
  return v;
}

export default function CasinoProfile() {
  const { id } = useParams();
  const casinoId = Number(id);
  const nav = useNavigate();

  const { data: casino, isLoading: casinoLoading } = useGetCasinoByIdQuery(casinoId);
  const { data: profileResp, isLoading: profileLoading } = useGetCasinoProfileQuery(casinoId, {
    skip: !casinoId,
  } as any);
  useGetCasinoProfileHistoryQuery(
    { casinoId, limit: 200 },
    { skip: !casinoId } as any
  );
  const [updateProfile, { isLoading: saving }] = useUpdateCasinoProfileMutation();
  const [form] = Form.useForm();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();

  // Reference data
  const { data: bonusNames } = useGetBonusNamesQuery();
  const [createBonusName] = useCreateBonusNameMutation();
  const { data: paymentTypes } = useGetPaymentTypesQuery();
  const [createPaymentType] = useCreatePaymentTypeMutation();
  const { data: paymentMethods } = useGetPaymentMethodsQuery();
  const [createPaymentMethod] = useCreatePaymentMethodMutation();

  // Bonuses (per GEO)
  const { data: bonuses, isLoading: bonusesLoading } = useGetCasinoBonusesQuery(
    { casinoId },
    { skip: !casinoId } as any
  );
  const [createBonus] = useCreateCasinoBonusMutation();
  const [updateBonus] = useUpdateCasinoBonusMutation();
  const [deleteBonus] = useDeleteCasinoBonusMutation();
  const [activeGeo, setActiveGeo] = useState<string | undefined>(undefined);
  const [imagesPage, setImagesPage] = useState(1);
  const IMAGES_PAGE_SIZE = 12;
  const [bonusDrawerOpen, setBonusDrawerOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<CasinoBonus | null>(null);
  const [bonusForm] = Form.useForm();
  const [bonusCategory, setBonusCategory] = useState<BonusCategory>('casino');
  const [selectedBonusKind, setSelectedBonusKind] = useState<BonusKind | undefined>(undefined);
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | undefined>(undefined);
  const [pendingBonusImages, setPendingBonusImages] = useState<File[]>([]);

  // Bonus images (when editing existing бонуса)
  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: editingBonus?.id ?? 0 },
    { skip: !editingBonus?.id || !casinoId }
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();
  const [deleteBonusImage] = useDeleteBonusImageMutation();


  // Payments (per GEO)
  const { data: payments, isLoading: paymentsLoading } = useGetCasinoPaymentsQuery(
    { casinoId },
    { skip: !casinoId } as any
  );
  const [createPayment] = useCreateCasinoPaymentMutation();
  const [updatePayment] = useUpdateCasinoPaymentMutation();
  const [deletePayment] = useDeleteCasinoPaymentMutation();
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CasinoPayment | null>(null);
  const [paymentForm] = Form.useForm();
  const [pendingPaymentImages, setPendingPaymentImages] = useState<File[]>([]);
  
  // Payment images
  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId, paymentId: editingPayment?.id ?? 0 },
    { skip: !editingPayment?.id || !casinoId }
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();
  const [deletePaymentImage] = useDeletePaymentImageMutation();

  // Slot Selectors & Screenshots
  const { data: selectors = [] } = useGetSelectorsByCasinoQuery(casinoId, {
    skip: !casinoId,
  });
  const { data: screenshots = [], isLoading: screenshotsLoading } = useGetScreenshotsByCasinoQuery(casinoId, {
    skip: !casinoId,
  });
  const [createSelector] = useCreateSelectorMutation();
  const [updateSelector] = useUpdateSelectorMutation();
  const [deleteSelector] = useDeleteSelectorMutation();
  const [takeScreenshot, { isLoading: takingScreenshot }] = useTakeScreenshotMutation();
  
  const [selectorDrawerOpen, setSelectorDrawerOpen] = useState(false);
  const [editingSelector, setEditingSelector] = useState<SlotSelector | null>(null);
  const [selectorForm] = Form.useForm();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Accounts
  const { data: accounts, isLoading: accountsLoading } = useGetCasinoAccountsQuery(casinoId, {
    skip: !casinoId,
  });
  const [createAccount] = useCreateCasinoAccountMutation();
  const [updateAccount] = useUpdateCasinoAccountMutation();
  const [deleteAccount] = useDeleteCasinoAccountMutation();
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CasinoAccount | null>(null);
  const [accountForm] = Form.useForm();
  const { data: users = [] } = useGetUsersQuery();

  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );

  const bonusNameOptions = useMemo(
    () => (bonusNames ?? []).map((b) => ({ value: b.name, label: b.name })),
    [bonusNames]
  );

  const paymentTypeOptions = useMemo(
    () => (paymentTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [paymentTypes]
  );

  const paymentMethodOptions = useMemo(
    () => (paymentMethods ?? []).map((m) => ({ value: m.name, label: m.name })),
    [paymentMethods]
  );

  // const accountGeos = useMemo(
  //   () => Array.from(new Set((accounts ?? []).map((a) => a.geo).filter(Boolean))) as string[],
  //   [accounts]
  // );

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` })),
    [users]
  );

  // Emails for this casino (auto-matched by from_name ~ casino name)
  const PAGE_SIZE = 20;
  const [emailPage, setEmailPage] = useState(1);
  const {
    data: emailResp,
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useGetEmailsForCasinoByNameQuery(
    {
      casinoId,
      limit: PAGE_SIZE,
      offset: (emailPage - 1) * PAGE_SIZE,
    },
    { skip: !casinoId } as any
  );
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Comments
  const { data: comments, isLoading: commentsLoading } = useGetCasinoCommentsQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const { data: images = [] } = useGetCasinoImagesQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadCommentImageMutation();
  const [newComment, setNewComment] = useState('');
  const currentUser = useSelector((state: any) => state.auth.user);

  const imagesByCommentId = useMemo(() => {
    const map = new Map<number, CasinoCommentImage[]>();
    for (const img of images) {
      if (!img.comment_id) continue;
      const arr = map.get(img.comment_id) ?? [];
      arr.push(img);
      map.set(img.comment_id, arr);
    }
    return map;
  }, [images]);

  // Пагинация изображений
  const paginatedImages = useMemo(() => {
    const start = (imagesPage - 1) * IMAGES_PAGE_SIZE;
    const end = start + IMAGES_PAGE_SIZE;
    return images.slice(start, end);
  }, [images, imagesPage]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const createdComment = await createComment({ casinoId, data: { text: newComment } }).unwrap();
      setNewComment('');
      message.success('Комментарий добавлен');
      
      // Если есть загруженное изображение, прикрепляем его к новому комментарию
      if (pendingImageFile) {
        try {
          await uploadImage({ casinoId, commentId: createdComment.id, file: pendingImageFile }).unwrap();
          setPendingImageFile(null);
          message.success('Изображение прикреплено');
        } catch {
          message.error('Не удалось прикрепить изображение');
        }
      }
    } catch {
      message.error('Не удалось добавить комментарий');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment({ id: commentId, casinoId }).unwrap();
      message.success('Комментарий удалён');
    } catch {
      message.error('Не удалось удалить комментарий');
    }
  };

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const handleUploadImage = async (commentId: number, file: File) => {
    try {
      await uploadImage({ casinoId, commentId, file }).unwrap();
      message.success('Изображение загружено');
    } catch (e: any) {
      message.error(e?.data?.error || 'Не удалось загрузить изображение');
      throw e;
    }
  };

  const items: CasinoProfileItem[] = profileResp?.profile ?? [];

  const initialValues = useMemo(() => {
    const v: any = {};
    for (const it of items) {
      v[`f_${it.field.id}`] = it.value;
      if (it.field.field_type === 'boolean') v[`f_${it.field.id}`] = !!it.value;
    }
    return v;
  }, [items]);

  if (!casinoId) return <Card>Неверный id казино</Card>;
  if (casinoLoading || profileLoading) return <Spin />;

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/casinos')} />
          <Space direction="vertical" size={0}>
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>
              {casino?.name}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {casino?.website || '—'}
            </Typography.Text>
          </Space>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={async () => {
            try {
              const values = await form.validateFields();
              const payloadItems = items.map((it) => ({
                field_id: it.field.id,
                value_json: serializeValue(it.field, values[`f_${it.field.id}`]),
              }));
              await updateProfile({ casinoId, items: payloadItems }).unwrap();
              message.success('Профиль сохранён');
              // Перенаправление на страницу просмотра
              nav(`/casinos/${casinoId}`);
            } catch (e: any) {
              if (e?.errorFields) return;
              message.error(e?.data?.error ?? 'Ошибка сохранения профиля');
            }
          }}
        >
          Сохранить
        </Button>
      </div>

      <Card>
        <Form form={form} layout="vertical" initialValues={initialValues} key={casinoId}>
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Typography.Title level={5} style={{ marginBottom: 16 }}>
                Общая информация
              </Typography.Title>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Название">{casino?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Сайт">
                  {casino?.website ? (
                    <a href={casino.website} target="_blank" rel="noreferrer">
                      {casino.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="GEO">
                  {casino?.geo && casino.geo.length > 0 ? (
                    <Space wrap size={[4, 4]}>
                      {casino.geo.map((g) => (
                        <Tag key={g}>{g}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Наш">
                  {casino?.is_our ? (
                    <Tag color="green">Да</Tag>
                  ) : (
                    <Tag>Нет</Tag>
                  )}
                </Descriptions.Item>
                {casino?.description && (
                  <Descriptions.Item label="Описание">
                    {casino.description}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {items.length > 0 && (
              <div>
                <Typography.Title level={5} style={{ margin: '24px 0 16px' }}>
                  Дополнительные поля
                </Typography.Title>
                <Descriptions
                  column={1}
                  bordered
                  size="small"
                  styles={{ label: { width: 200, minWidth: 200 }, content: { minWidth: 300 } }}
                >
                  {items.map((it) => (
                    <Descriptions.Item
                      key={it.field.id}
                      label={
                        <Space size={6}>
                          <Typography.Text>{it.field.label}</Typography.Text>
                          {it.field.description ? (
                            <Tooltip title={it.field.description}>
                              <InfoCircleOutlined style={{ fontSize: 12 }} />
                            </Tooltip>
                          ) : null}
                          {it.field.is_required ? (
                            <Badge status="processing" text="required" />
                          ) : null}
                        </Space>
                      }
                    >
                      <Form.Item
                        name={`f_${it.field.id}`}
                        valuePropName={valuePropNameFor(it.field)}
                        rules={
                          it.field.is_required
                            ? [{ required: true, message: 'Обязательное поле' }]
                            : []
                        }
                        style={{ marginBottom: 0, maxWidth: 400 }}
                      >
                        {buildFieldInput(it.field)}
                      </Form.Item>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </div>
            )}
          </Space>
        </Form>
      </Card>

      {/* Галерея изображений */}
      <Card
        title={
          <Space>
            <PictureOutlined />
            <Typography.Title level={5} style={{ margin: 0 }}>
              Изображения ({images.length})
            </Typography.Title>
          </Space>
        }
      >
        {images.length === 0 ? (
          <Typography.Text type="secondary">Изображения ещё не загружены.</Typography.Text>
        ) : (
          <>
            <Image.PreviewGroup>
              <Space wrap size={[8, 8]}>
                {paginatedImages.map((img: CasinoCommentImage, index) => {
                  const globalIndex = (imagesPage - 1) * IMAGES_PAGE_SIZE + index;
                  return (
                    <div key={`${(img as any).entity_type || 'image'}-${img.id}-${globalIndex}`} style={{ width: 120, textAlign: 'center' }}>
                      <Image
                        src={img.url}
                        alt={img.original_name || ''}
                        style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
                      />
                      {(img.label || img.username) && (
                        <Typography.Text
                          type="secondary"
                          style={{ display: 'block', fontSize: 11, marginTop: 4 }}
                          ellipsis={{ tooltip: img.label || img.username }}
                        >
                          {img.label || img.username}
                        </Typography.Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            </Image.PreviewGroup>
            {images.length > IMAGES_PAGE_SIZE && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                  current={imagesPage}
                  total={images.length}
                  pageSize={IMAGES_PAGE_SIZE}
                  onChange={(page) => setImagesPage(page)}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Аккаунты */}
      <Card
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <Typography.Text strong>Аккаунты</Typography.Text>
            <Button
              type="primary"
              onClick={() => {
                setEditingAccount(null);
                accountForm.resetFields();
                if (activeGeo) accountForm.setFieldsValue({ geo: activeGeo });
                setAccountDrawerOpen(true);
              }}
            >
              Добавить аккаунт
            </Button>
          </div>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Select
            style={{ minWidth: 200 }}
            allowClear
            placeholder="Фильтр GEO"
            value={activeGeo}
            options={geoOptions}
            onChange={(val) => setActiveGeo(val)}
          />
        </Space>
        <AccountsTable
          accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
          isLoading={accountsLoading}
          onEdit={(account) => {
            setEditingAccount(account);
            accountForm.resetFields();
            accountForm.setFieldsValue({
              geo: account.geo,
              email: account.email || undefined,
              phone: account.phone || undefined,
              password: account.password,
              owner_id: account.owner_id || undefined,
            });
            setAccountDrawerOpen(true);
          }}
          onDelete={async (id) => {
            try {
              await deleteAccount(id).unwrap();
              message.success('Аккаунт удалён');
            } catch {
              message.error('Не удалось удалить аккаунт');
            }
          }}
          readOnly={false}
        />
      </Card>

      {/* Игры (Селекторы и скриншоты) */}
      <Card
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <Typography.Text strong>Скриншоты</Typography.Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingSelector(null);
                selectorForm.resetFields();
                if (activeGeo) selectorForm.setFieldsValue({ geo: activeGeo });
                if (casino?.website) selectorForm.setFieldsValue({ url: casino.website });
                setSelectorDrawerOpen(true);
              }}
            >
              Добавить селектор
            </Button>
          </div>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Select
            style={{ minWidth: 200 }}
            allowClear
            placeholder="Фильтр GEO"
            value={activeGeo}
            options={geoOptions}
            onChange={(val) => setActiveGeo(val)}
          />
        </Space>
        <Table<SlotScreenshot>
          rowKey="selector_id"
          size="small"
          loading={screenshotsLoading}
          dataSource={screenshots.filter((s) => (activeGeo ? s.geo === activeGeo : true))}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 80 },
            { 
              title: 'Раздел', 
              dataIndex: 'section', 
              width: 150,
              render: (v) => v || '—',
            },
            { 
              title: 'Категория', 
              dataIndex: 'category', 
              width: 150,
              render: (v) => v || '—',
            },
            {
              title: 'Скриншот',
              width: 150,
              render: (_, record) => {
                return (
                  record.screenshot_url ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setPreviewImage(record.screenshot_url || null)}
                    >
                      Раскрыть
                    </Button>
                  ) : (
                    <Typography.Text type="secondary">Нет скриншота</Typography.Text>
                  )
                );
              },
            },
            {
              title: 'Дата обновления',
              width: 180,
              render: (_, record) => (
                record.screenshot_created_at ? (
                  <Typography.Text>
                    {dayjs(record.screenshot_created_at).format('DD.MM.YYYY HH:mm')}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                )
              ),
            },
            {
              title: 'Действия',
              width: 150,
              align: 'right',
              render: (_, record) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    loading={takingScreenshot}
                    onClick={async () => {
                      try {
                        await takeScreenshot(record.selector_id).unwrap();
                        message.success('Скриншот обновлён');
                      } catch {
                        message.error('Не удалось сделать скриншот');
                      }
                    }}
                  >
                    Обновить
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      const selector = selectors.find((s) => s.id === record.selector_id);
                      if (selector) {
                        setEditingSelector(selector);
                        selectorForm.resetFields();
                        selectorForm.setFieldsValue({
                          geo: selector.geo,
                          section: selector.section,
                          category: selector.category || undefined,
                          selector: selector.selector,
                          url: selector.url || undefined,
                        });
                        setSelectorDrawerOpen(true);
                      }
                    }}
                  />
                  <Popconfirm
                    title="Удалить селектор?"
                    onConfirm={async () => {
                      try {
                        await deleteSelector(record.selector_id).unwrap();
                        message.success('Селектор удалён');
                      } catch {
                        message.error('Не удалось удалить селектор');
                      }
                    }}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Настройки профиля */}
      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Настройки профиля
          </Typography.Title>
        }
      >
        <ProfileSettingsTable casinoId={casinoId} activeGeo={activeGeo} onGeoChange={setActiveGeo} readOnly={false} />
      </Card>

      <Card
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <Typography.Text strong>Бонусы</Typography.Text>
            <Button
              type="primary"
              onClick={() => {
                setEditingBonus(null);
                bonusForm.resetFields();
                if (activeGeo) bonusForm.setFieldsValue({ geo: activeGeo });
                setBonusDrawerOpen(true);
              }}
            >
              Добавить бонус
            </Button>
          </div>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Select
            style={{ minWidth: 200 }}
            allowClear
            placeholder="Фильтр GEO"
            value={activeGeo}
            options={geoOptions}
            onChange={(val) => setActiveGeo(val)}
          />
        </Space>
        <Table<CasinoBonus>
          rowKey="id"
          size="small"
          loading={bonusesLoading}
          dataSource={(bonuses ?? []).filter((b) => (activeGeo ? b.geo === activeGeo : true))}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 60 },
            { title: 'Название', dataIndex: 'name', width: 160, ellipsis: true },
            {
              title: 'Категория',
              dataIndex: 'bonus_category',
              width: 80,
              render: (v) => {
                const labels: Record<string, string> = {
                  casino: 'Казино',
                  sport: 'Спорт',
                };
                return labels[v] || v || 'Казино';
              },
            },
            {
              title: 'Вид',
              dataIndex: 'bonus_kind',
              width: 90,
              render: (v: BonusKind) => {
                const labels: Record<string, string> = {
                  deposit: 'Депозит',
                  nodeposit: 'Бездеп',
                  cashback: 'Кешбек',
                  rakeback: 'Рейкбек',
                };
                return labels[v] || v || '—';
              },
            },
            {
              title: 'Тип',
              dataIndex: 'bonus_type',
              width: 90,
              render: (v: BonusType) => {
                const labels: Record<string, string> = {
                  cash: 'Кэш',
                  freespin: 'FS',
                  combo: 'Комбо',
                  freebet: 'Фрибет',
                  wagering: 'Вейджеринг',
                  insurance: 'Страховка',
                  accumulator: 'Аккумулятор',
                  odds_boost: 'Повышение коэф.',
                };
                return labels[v] || v || '—';
              },
            },
            {
              title: 'Бонус',
              width: 120,
              render: (_, b) => {
                const parts: string[] = [];
                if (b.bonus_value != null) {
                  if (b.bonus_unit === 'percent') {
                    parts.push(`${fmt(b.bonus_value)}%`);
                  } else {
                    parts.push(b.currency ? `${fmt(b.bonus_value)} ${b.currency}` : `${fmt(b.bonus_value)}`);
                  }
                }
                if (b.freespins_count) {
                  parts.push(`${fmt(b.freespins_count)} FS`);
                }
                if (b.cashback_percent) {
                  parts.push(`${fmt(b.cashback_percent)}%`);
                }
                return parts.length > 0 ? parts.join('+') : '—';
              },
            },
            {
              title: 'Мин.',
              width: 80,
              render: (_, b) => fmtAmount(b.min_deposit, b.currency),
            },
            {
              title: 'x',
              dataIndex: 'wagering_requirement',
              width: 50,
              render: (v) => {
                if (v == null) return '—';
                return `x${fmt(v)}`;
              },
            },
            {
              title: '',
              width: 140,
              align: 'right',
              render: (_, b) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingBonus(b);
                      setBonusCategory(b.bonus_category || 'casino');
                      setSelectedBonusKind(b.bonus_kind);
                      setSelectedBonusType(b.bonus_type);
                      bonusForm.setFieldsValue({
                        ...b,
                        geo: [b.geo],
                        name: b.name ? [b.name] : [],
                        bonus_category: b.bonus_category || 'casino',
                      });
                      setBonusDrawerOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      try {
                        await deleteBonus({ casinoId, id: b.id }).unwrap();
                        message.success('Бонус удалён');
                      } catch (e: any) {
                        message.error(e?.data?.error ?? 'Ошибка удаления');
                      }
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />

        <Drawer
          title={editingBonus ? 'Редактировать бонус' : 'Добавить бонус'}
          open={bonusDrawerOpen}
          onClose={() => {
            setBonusDrawerOpen(false);
            setBonusCategory('casino');
            setSelectedBonusKind(undefined);
            setSelectedBonusType(undefined);
            setEditingBonus(null);
            setPendingBonusImages([]);
          }}
          width={580}
          destroyOnClose
        >
          <Form
            layout="vertical"
            form={bonusForm}
            onFinish={async (values) => {
              try {
                // Для бонусов GEO и name - одно значение (не массив)
                const geoVal = Array.isArray(values.geo)
                  ? values.geo[values.geo.length - 1] || values.geo[0]
                  : values.geo;
                const nameVal = Array.isArray(values.name)
                  ? values.name[values.name.length - 1] || values.name[0]
                  : values.name;
                const payload = {
                  ...values,
                  geo: geoVal,
                  name: nameVal,
                  bonus_category: bonusCategory,
                };
                let savedBonus: CasinoBonus;
                if (editingBonus) {
                  savedBonus = await updateBonus({
                    casinoId,
                    id: editingBonus.id,
                    patch: payload,
                  }).unwrap();
                  message.success('Бонус обновлён');
                } else {
                  savedBonus = await createBonus({ casinoId, ...payload }).unwrap();
                  message.success('Бонус создан');
                }

                // Загрузка прикреплённых изображений (и при создании, и при редактировании)
                if (pendingBonusImages.length > 0 && savedBonus.id) {
                  try {
                    await uploadBonusImages({
                      casinoId,
                      bonusId: savedBonus.id,
                      files: pendingBonusImages,
                    }).unwrap();
                    message.success('Изображения бонуса загружены');
                  } catch (e: any) {
                    message.error(e?.data?.error ?? 'Ошибка загрузки изображений бонуса');
                  } finally {
                    setPendingBonusImages([]);
                  }
                }
                setBonusDrawerOpen(false);
                setSelectedBonusKind(undefined);
                setSelectedBonusType(undefined);
                setEditingBonus(null);
              } catch (e: any) {
                message.error(e?.data?.error ?? 'Ошибка сохранения бонуса');
              }
            }}
          >
            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Укажите GEO' }]}
            >
              <Select
                mode="tags"
                placeholder="Например: RU, DE, BR или выберите из списка"
                tokenSeparators={[',', ';', ' ']}
                options={geoOptions}
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
            <Form.Item
              name="name"
              label="Название бонуса"
              rules={[{ required: true }]}
            >
              <Select
                mode="tags"
                placeholder="Выберите или введите название"
                maxCount={1}
                options={bonusNameOptions}
                onChange={async (values: string[]) => {
                  if (!values || values.length === 0) return;
                  const existingNames = (bonusNames ?? []).map((b) => b.name);
                  const newNames = values.filter((v) => v && !existingNames.includes(v));
                  for (const name of newNames) {
                    try {
                      await createBonusName({ name }).unwrap();
                    } catch (e) {
                      console.error('Failed to create bonus name:', e);
                    }
                  }
                }}
              />
            </Form.Item>

            {/* Категория бонуса */}
            <Form.Item
              name="bonus_category"
              label="Категория"
              initialValue="casino"
              rules={[{ required: true, message: 'Выберите категорию' }]}
            >
              <Switch
                checked={bonusCategory === 'sport'}
                onChange={(checked) => {
                  const newCategory = checked ? 'sport' : 'casino';
                  setBonusCategory(newCategory);
                  bonusForm.setFieldsValue({ bonus_category: newCategory });
                  // Сброс вида и типа при смене категории
                  setSelectedBonusKind(undefined);
                  setSelectedBonusType(undefined);
                  bonusForm.setFieldsValue({ bonus_kind: undefined, bonus_type: undefined });
                }}
                checkedChildren="Спорт"
                unCheckedChildren="Казино"
              />
            </Form.Item>

            {/* Вид и Тип бонуса */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="bonus_kind"
                  label="Вид бонуса"
                  rules={[{ required: true, message: 'Выберите вид бонуса' }]}
                >
                  <Select
                    placeholder="Выберите вид"
                    onChange={(val: BonusKind) => setSelectedBonusKind(val)}
                    options={[
                      { value: 'deposit', label: 'Депозитный' },
                      { value: 'nodeposit', label: 'Бездепозитный' },
                      { value: 'cashback', label: 'Кешбек' },
                      { value: 'rakeback', label: 'Рейкбек' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="bonus_type"
                  label="Тип бонуса"
                  rules={[{ required: true, message: 'Выберите тип бонуса' }]}
                >
                  <Select
                    placeholder="Выберите тип"
                    onChange={(val: BonusType) => setSelectedBonusType(val)}
                    options={
                      bonusCategory === 'casino'
                        ? [
                            { value: 'cash', label: 'Кэш-бонус' },
                            { value: 'freespin', label: 'Фриспин-бонус' },
                            { value: 'combo', label: 'Комбинированный' },
                          ]
                        : [
                            { value: 'freebet', label: 'Фрибет' },
                            { value: 'wagering', label: 'Вейджеринг' },
                            { value: 'insurance', label: 'Страховка' },
                            { value: 'accumulator', label: 'Аккумулятор' },
                            { value: 'odds_boost', label: 'Повышение коэффициентов' },
                          ]
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Поля для Кешбека/Рейкбека */}
            {(selectedBonusKind === 'cashback' || selectedBonusKind === 'rakeback') && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры возврата">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="cashback_percent" label="Процент возврата">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        addonAfter="%"
                        placeholder="10"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="cashback_period" label="Период">
                      <Select
                        placeholder="Выберите период"
                        options={[
                          { value: 'daily', label: 'Ежедневно' },
                          { value: 'weekly', label: 'Еженедельно' },
                          { value: 'monthly', label: 'Ежемесячно' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Поля для Кэш-бонуса (казино) */}
            {bonusCategory === 'casino' && (selectedBonusType === 'cash' || selectedBonusType === 'combo') && (
              <Card size="small" style={{ marginBottom: 16 }} title="Кэш-бонус">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="bonus_value" label="Размер">
                      <InputNumber style={{ width: '100%' }} placeholder="100" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="bonus_unit" label="Единица">
                      <Select
                        placeholder="Тип"
                        options={[
                          { value: 'percent', label: '%' },
                          { value: 'amount', label: 'Фикс. сумма' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="max_bonus" label="Макс. бонус">
                  <InputNumber style={{ width: '100%' }} placeholder="5000" />
                </Form.Item>
              </Card>
            )}

            {/* Поля для Фриспин-бонуса (казино) */}
            {bonusCategory === 'casino' && (selectedBonusType === 'freespin' || selectedBonusType === 'combo') && (
              <Card size="small" style={{ marginBottom: 16 }} title="Фриспин-бонус">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="freespins_count" label="Кол-во фриспинов">
                      <InputNumber style={{ width: '100%' }} min={1} placeholder="100" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="freespin_value" label="Стоимость спина">
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0.10" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="freespin_game" label="Игра">
                      <Input placeholder="Book of Dead" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Поля для Вейджеринга (спорт) - аналогично казиношному бонусу */}
            {bonusCategory === 'sport' && selectedBonusType === 'wagering' && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры вейджеринга">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="bonus_value" label="Размер бонуса">
                      <InputNumber style={{ width: '100%' }} placeholder="100" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="bonus_unit" label="Единица">
                      <Select
                        placeholder="Тип"
                        options={[
                          { value: 'percent', label: '%' },
                          { value: 'amount', label: 'Фикс. сумма' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="min_deposit" label="Минимальный депозит">
                      <InputNumber style={{ width: '100%' }} placeholder="500" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="max_bonus" label="Макс. бонус">
                      <InputNumber style={{ width: '100%' }} placeholder="5000" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="wagering_requirement" label="Вейджер (x)">
                      <InputNumber style={{ width: '100%' }} placeholder="40" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="wagering_games" label="Условия отыгрыша">
                      <Input placeholder="Например: все виды спорта" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Поля для Фрибета (спорт) */}
            {bonusCategory === 'sport' && selectedBonusType === 'freebet' && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры фрибета">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="bonus_value" label="Сумма фрибета">
                      <InputNumber style={{ width: '100%' }} placeholder="100" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="min_deposit" label="Минимальный коэффициент">
                      <InputNumber style={{ width: '100%' }} placeholder="1.50" step={0.01} min={1} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="max_cashout" label="Макс. выигрыш">
                      <InputNumber style={{ width: '100%' }} placeholder="5000" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Поля для Страховки (спорт) */}
            {bonusCategory === 'sport' && selectedBonusType === 'insurance' && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры страховки">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="cashback_percent" label="Процент страховки">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        addonAfter="%"
                        placeholder="50"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="bonus_value" label="Максимальная сумма страховки">
                  <InputNumber style={{ width: '100%' }} placeholder="1000" />
                </Form.Item>
                <Form.Item name="wagering_games" label="Условия страховки">
                  <Input.TextArea rows={2} placeholder="Например: страховка при проигрыше ставки" />
                </Form.Item>
              </Card>
            )}

            {/* Поля для Аккумулятора (спорт) */}
            {bonusCategory === 'sport' && selectedBonusType === 'accumulator' && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры аккумулятора">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="freespins_count" label="Количество событий">
                      <InputNumber style={{ width: '100%' }} min={2} placeholder="3" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="bonus_value" label="Множитель бонуса">
                      <InputNumber style={{ width: '100%' }} placeholder="1.5" step={0.1} min={1} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="max_bonus" label="Макс. бонус">
                      <InputNumber style={{ width: '100%' }} placeholder="5000" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="wagering_games" label="Условия аккумулятора">
                  <Input.TextArea rows={2} placeholder="Например: все события должны выиграть" />
                </Form.Item>
              </Card>
            )}

            {/* Поля для Повышения коэффициентов (спорт) */}
            {bonusCategory === 'sport' && selectedBonusType === 'odds_boost' && (
              <Card size="small" style={{ marginBottom: 16 }} title="Параметры повышения коэффициентов">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="cashback_percent" label="Процент повышения">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        addonAfter="%"
                        placeholder="20"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="currency" label="Валюта">
                      <Input placeholder="EUR" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="bonus_value" label="Максимальная сумма ставки">
                  <InputNumber style={{ width: '100%' }} placeholder="1000" />
                </Form.Item>
                <Form.Item name="wagering_games" label="Условия повышения">
                  <Input.TextArea rows={2} placeholder="Например: повышение коэффициентов на все одиночные ставки" />
                </Form.Item>
              </Card>
            )}

            {/* Депозит (только для депозитных бонусов казино) */}
            {bonusCategory === 'casino' && selectedBonusKind === 'deposit' && (
              <Form.Item name="min_deposit" label="Минимальный депозит">
                <InputNumber style={{ width: '100%' }} placeholder="500" />
              </Form.Item>
            )}

            {/* Макс. выигрыш - коэффициент от суммы бонуса (для казино) */}
            {bonusCategory === 'casino' && (selectedBonusKind === 'nodeposit' || selectedBonusType) && (
              <Form.Item name="max_cashout" label="Макс. выигрыш (коэф. от бонуса)">
                <InputNumber style={{ width: '100%' }} placeholder="5" addonBefore="x" min={0} />
              </Form.Item>
            )}

            {/* Вейджер (только для казино, для спорта уже включен в карточку wagering) */}
            {bonusCategory === 'casino' && selectedBonusType && (
              <>
                <Form.Item name="wagering_requirement" label="Вейджер (x)">
                  <InputNumber style={{ width: '100%' }} placeholder="40" />
                </Form.Item>
                <Form.Item name="wagering_games" label="Игры для отыгрыша">
                  <Input placeholder="Например: только слоты, исключая джекпоты" />
                </Form.Item>
              </>
            )}

            <Form.Item name="notes" label="Заметки">
              <Input.TextArea rows={3} />
            </Form.Item>

            {/* Изображения бонуса (drag&drop, Ctrl+V, выбор файлов) */}
            <Card size="small" style={{ marginBottom: 16 }} title="Изображения бонуса">
              {/* Уже загруженные изображения (только для редактирования) */}
              {editingBonus && bonusImages && bonusImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]}>
                    {bonusImages.map((img: CasinoBonusImage) => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <Image
                          src={img.url}
                          alt={img.original_name || 'Bonus image'}
                          width={90}
                          height={90}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 2, right: 2 }}
                          onClick={async () => {
                            if (!editingBonus?.id) return;
                            try {
                              await deleteBonusImage({
                                casinoId,
                                bonusId: editingBonus.id,
                                imageId: img.id,
                              }).unwrap();
                              message.success('Изображение удалено');
                            } catch (e: any) {
                              message.error(e?.data?.error ?? 'Ошибка удаления изображения');
                            }
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}

              {/* Область для добавления новых изображений */}
              <div
                style={{
                  border: '2px dashed #d9d9d9',
                  borderRadius: 6,
                  padding: 12,
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginTop: 12,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/')
                  );
                  if (files.length > 0) {
                    setPendingBonusImages((prev) => [...prev, ...files]);
                    message.info('Изображения добавлены, сохранятся вместе с бонусом');
                  }
                }}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData.items || []);
                  const files: File[] = [];
                  for (const item of items) {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length > 0) {
                    setPendingBonusImages((prev) => [...prev, ...files]);
                    message.info('Изображения добавлены (Ctrl+V), сохранятся вместе с бонусом');
                  }
                }}
              >
                <PictureOutlined style={{ fontSize: 22, color: '#8c8c8c', marginBottom: 6 }} />
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Перетащите изображения, вставьте (Ctrl+V) или выберите файлы
                  </Typography.Text>
                </div>
                <Upload
                  multiple
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    setPendingBonusImages((prev) => [...prev, file]);
                    message.info('Изображение добавлено, сохранится вместе с бонусом');
                    return false;
                  }}
                >
                  <Button size="small" icon={<PictureOutlined />}>
                    Выбрать файлы
                  </Button>
                </Upload>
              </div>

              {/* Предпросмотр ещё не загруженных изображений */}
              {pendingBonusImages.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    К загрузке ({pendingBonusImages.length}):
                  </Typography.Text>
                  <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
                    {pendingBonusImages.map((file, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          width={70}
                          height={70}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 0, right: 0 }}
                          onClick={() => {
                            setPendingBonusImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Card>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit">
                {editingBonus ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={() => {
                setBonusDrawerOpen(false);
                setSelectedBonusKind(undefined);
                setSelectedBonusType(undefined);
                setEditingBonus(null);
                setPendingBonusImages([]);
              }}>
                Отмена
              </Button>
            </Space>
          </Form>
        </Drawer>
      </Card>

      {/* Платежные решения */}
      <Card
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <Typography.Text strong>Платёжные решения</Typography.Text>
            <Button
              type="primary"
              onClick={() => {
                setEditingPayment(null);
                paymentForm.resetFields();
                if (activeGeo) paymentForm.setFieldsValue({ geo: activeGeo });
                setPaymentDrawerOpen(true);
              }}
            >
              Добавить метод
            </Button>
          </div>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Select
            style={{ minWidth: 200 }}
            allowClear
            placeholder="Фильтр GEO"
            value={activeGeo}
            options={geoOptions}
            onChange={(val) => setActiveGeo(val)}
          />
        </Space>
        <Table<CasinoPayment>
          rowKey="id"
          size="small"
          loading={paymentsLoading}
          dataSource={(payments ?? []).filter((p) => (activeGeo ? p.geo === activeGeo : true))}
          pagination={false}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 60 },
            { title: 'Тип', dataIndex: 'type', width: 140 },
            { title: 'Метод', dataIndex: 'method', width: 140 },
            {
              title: 'Мин.',
              dataIndex: 'min_amount',
              width: 100,
              render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
            },
            {
              title: 'Макс.',
              dataIndex: 'max_amount',
              width: 100,
              render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
            },
            {
              title: '',
              width: 140,
              align: 'right',
              render: (_, p) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingPayment(p);
                      paymentForm.setFieldsValue({
                        ...p,
                        geo: [p.geo],
                        type: p.type ? [p.type] : [],
                        method: p.method ? [p.method] : [],
                      });
                      setPaymentDrawerOpen(true);
                    }}
                  >
                    Редактировать
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={async () => {
                      try {
                        await deletePayment({ casinoId, id: p.id }).unwrap();
                        message.success('Метод удалён');
                      } catch (e: any) {
                        message.error(e?.data?.error ?? 'Ошибка удаления');
                      }
                    }}
                  >
                    Удалить
                  </Button>
                </Space>
              ),
            },
          ]}
        />

        <Drawer
          title={editingPayment ? 'Редактировать платёжный метод' : 'Добавить платёжный метод'}
          open={paymentDrawerOpen}
          onClose={() => {
            setPaymentDrawerOpen(false);
            setEditingPayment(null);
            setPendingPaymentImages([]);
          }}
          width={520}
          destroyOnClose
        >
          <Form
            layout="vertical"
            form={paymentForm}
            onFinish={async (values) => {
              try {
                // Для платежей GEO, type, method - одно значение (не массив)
                const geoVal = Array.isArray(values.geo)
                  ? values.geo[values.geo.length - 1] || values.geo[0]
                  : values.geo;
                const typeVal = Array.isArray(values.type)
                  ? values.type[values.type.length - 1] || values.type[0]
                  : values.type;
                const methodVal = Array.isArray(values.method)
                  ? values.method[values.method.length - 1] || values.method[0]
                  : values.method;
                const payload = {
                  ...values,
                  geo: geoVal,
                  type: typeVal,
                  method: methodVal,
                };
                let savedPayment: CasinoPayment;
                if (editingPayment) {
                  savedPayment = await updatePayment({
                    casinoId,
                    id: editingPayment.id,
                    patch: payload,
                  }).unwrap();
                  message.success('Метод обновлён');
                } else {
                  savedPayment = await createPayment({ casinoId, ...payload }).unwrap();
                  message.success('Метод создан');
                }

                // Загрузка прикреплённых изображений
                if (pendingPaymentImages.length > 0 && savedPayment.id) {
                  try {
                    await uploadPaymentImages({
                      casinoId,
                      paymentId: savedPayment.id,
                      files: pendingPaymentImages,
                    }).unwrap();
                    message.success('Изображения платежа загружены');
                  } catch (e: any) {
                    message.error(e?.data?.error ?? 'Ошибка загрузки изображений платежа');
                  } finally {
                    setPendingPaymentImages([]);
                  }
                }

                setPaymentDrawerOpen(false);
                setEditingPayment(null);
              } catch (e: any) {
                message.error(e?.data?.error ?? 'Ошибка сохранения метода');
              }
            }}
          >
            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Укажите GEO' }]}
            >
              <Select
                mode="tags"
                placeholder="Например: RU, DE, BR или выберите из списка"
                tokenSeparators={[',', ';', ' ']}
                options={geoOptions}
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
            <Form.Item
              name="type"
              label="Тип"
              rules={[{ required: true, message: 'Укажите тип' }]}
            >
              <Select
                mode="tags"
                placeholder="Выберите или введите тип"
                maxCount={1}
                options={paymentTypeOptions}
                onChange={async (values: string[]) => {
                  if (!values || values.length === 0) return;
                  const existingTypes = (paymentTypes ?? []).map((t) => t.name);
                  const newTypes = values.filter((v) => v && !existingTypes.includes(v));
                  for (const name of newTypes) {
                    try {
                      await createPaymentType({ name }).unwrap();
                    } catch (e) {
                      console.error('Failed to create payment type:', e);
                    }
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="method"
              label="Метод"
              rules={[{ required: true, message: 'Укажите метод' }]}
            >
              <Select
                mode="tags"
                placeholder="Выберите или введите метод"
                maxCount={1}
                options={paymentMethodOptions}
                onChange={async (values: string[]) => {
                  if (!values || values.length === 0) return;
                  const existingMethods = (paymentMethods ?? []).map((m) => m.name);
                  const newMethods = values.filter((v) => v && !existingMethods.includes(v));
                  for (const name of newMethods) {
                    try {
                      await createPaymentMethod({ name }).unwrap();
                    } catch (e) {
                      console.error('Failed to create payment method:', e);
                    }
                  }
                }}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="min_amount" label="Мин. сумма">
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="max_amount" label="Макс. сумма">
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="currency" label="Валюта">
                  <Input placeholder="RUB" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Заметки">
              <Input.TextArea rows={3} />
            </Form.Item>

            {/* Изображения платежного метода (drag&drop, Ctrl+V, выбор файлов) */}
            <Card size="small" style={{ marginBottom: 16 }} title="Изображения платежного метода">
              {/* Уже загруженные изображения (при редактировании) */}
              {editingPayment && paymentImages && paymentImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]}>
                    {paymentImages.map((img: CasinoPaymentImage) => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <Image
                          src={img.url}
                          alt={img.original_name || 'Payment image'}
                          width={90}
                          height={90}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 2, right: 2 }}
                          onClick={async () => {
                            if (!editingPayment?.id) return;
                            try {
                              await deletePaymentImage({
                                casinoId,
                                paymentId: editingPayment.id,
                                imageId: img.id,
                              }).unwrap();
                              message.success('Изображение удалено');
                            } catch (e: any) {
                              message.error(e?.data?.error ?? 'Ошибка удаления изображения');
                            }
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}

              {/* Область для добавления новых изображений */}
              <div
                style={{
                  border: '2px dashed #d9d9d9',
                  borderRadius: 6,
                  padding: 12,
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginTop: 12,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/')
                  );
                  if (files.length > 0) {
                    setPendingPaymentImages((prev) => [...prev, ...files]);
                    message.info('Изображения добавлены, сохранятся вместе с методом');
                  }
                }}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData.items || []);
                  const files: File[] = [];
                  for (const item of items) {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length > 0) {
                    setPendingPaymentImages((prev) => [...prev, ...files]);
                    message.info('Изображения добавлены (Ctrl+V), сохранятся вместе с методом');
                  }
                }}
              >
                <PictureOutlined style={{ fontSize: 22, color: '#8c8c8c', marginBottom: 6 }} />
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Перетащите изображения, вставьте (Ctrl+V) или выберите файлы
                  </Typography.Text>
                </div>
                <Upload
                  multiple
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    setPendingPaymentImages((prev) => [...prev, file]);
                    message.info('Изображение добавлено, сохранится вместе с методом');
                    return false;
                  }}
                >
                  <Button size="small" icon={<PictureOutlined />}>
                    Выбрать файлы
                  </Button>
                </Upload>
              </div>

              {/* Предпросмотр ещё не загруженных изображений */}
              {pendingPaymentImages.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    К загрузке ({pendingPaymentImages.length}):
                  </Typography.Text>
                  <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
                    {pendingPaymentImages.map((file, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          width={70}
                          height={70}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 0, right: 0 }}
                          onClick={() => {
                            setPendingPaymentImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Card>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit">
                {editingPayment ? 'Сохранить' : 'Создать'}
              </Button>
              <Button
                onClick={() => {
                  setPaymentDrawerOpen(false);
                  setEditingPayment(null);
                  setPendingPaymentImages([]);
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form>
        </Drawer>
      </Card>

      {/* Drawer для аккаунтов */}
      <Drawer
        title={editingAccount ? 'Редактировать аккаунт' : 'Создать аккаунт'}
        open={accountDrawerOpen}
        onClose={() => {
          setAccountDrawerOpen(false);
          setEditingAccount(null);
          accountForm.resetFields();
        }}
        width={500}
        destroyOnClose
      >
        <Form
          form={accountForm}
          layout="vertical"
          onFinish={async (values: CreateCasinoAccountDto) => {
            try {
              if (editingAccount) {
                await updateAccount({ id: editingAccount.id, data: values }).unwrap();
                message.success('Аккаунт обновлён');
              } else {
                await createAccount({ casinoId, data: values }).unwrap();
                message.success('Аккаунт создан');
              }
              setAccountDrawerOpen(false);
              setEditingAccount(null);
              accountForm.resetFields();
            } catch (e: any) {
              message.error(e?.data?.error || 'Ошибка сохранения аккаунта');
            }
          }}
          initialValues={{
            geo: undefined,
            email: undefined,
            phone: undefined,
            password: '',
            owner_id: undefined,
          }}
        >
          <Form.Item
            name="geo"
            label="GEO"
            rules={[{ required: true, message: 'Выберите GEO' }]}
          >
            <Select placeholder="Выберите GEO" options={geoOptions} showSearch />
          </Form.Item>

          <Form.Item name="email" label="Почта">
            <Input placeholder="email@example.com" type="email" />
          </Form.Item>

          <Form.Item name="phone" label="Номер телефона">
            <Input placeholder="+1234567890" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password placeholder="Пароль" />
          </Form.Item>

          <Form.Item name="owner_id" label="Владелец аккаунта">
            <Select
              placeholder="Выберите владельца"
              options={userOptions}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingAccount ? 'Сохранить' : 'Создать'}
              </Button>
              <Button
                onClick={() => {
                  setAccountDrawerOpen(false);
                  setEditingAccount(null);
                  accountForm.resetFields();
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Card size="small" title="Почта">
        <List
          loading={emailsLoading}
          dataSource={emailResp?.data ?? []}
          renderItem={(email) => (
            <List.Item
              onClick={() => setSelectedEmail(email)}
              style={{ cursor: 'pointer' }}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <Typography.Text strong>
                      {email.from_name || email.from_email || 'Без отправителя'}
                    </Typography.Text>
                    {!email.is_read ? <Badge status="processing" text="Новое" /> : null}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2}>
                    <Typography.Text>{email.subject || '(Без темы)'}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {email.date_received
                        ? dayjs(email.date_received).format('YYYY-MM-DD HH:mm')
                        : '—'}
                    </Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          pagination={{
            current: emailPage,
            total: emailResp?.total ?? 0,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
            onChange: (page) => {
              setEmailPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          }}
        />

        {selectedEmail && (
          <Drawer
            open={!!selectedEmail}
            onClose={() => setSelectedEmail(null)}
            width={720}
            title={selectedEmail?.subject || '(Без темы)'}
            destroyOnClose
            extra={
              selectedEmail && !selectedEmail.is_read ? (
                <Button
                  onClick={async () => {
                    try {
                      await markAsRead(selectedEmail.id).unwrap();
                      message.success('Отмечено как прочитанное');
                      refetchEmails();
                    } catch {
                      message.error('Не удалось обновить статус');
                    }
                  }}
                >
                  Отметить прочитанным
                </Button>
              ) : null
            }
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="От">
                  {selectedEmail.from_name || ''} &lt;{selectedEmail.from_email}
                  &gt;
                </Descriptions.Item>
                <Descriptions.Item label="К">
                  {selectedEmail.to_email || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Дата">
                  {selectedEmail.date_received
                    ? dayjs(selectedEmail.date_received).format('YYYY-MM-DD HH:mm')
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
              <Card size="small" title="Текст письма">
                {selectedEmail.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {selectedEmail.body_text || 'Нет содержимого'}
                  </pre>
                )}
              </Card>
            </Space>
          </Drawer>
        )}
      </Card>

      {/* Комментарии */}
      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Комментарии ({comments?.length ?? 0})
          </Typography.Title>
        }
        loading={commentsLoading}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith('image/'));
                if (!file) return;
                setPendingImageFile(file);
                message.info('Изображение добавлено (drop). Отправьте комментарий для загрузки.');
              }}
            >
              <Input.TextArea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий... (можно перетащить картинку или вставить Ctrl+V)"
                rows={2}
                style={{ width: '100%' }}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData?.items || []);
                  const imgItem = items.find((it) => it.kind === 'file' && (it.type || '').startsWith('image/'));
                  const file = imgItem?.getAsFile();
                  if (!file) return;
                  setPendingImageFile(file);
                  message.info('Изображение добавлено (Ctrl+V). Отправьте комментарий для загрузки.');
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
              }}
            >
              <Space size={10}>
                <Upload
                  showUploadList={false}
                  accept="image/*"
                  beforeUpload={(file) => {
                    setPendingImageFile(file);
                    message.info('Изображение выбрано. Отправьте комментарий для загрузки.');
                    return false; // Предотвращаем автоматическую загрузку
                  }}
                >
                  <Button
                    type="default"
                    shape="circle"
                    size="middle"
                    icon={<PictureOutlined style={{ fontSize: 18 }} />}
                    style={{
                      width: 38,
                      height: 38,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Прикрепить изображение (или перетащите/вставьте Ctrl+V)"
                  />
                </Upload>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {pendingImageFile ? 'Фото выбрано — нажмите «Отправить»' : 'Фото: drag&drop / Ctrl+V / кнопка'}
                </Typography.Text>
              </Space>

              <Button
                type="primary"
                onClick={handleAddComment}
                loading={creatingComment || uploadingImage}
                disabled={!newComment.trim()}
                style={{ minWidth: 120 }}
              >
                Отправить
              </Button>
            </div>
          </div>
          {pendingImageFile && (
            <div
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px dashed rgba(148,163,184,0.6)',
                background: 'rgba(148,163,184,0.05)',
                maxWidth: 420,
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <PictureOutlined style={{ color: '#64748b' }} />
                  <Typography.Text style={{ fontSize: 12 }}>
                    {pendingImageFile.name}
                  </Typography.Text>
                </Space>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setPendingImageFile(null)}
                  style={{ paddingInline: 4, height: 20 }}
                >
                  Убрать
                </Button>
              </Space>
            </div>
          )}

          <List
            dataSource={comments ?? []}
            locale={{ emptyText: 'Нет комментариев' }}
            renderItem={(comment) => (
              <List.Item
                actions={
                  currentUser?.id === comment.user_id
                    ? [
                        <Upload
                          key="upload"
                          showUploadList={false}
                          accept="image/*"
                          customRequest={async (options) => {
                            const { file, onSuccess, onError } = options as any;
                            try {
                              await handleUploadImage(comment.id, file as File);
                              onSuccess && onSuccess({}, file);
                            } catch (e) {
                              onError && onError(e);
                            }
                          }}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            loading={uploadingImage}
                          >
                            Картинка
                          </Button>
                        </Upload>,
                        <Popconfirm
                          key="delete"
                          title="Удалить комментарий?"
                          onConfirm={() => handleDeleteComment(comment.id)}
                          okText="Да"
                          cancelText="Нет"
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <Typography.Text strong>{comment.username || 'Пользователь'}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(comment.created_at).format('DD.MM.YYYY HH:mm')}
                      </Typography.Text>
                    </Space>
                  }
                  description={
                    <div>
                      <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {comment.text}
                      </Typography.Paragraph>
                      {(() => {
                        const imgs = imagesByCommentId.get(comment.id) ?? [];
                        if (imgs.length === 0) return null;
                        return (
                          <div style={{ marginTop: 8 }}>
                            <Image.PreviewGroup>
                              <Space wrap size={[8, 8]}>
                                {imgs.map((img) => (
                                  <Image
                                    key={img.id}
                                    src={img.url}
                                    alt={img.original_name || ''}
                                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
                                  />
                                ))}
                              </Space>
                            </Image.PreviewGroup>
                          </div>
                        );
                      })()}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>

      {/* Drawer для создания/редактирования селектора */}
      <Drawer
        title={editingSelector ? 'Редактировать селектор' : 'Добавить селектор'}
        open={selectorDrawerOpen}
        onClose={() => {
          setSelectorDrawerOpen(false);
          setEditingSelector(null);
          selectorForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={selectorForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              if (editingSelector) {
                await updateSelector({ id: editingSelector.id, data: values }).unwrap();
                message.success('Селектор обновлён');
              } else {
                await createSelector({ casinoId, data: values }).unwrap();
                message.success('Селектор создан');
              }
              setSelectorDrawerOpen(false);
              setEditingSelector(null);
              selectorForm.resetFields();
            } catch (error: any) {
              message.error(error?.data?.error || 'Ошибка сохранения селектора');
            }
          }}
        >
          <Form.Item
            name="geo"
            label="GEO"
            rules={[{ required: true, message: 'Выберите GEO' }]}
          >
            <Select
              placeholder="Выберите GEO"
              options={geoOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="section"
            label="Раздел"
            rules={[{ required: true, message: 'Введите раздел' }]}
            tooltip="Название раздела (например: 'Популярные игры', 'Новые игры', 'Слоты')"
          >
            <Input placeholder="Например: Популярные игры" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Категория"
            tooltip="Название категории игр (необязательно, например: 'Слоты', 'Настольные игры', 'Живые игры')"
          >
            <Input placeholder="Например: Слоты (необязательно)" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL (относительный путь)"
            tooltip="Относительный путь страницы для скриншота (например: /bonuses, /slots, /games). Если не указан, будет использована главная страница казино"
          >
            <Input placeholder="/bonuses или /slots (необязательно)" />
          </Form.Item>
          <Form.Item
            name="selector"
            label="CSS Селектор"
            rules={[{ required: true, message: 'Введите селектор' }]}
            tooltip="CSS селектор элемента на странице, который нужно скриншотить (например: '.games-list', '#slots-container', '.game-grid')"
          >
            <Input.TextArea
              rows={3}
              placeholder="Например: .games-list, #slots-container, .game-grid"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSelector ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={() => {
                setSelectorDrawerOpen(false);
                setEditingSelector(null);
                selectorForm.resetFields();
              }}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {previewImage && (
        <Image
          style={{ display: 'none' }}
          src={previewImage}
          preview={{
            visible: true,
            onVisibleChange: (visible) => {
              if (!visible) {
                setPreviewImage(null);
              }
            },
          }}
        />
      )}

    </Space>
  );
}

