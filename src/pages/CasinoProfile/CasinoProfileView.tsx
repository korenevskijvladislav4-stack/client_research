import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Divider,
  message,
  Upload,
  Image,
  Pagination,
} from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, EyeOutlined, UserOutlined, DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { ProfileSettingsTable } from '../../components/ProfileSettingsTable';
import { AccountsTable } from '../../components/AccountsTable';
import { useGetCasinoByIdQuery } from '../../store/api/casinoApi';
import {
  useGetCasinoProfileQuery,
  CasinoProfileItem,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import {
  useGetCasinoBonusesQuery,
  CasinoBonus,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  CasinoBonusImage,
} from '../../store/api/casinoBonusApi';
import {
  useGetCasinoPaymentsQuery,
  CasinoPayment,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  CasinoPaymentImage,
} from '../../store/api/casinoPaymentApi';
import {
  useGetCasinoAccountsQuery,
} from '../../store/api/casinoAccountApi';
import {
  useGetScreenshotsByCasinoQuery,
  useTakeScreenshotMutation,
  SlotScreenshot,
} from '../../store/api/slotSelectorApi';
import {
  useGetEmailsForCasinoByNameQuery,
  useMarkEmailAsReadMutation,
  Email,
} from '../../store/api/emailApi';
import {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../store/api/casinoCommentApi';
import { useSelector } from 'react-redux';
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

function renderFieldValue(field: ProfileField, value: any) {
  if (value == null || value === '') return '—';

  switch (field.field_type) {
    case 'boolean':
      return (
        <Badge
          status={value ? 'success' : 'default'}
          text={value ? 'Да' : 'Нет'}
        />
      );
    case 'rating':
      return <Typography.Text strong>{value}</Typography.Text>;
    case 'multiselect':
      return (
        <Space wrap size={[4, 4]}>
          {(Array.isArray(value) ? value : []).map((v: any) => (
            <Tag key={String(v)}>{String(v)}</Tag>
          ))}
        </Space>
      );
    case 'select':
      return <Typography.Text>{String(value)}</Typography.Text>;
    case 'url':
      return (
        <a href={String(value)} target="_blank" rel="noreferrer">
          {String(value)}
        </a>
      );
    case 'date':
      return (
        <Typography.Text>
          {dayjs(String(value)).isValid() ? dayjs(String(value)).format('YYYY-MM-DD') : String(value)}
        </Typography.Text>
      );
    default:
      return <Typography.Text>{String(value)}</Typography.Text>;
  }
}

export default function CasinoProfileView() {
  const { id } = useParams();
  const casinoId = Number(id);
  const nav = useNavigate();

  const { data: casino, isLoading: casinoLoading } = useGetCasinoByIdQuery(casinoId);
  const { data: profileResp, isLoading: profileLoading } = useGetCasinoProfileQuery(casinoId, {
    skip: !casinoId,
  } as any);

  const items: CasinoProfileItem[] = profileResp?.profile ?? [];

  const { data: bonuses, isLoading: bonusesLoading } = useGetCasinoBonusesQuery(
    { casinoId },
    { skip: !casinoId } as any
  );

  const { data: payments, isLoading: paymentsLoading } = useGetCasinoPaymentsQuery(
    { casinoId },
    { skip: !casinoId } as any
  );

  const { data: accounts, isLoading: accountsLoading } = useGetCasinoAccountsQuery(casinoId, {
    skip: !casinoId,
  });

  const [activeGeo, setActiveGeo] = useState<string | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: screenshots = [], isLoading: screenshotsLoading } = useGetScreenshotsByCasinoQuery(casinoId, {
    skip: !casinoId,
  });
  const [takeScreenshot, { isLoading: takingScreenshot }] = useTakeScreenshotMutation();

  const bonusGeos = useMemo(
    () => Array.from(new Set((bonuses ?? []).map((b) => b.geo).filter(Boolean as any))) as string[],
    [bonuses]
  );
  const paymentGeos = useMemo(
    () =>
      Array.from(new Set((payments ?? []).map((p) => p.geo).filter(Boolean as any))) as string[],
    [payments]
  );
  const accountGeos = useMemo(
    () => Array.from(new Set((accounts ?? []).map((a) => a.geo).filter(Boolean))) as string[],
    [accounts]
  );

  const [selectedBonus, setSelectedBonus] = useState<CasinoBonus | null>(null);
  const [pendingBonusImages, setPendingBonusImages] = useState<File[]>([]);

  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: selectedBonus?.id ?? 0 },
    { skip: !selectedBonus?.id || !casinoId }
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();

  const [selectedPayment, setSelectedPayment] = useState<CasinoPayment | null>(null);
  const [pendingPaymentImages, setPendingPaymentImages] = useState<File[]>([]);

  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId, paymentId: selectedPayment?.id ?? 0 },
    { skip: !selectedPayment?.id || !casinoId }
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();

  const [imagesPage, setImagesPage] = useState(1);
  const IMAGES_PAGE_SIZE = 12;

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
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
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

  const handleUploadImage = async (commentId: number, file: File) => {
    try {
      await uploadImage({ casinoId, commentId, file }).unwrap();
      message.success('Изображение загружено');
    } catch (e: any) {
      message.error(e?.data?.error || 'Не удалось загрузить изображение');
      throw e;
    }
  };

  if (!casinoId) return <Card>Неверный id казино</Card>;
  if (casinoLoading || profileLoading) return <Spin />;

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <Space wrap>
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
        <Button type="primary" onClick={() => nav(`/casinos/${casinoId}/edit`)}>
          Редактировать анкету
        </Button>
      </div>

      <Card>
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
            <>
              <Divider style={{ margin: '24px 0 16px' }} />
              <div>
              <Typography.Title level={5} style={{ marginBottom: 16 }}>
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
                      </Space>
                    }
                  >
                    {renderFieldValue(it.field, it.value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
              </div>
            </>
          )}
        </Space>
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
                    <div
                      key={`${(img as any).entity_type || 'image'}-${img.id}-${globalIndex}`}
                      style={{ width: 120, textAlign: 'center' }}
                    >
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
      <Card title="Аккаунты">
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Button
            size="small"
            type={!activeGeo ? 'primary' : 'default'}
            onClick={() => setActiveGeo(undefined)}
          >
            Все
          </Button>
          {accountGeos.map((g) => (
            <Button
              key={g}
              size="small"
              type={activeGeo === g ? 'primary' : 'default'}
              onClick={() => setActiveGeo(g)}
            >
              {g}
            </Button>
          ))}
        </Space>
        <AccountsTable
          accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
          isLoading={accountsLoading}
          readOnly={true}
        />
      </Card>

      {/* Скриншоты (Селекторы и скриншоты) */}
      <Card title="Скриншоты">
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Button
            size="small"
            type={!activeGeo ? 'primary' : 'default'}
            onClick={() => setActiveGeo(undefined)}
          >
            Все
          </Button>
          {Array.from(new Set(screenshots.map((s) => s.geo).filter(Boolean))).map((g) => (
            <Button
              key={g}
              size="small"
              type={activeGeo === g ? 'primary' : 'default'}
              onClick={() => setActiveGeo(g)}
            >
              {g}
            </Button>
          ))}
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
        <ProfileSettingsTable casinoId={casinoId} activeGeo={activeGeo} onGeoChange={setActiveGeo} readOnly={true} />
      </Card>

      <Card title="Бонусы">
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Button
            size="small"
            type={!activeGeo ? 'primary' : 'default'}
            onClick={() => setActiveGeo(undefined)}
          >
            Все
          </Button>
          {bonusGeos.map((g) => (
            <Button
              key={g}
              size="small"
              type={activeGeo === g ? 'primary' : 'default'}
              onClick={() => setActiveGeo(g)}
            >
              {g}
            </Button>
          ))}
        </Space>
        <Table<CasinoBonus>
          rowKey="id"
          size="small"
          loading={bonusesLoading}
          dataSource={(bonuses ?? []).filter((b) => (activeGeo ? b.geo === activeGeo : true))}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 60 },
            { title: 'Название', dataIndex: 'name', width: 150, ellipsis: true },
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
              width: 80,
              render: (v) => {
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
              width: 80,
              render: (v) => {
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
              dataIndex: 'min_deposit',
              width: 80,
              render: (v, b) => fmtAmount(v, b.currency),
            },
            {
              title: 'x',
              dataIndex: 'wagering_requirement',
              width: 50,
              render: (v) => {
                if (v == null) return '—';
                const num = Number(v);
                return isNaN(num) ? v : `x${Number.isInteger(num) ? num : parseFloat(num.toFixed(2))}`;
              },
            },
            {
              title: '',
              width: 40,
              align: 'right',
              render: (_, b) => (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setSelectedBonus(b)}
                />
              ),
            },
          ]}
        />

        {/* Модальное окно с подробностями бонуса */}
        <Modal
          title={selectedBonus?.name || 'Информация о бонусе'}
          open={!!selectedBonus}
          onCancel={() => {
            setSelectedBonus(null);
            setPendingBonusImages([]);
          }}
          footer={
            <Button
              onClick={() => {
                setSelectedBonus(null);
                setPendingBonusImages([]);
              }}
            >
              Закрыть
            </Button>
          }
          width={700}
        >
          {selectedBonus && (
            <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="GEO">
                <Tag>{selectedBonus.geo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Категория">
                {(() => {
                  const labels: Record<string, string> = {
                    casino: 'Казино',
                    sport: 'Спорт',
                  };
                  return labels[selectedBonus.bonus_category || 'casino'] || selectedBonus.bonus_category || 'Казино';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Вид бонуса">
                {(() => {
                  const labels: Record<string, string> = {
                    deposit: 'Депозитный',
                    nodeposit: 'Бездепозитный',
                    cashback: 'Кешбек',
                    rakeback: 'Рейкбек',
                  };
                  return labels[selectedBonus.bonus_kind || ''] || selectedBonus.bonus_kind || '—';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Тип бонуса">
                {(() => {
                  const labels: Record<string, string> = {
                    cash: 'Кэш-бонус',
                    freespin: 'Фриспин-бонус',
                    combo: 'Комбинированный',
                    freebet: 'Фрибет',
                    wagering: 'Вейджеринг',
                    insurance: 'Страховка',
                    accumulator: 'Аккумулятор',
                    odds_boost: 'Повышение коэффициентов',
                  };
                  return labels[selectedBonus.bonus_type || ''] || selectedBonus.bonus_type || '—';
                })()}
              </Descriptions.Item>
              
              {/* Валюта */}
              {selectedBonus.currency && (
                <Descriptions.Item label="Валюта">
                  {selectedBonus.currency}
                </Descriptions.Item>
              )}

              {/* Кэш-бонус */}
              {selectedBonus.bonus_value != null && (
                <Descriptions.Item label="Размер кэш-бонуса">
                  {selectedBonus.bonus_unit === 'percent' 
                    ? `${fmt(selectedBonus.bonus_value)}%` 
                    : fmtAmount(selectedBonus.bonus_value, selectedBonus.currency)}
                </Descriptions.Item>
              )}
              {selectedBonus.max_bonus != null && (
                <Descriptions.Item label="Макс. бонус">
                  {fmtAmount(selectedBonus.max_bonus, selectedBonus.currency)}
                </Descriptions.Item>
              )}

              {/* Фриспины */}
              {selectedBonus.freespins_count != null && (
                <Descriptions.Item label="Количество фриспинов">
                  {selectedBonus.freespins_count} FS
                </Descriptions.Item>
              )}
              {selectedBonus.freespin_value != null && (
                <Descriptions.Item label="Стоимость спина">
                  {fmtAmount(selectedBonus.freespin_value, selectedBonus.currency)}
                </Descriptions.Item>
              )}
              {selectedBonus.freespin_game && (
                <Descriptions.Item label="Игра для фриспинов">
                  {selectedBonus.freespin_game}
                </Descriptions.Item>
              )}

              {/* Кешбек/Рейкбек */}
              {selectedBonus.cashback_percent != null && (
                <Descriptions.Item label="Процент возврата">
                  {fmt(selectedBonus.cashback_percent)}%
                </Descriptions.Item>
              )}
              {selectedBonus.cashback_period && (
                <Descriptions.Item label="Период возврата">
                  {(() => {
                    const labels: Record<string, string> = {
                      daily: 'Ежедневно',
                      weekly: 'Еженедельно',
                      monthly: 'Ежемесячно',
                    };
                    return labels[selectedBonus.cashback_period] || selectedBonus.cashback_period;
                  })()}
                </Descriptions.Item>
              )}

              {/* Общие поля */}
              {selectedBonus.min_deposit != null && (
                <Descriptions.Item label="Мин. депозит">
                  {fmtAmount(selectedBonus.min_deposit, selectedBonus.currency)}
                </Descriptions.Item>
              )}
              {selectedBonus.max_cashout != null && (
                <Descriptions.Item label="Макс. выигрыш (коэф.)">
                  x{fmt(selectedBonus.max_cashout)}
                </Descriptions.Item>
              )}
              {selectedBonus.wagering_requirement != null && (
                <Descriptions.Item label="Вейджер">
                  x{fmt(selectedBonus.wagering_requirement)}
                </Descriptions.Item>
              )}
              {selectedBonus.wagering_games && (
                <Descriptions.Item label="Игры для отыгрыша">
                  {selectedBonus.wagering_games}
                </Descriptions.Item>
              )}
              {selectedBonus.notes && (
                <Descriptions.Item label="Заметки">
                  {selectedBonus.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Изображения бонуса (просмотр + загрузка) */}
            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Изображения бонуса</Typography.Title>

              {/* Уже загруженные изображения */}
              {bonusImages && bonusImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                    {bonusImages.map((img: CasinoBonusImage) => (
                      <Image
                        key={img.id}
                        src={img.url}
                        alt={img.original_name || 'Bonus image'}
                        width={90}
                        height={90}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
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
                  marginTop: 4,
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
                    message.info('Изображения добавлены, нажмите \"Загрузить\"');
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
                    message.info('Изображения добавлены (Ctrl+V), нажмите \"Загрузить\"');
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
                    return false;
                  }}
                >
                  <Button size="small" icon={<PictureOutlined />}>
                    Выбрать файлы
                  </Button>
                </Upload>
              </div>

              {/* Предпросмотр новых изображений + кнопка загрузки */}
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
                  <Button
                    type="primary"
                    size="small"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      if (!selectedBonus?.id || pendingBonusImages.length === 0) return;
                      try {
                        await uploadBonusImages({
                          casinoId,
                          bonusId: selectedBonus.id,
                          files: pendingBonusImages,
                        }).unwrap();
                        message.success('Изображения бонуса загружены');
                        setPendingBonusImages([]);
                      } catch (e: any) {
                        message.error(e?.data?.error ?? 'Ошибка загрузки изображений');
                      }
                    }}
                  >
                    Загрузить
                  </Button>
                </div>
              )}
            </div>
            </>
          )}
        </Modal>
      </Card>

      <Card title="Платёжные решения">
        <Space wrap style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Фильтр по GEO:</Typography.Text>
          <Button
            size="small"
            type={!activeGeo ? 'primary' : 'default'}
            onClick={() => setActiveGeo(undefined)}
          >
            Все
          </Button>
          {paymentGeos.map((g) => (
            <Button
              key={g}
              size="small"
              type={activeGeo === g ? 'primary' : 'default'}
              onClick={() => setActiveGeo(g)}
            >
              {g}
            </Button>
          ))}
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
              width: 60,
              align: 'right',
              render: (_, p) => (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setSelectedPayment(p)}
                />
              ),
            },
          ]}
        />

        {/* Модалка с деталями платежа и изображениями */}
        <Modal
          title="Платёжный метод"
          open={!!selectedPayment}
          onCancel={() => {
            setSelectedPayment(null);
            setPendingPaymentImages([]);
          }}
          footer={
            <Button
              onClick={() => {
                setSelectedPayment(null);
                setPendingPaymentImages([]);
              }}
            >
              Закрыть
            </Button>
          }
          width={600}
        >
          {selectedPayment && (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="GEO">{selectedPayment.geo}</Descriptions.Item>
                <Descriptions.Item label="Тип">{selectedPayment.type}</Descriptions.Item>
                <Descriptions.Item label="Метод">{selectedPayment.method}</Descriptions.Item>
                <Descriptions.Item label="Мин. сумма">
                  {selectedPayment.min_amount != null
                    ? `${Number(selectedPayment.min_amount).toLocaleString()} ${selectedPayment.currency || ''}`.trim()
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Макс. сумма">
                  {selectedPayment.max_amount != null
                    ? `${Number(selectedPayment.max_amount).toLocaleString()} ${selectedPayment.currency || ''}`.trim()
                    : '—'}
                </Descriptions.Item>
                {selectedPayment.notes && (
                  <Descriptions.Item label="Заметки">{selectedPayment.notes}</Descriptions.Item>
                )}
              </Descriptions>

              {/* Изображения платежного метода */}
              <div style={{ marginTop: 24 }}>
                <Typography.Title level={5}>Изображения платежного метода</Typography.Title>

                {/* Уже загруженные */}
                {paymentImages && paymentImages.length > 0 && (
                  <Image.PreviewGroup>
                    <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                      {paymentImages.map((img: CasinoPaymentImage) => (
                        <Image
                          key={img.id}
                          src={img.url}
                          alt={img.original_name || 'Payment image'}
                          width={90}
                          height={90}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                )}

                {/* Область добавления */}
                <div
                  style={{
                    border: '2px dashed #d9d9d9',
                    borderRadius: 6,
                    padding: 12,
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginTop: 4,
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
                      message.info('Изображения добавлены, нажмите \"Загрузить\"');
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
                      message.info('Изображения добавлены (Ctrl+V), нажмите \"Загрузить\"');
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
                      return false;
                    }}
                  >
                    <Button size="small" icon={<PictureOutlined />}>
                      Выбрать файлы
                    </Button>
                  </Upload>
                </div>

                {/* Новые изображения + загрузка */}
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
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={async () => {
                        if (!selectedPayment?.id || pendingPaymentImages.length === 0) return;
                        try {
                          await uploadPaymentImages({
                            casinoId,
                            paymentId: selectedPayment.id,
                            files: pendingPaymentImages,
                          }).unwrap();
                          message.success('Изображения платежа загружены');
                          setPendingPaymentImages([]);
                        } catch (e: any) {
                          message.error(e?.data?.error ?? 'Ошибка загрузки изображений');
                        }
                      }}
                    >
                      Загрузить
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      </Card>

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
                    {email.to_email && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        → {email.to_email}
                      </Typography.Text>
                    )}
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
                      refetchEmails();
                    } catch {
                      // ignore
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
                                {imgs.map((img, index) => (
                                  <Image
                                    key={`${(img as any).entity_type || 'comment'}-${img.id}-${index}`}
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

