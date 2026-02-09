import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  List,
  Modal,
  Select,
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
  theme,
} from 'antd';
import { ArrowLeftOutlined, CameraOutlined, InfoCircleOutlined, EyeOutlined, DeleteOutlined, LoadingOutlined, PictureOutlined, DownloadOutlined, RobotOutlined, SwapOutlined } from '@ant-design/icons';
import { ProfileSettingsTable } from '../../components/ProfileSettingsTable';
import { AccountsTable } from '../../components/AccountsTable';

import CasinoActivity from './components/CasinoActivity';
import CasinoTags from './components/CasinoTags';
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
  useGetRecipientsQuery,
  useMarkEmailAsReadMutation,
  useRequestEmailSummaryMutation,
  useRequestEmailScreenshotMutation,
  Email,
} from '../../store/api/emailApi';
import { getApiBaseUrl } from '../../config/api';
import {
  useGetCasinoCommentsQuery,
  useGetCasinoImagesQuery,
  CasinoCommentImage,
} from '../../store/api/casinoCommentApi';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { exportProfileToInteractiveHtml, ExportData } from '../../utils/exportProfileToInteractiveHtml';

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
  const { token } = theme.useToken();

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

  // Только GEO, на которые работает казино (проект)
  const casinoGeos = useMemo(() => casino?.geo ?? [], [casino?.geo]);

  const [selectedBonus, setSelectedBonus] = useState<CasinoBonus | null>(null);
  const [pendingBonusImages, setPendingBonusImages] = useState<File[]>([]);

  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: selectedBonus?.id ?? 0 },
    { skip: !selectedBonus?.id || !casinoId }
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();

  const [selectedPayment, setSelectedPayment] = useState<CasinoPayment | null>(null);
  const [pendingPaymentImages, setPendingPaymentImages] = useState<File[]>([]);
  const [activePaymentDirection, setActivePaymentDirection] = useState<'deposit' | 'withdrawal' | undefined>(undefined);

  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId, paymentId: selectedPayment?.id ?? 0 },
    { skip: !selectedPayment?.id || !casinoId }
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();

  const [imagesPage, setImagesPage] = useState(1);
  const IMAGES_PAGE_SIZE = 12;

  const PAGE_SIZE = 20;
  const [emailPage, setEmailPage] = useState(1);
  const [emailToFilter, setEmailToFilter] = useState<string | undefined>(undefined);
  const {
    data: emailResp,
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useGetEmailsForCasinoByNameQuery(
    {
      casinoId,
      limit: PAGE_SIZE,
      offset: (emailPage - 1) * PAGE_SIZE,
      ...(emailToFilter ? { to_email: emailToFilter } : {}),
    },
    { skip: !casinoId } as any
  );
  const { data: recipients = [] } = useGetRecipientsQuery();
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [reqSummary, { isLoading: summaryLoading }] = useRequestEmailSummaryMutation();
  const [reqScreenshot, { isLoading: screenshotLoading }] = useRequestEmailScreenshotMutation();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [casinoScreenshotVisible, setCasinoScreenshotVisible] = useState(false);

  // Comments & Images (needed for export)
  const { data: comments } = useGetCasinoCommentsQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const { data: images = [] } = useGetCasinoImagesQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const authToken = useSelector((state: any) => state.auth.token);

  // Пагинация изображений
  const paginatedImages = useMemo(() => {
    const start = (imagesPage - 1) * IMAGES_PAGE_SIZE;
    const end = start + IMAGES_PAGE_SIZE;
    return images.slice(start, end);
  }, [images, imagesPage]);

  const handleExportHtml = async () => {
    if (!casino) return;
    const hide = message.loading({ content: 'Подготовка экспорта...', key: 'export', duration: 0 });
    const baseUrl = getApiBaseUrl();
    const bonusImageUrls: Record<number, string[]> = {};
    for (const b of bonuses ?? []) {
      try {
        const r = await fetch(`${baseUrl}casinos/${casinoId}/bonuses/${b.id}/images`, { credentials: 'include' });
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data?.data ?? data?.images ?? []);
        bonusImageUrls[b.id] = (list as { url?: string }[]).map((img) => img.url).filter(Boolean) as string[];
      } catch {
        bonusImageUrls[b.id] = [];
      }
    }
    const paymentImageUrls: Record<number, string[]> = {};
    for (const p of payments ?? []) {
      try {
        const r = await fetch(`${baseUrl}casinos/${casinoId}/payments/${p.id}/images`, { credentials: 'include' });
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data?.data ?? data?.images ?? []);
        paymentImageUrls[p.id] = (list as { url?: string }[]).map((img) => img.url).filter(Boolean) as string[];
      } catch {
        paymentImageUrls[p.id] = [];
      }
    }
    const commentImageUrls = (images ?? [])
      .filter((img) => img.comment_id != null)
      .map((img) => ({ comment_id: img.comment_id!, url: img.url }));

    const authHeaders: HeadersInit = {};
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    let profileSettingsFields: ExportData['profileSettingsFields'] = [];
    let profileSettingsContexts: ExportData['profileSettingsContexts'] = [];
    let profileSettings: ExportData['profileSettings'] = [];
    try {
      const [fieldsRes, contextsRes] = await Promise.all([
        fetch(`${baseUrl}profile-fields`, { credentials: 'include', headers: authHeaders }),
        fetch(`${baseUrl}profile-contexts`, { credentials: 'include', headers: authHeaders }),
      ]);
      const fieldsData = fieldsRes.ok ? await fieldsRes.json() : [];
      const contextsData = contextsRes.ok ? await contextsRes.json() : [];
      profileSettingsFields = Array.isArray(fieldsData) ? fieldsData : (fieldsData?.data ?? []);
      profileSettingsContexts = Array.isArray(contextsData) ? contextsData : (contextsData?.data ?? []);
      const settingsByGeo: ExportData['profileSettings'] = [];
      for (const geo of casinoGeos) {
        try {
          const r = await fetch(`${baseUrl}profile-settings/casino/${casinoId}?geo=${encodeURIComponent(geo)}`, { credentials: 'include', headers: authHeaders });
          const arr = r.ok ? await r.json() : [];
          const list = Array.isArray(arr) ? arr : (arr?.data ?? []);
          for (const s of list as { geo?: string; field_id: number; context_id: number; value: boolean }[]) {
            settingsByGeo.push({ geo: s.geo ?? geo, field_id: s.field_id, context_id: s.context_id, value: s.value });
          }
        } catch {
          // skip
        }
      }
      profileSettings = settingsByGeo;
    } catch {
      // skip profile settings
    }

    const exportData: ExportData = {
      casino: {
        id: casino.id,
        name: casino.name,
        website: casino.website,
        description: casino.description,
        geo: casino.geo,
        is_our: casino.is_our,
        status: casino.status,
      },
      profile: items,
      profileSettingsFields,
      profileSettingsContexts,
      profileSettings,
      bonuses: bonuses ?? [],
      payments: payments ?? [],
      emails: emailResp?.data ?? [],
      comments: (comments ?? []).map((c) => ({
        id: c.id,
        text: c.text,
        created_at: c.created_at,
        user: c.username ? { username: c.username } : undefined,
      })),
      geos: casinoGeos,
      recipients: (recipients ?? []).map((r) => r.email),
      bonusImageUrls,
      paymentImageUrls,
      commentImageUrls,
    };
    const getImageDataUrl = async (url: string): Promise<string | null> => {
      try {
        const abs = url.startsWith('http') ? url : new URL(url, window.location.origin).href;
        const res = await fetch(abs, { credentials: 'include' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };
    try {
      await exportProfileToInteractiveHtml(exportData, {
        title: `${casino.name} — анкета`,
        filename: `anketa-${String(casino.name).replace(/[^\w\s-]/g, '')}.html`,
        getImageDataUrl,
      });
      hide();
      message.success({ content: 'HTML-файл сохранён', key: 'export' });
    } catch (e) {
      hide();
      message.error({ content: 'Ошибка экспорта', key: 'export' });
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
        <Space wrap>
          <Tooltip title="Сравнить с другим казино">
            <Button icon={<SwapOutlined />} onClick={() => nav(`/casinos/compare?casino1=${casinoId}`)}>
              Сравнить
            </Button>
          </Tooltip>
          <Tooltip title="Экспорт анкеты в интерактивный HTML: фильтры по GEO и получателю, просмотр бонусов и платежей в модальных окнах, просмотр писем.">
            <Button icon={<DownloadOutlined />} onClick={handleExportHtml}>
              Экспорт в HTML
            </Button>
          </Tooltip>
          <Button type="primary" onClick={() => nav(`/casinos/${casinoId}/edit`)}>
            Редактировать анкету
          </Button>
        </Space>
      </div>

      {/* Теги казино */}
      <Card size="small">
        <CasinoTags casinoId={casinoId} />
      </Card>

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
          {casinoGeos.map((g) => (
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
          {casinoGeos.map((g) => (
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
        <ProfileSettingsTable casinoId={casinoId} activeGeo={activeGeo} onGeoChange={setActiveGeo} readOnly={true} casinoGeoCodes={casino?.geo} />
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
          {casinoGeos.map((g) => (
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
              {/* Максвин по кэш-части / % части — рядом с кэш-бонусом */}
              {selectedBonus.bonus_type === 'cash' &&
                (selectedBonus.max_win_cash_value != null || selectedBonus.max_cashout != null) && (
                  <Descriptions.Item label="Максвин кэш-бонуса">
                    {selectedBonus.max_win_cash_value != null ? (
                      <>
                        {selectedBonus.max_win_cash_unit === 'coefficient'
                          ? `x${fmt(selectedBonus.max_win_cash_value)}`
                          : fmtAmount(selectedBonus.max_win_cash_value, selectedBonus.currency)}
                        {' '}
                        ({selectedBonus.max_win_cash_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
                      </>
                    ) : (
                      `x${fmt(selectedBonus.max_cashout)} (коэффициент)`
                    )}
                  </Descriptions.Item>
                )}
              {selectedBonus.bonus_type === 'combo' &&
                selectedBonus.max_win_percent_value != null && (
                  <Descriptions.Item label="Максвин % части">
                    {selectedBonus.max_win_percent_unit === 'coefficient'
                      ? `x${fmt(selectedBonus.max_win_percent_value)}`
                      : fmtAmount(selectedBonus.max_win_percent_value, selectedBonus.currency)}
                    {' '}
                    ({selectedBonus.max_win_percent_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
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
              {/* Максвин фриспинов — рядом с информацией по спинам */}
              {(selectedBonus.bonus_type === 'freespin' || selectedBonus.bonus_type === 'combo') &&
                selectedBonus.max_win_freespin_value != null && (
                  <Descriptions.Item label="Максвин фриспинов">
                    {selectedBonus.max_win_freespin_unit === 'coefficient'
                      ? `x${fmt(selectedBonus.max_win_freespin_value)}`
                      : fmtAmount(selectedBonus.max_win_freespin_value, selectedBonus.currency)}
                    {' '}
                    ({selectedBonus.max_win_freespin_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
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
          <Typography.Text type="secondary">Направление:</Typography.Text>
          <Button
            size="small"
            type={activePaymentDirection === undefined ? 'primary' : 'default'}
            onClick={() => setActivePaymentDirection(undefined)}
          >
            Все
          </Button>
          <Button
            size="small"
            type={activePaymentDirection === 'deposit' ? 'primary' : 'default'}
            onClick={() => setActivePaymentDirection('deposit')}
          >
            Деп
          </Button>
          <Button
            size="small"
            type={activePaymentDirection === 'withdrawal' ? 'primary' : 'default'}
            onClick={() => setActivePaymentDirection('withdrawal')}
          >
            Вывод
          </Button>
          <Divider type="vertical" />
          <Typography.Text type="secondary">GEO:</Typography.Text>
          <Button
            size="small"
            type={!activeGeo ? 'primary' : 'default'}
            onClick={() => setActiveGeo(undefined)}
          >
            Все
          </Button>
          {casinoGeos.map((g) => (
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
          dataSource={(payments ?? []).filter((p) => {
            if (activePaymentDirection != null && (p.direction ?? 'deposit') !== activePaymentDirection) return false;
            if (activeGeo && p.geo !== activeGeo) return false;
            return true;
          })}
          pagination={false}
          columns={[
            { title: 'Направление', dataIndex: 'direction', width: 100, render: (v: string) => v === 'withdrawal' ? 'Выплата' : 'Депозит' },
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
        <div style={{ marginBottom: 12 }}>
          <Select
            allowClear
            showSearch
            placeholder="Получатель"
            style={{ minWidth: 220 }}
            options={recipients.map((r) => ({ value: r.email, label: r.email }))}
            value={emailToFilter}
            onChange={(value) => {
              setEmailToFilter(value);
              setEmailPage(1);
            }}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
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
                    {email.ai_summary && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        <RobotOutlined style={{ marginRight: 4 }} />
                        {email.ai_summary.length > 100 ? email.ai_summary.slice(0, 100) + '…' : email.ai_summary}
                      </Typography.Text>
                    )}
                    <Space size={4}>
                      {email.screenshot_url && (
                        <Tag color="green" style={{ fontSize: 11, margin: 0 }}><CameraOutlined /> Скрин</Tag>
                      )}
                      {email.ai_summary && (
                        <Tag color="blue" style={{ fontSize: 11, margin: 0 }}><RobotOutlined /> AI</Tag>
                      )}
                    </Space>
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
            onClose={() => { setSelectedEmail(null); setCasinoScreenshotVisible(false); }}
            width={720}
            title={selectedEmail?.subject || '(Без темы)'}
            destroyOnClose
            extra={
              <Space size={4}>
                <Tooltip title={selectedEmail?.ai_summary ? 'Пересоздать саммари' : 'Запросить саммари'}>
                  <Button
                    size="small"
                    icon={summaryLoading ? <LoadingOutlined /> : <RobotOutlined />}
                    loading={summaryLoading}
                    onClick={async () => {
                      try {
                        const updated = await reqSummary(selectedEmail.id).unwrap();
                        setSelectedEmail(updated);
                        refetchEmails();
                        message.success('Саммари получено');
                      } catch {
                        message.error('Ошибка получения саммари');
                      }
                    }}
                  >
                    Саммари
                  </Button>
                </Tooltip>
                <Tooltip title={selectedEmail?.screenshot_url ? 'Пересоздать скриншот' : 'Сделать скриншот'}>
                  <Button
                    size="small"
                    icon={screenshotLoading ? <LoadingOutlined /> : <CameraOutlined />}
                    loading={screenshotLoading}
                    onClick={async () => {
                      try {
                        const updated = await reqScreenshot(selectedEmail.id).unwrap();
                        setSelectedEmail(updated);
                        refetchEmails();
                        message.success('Скриншот создан');
                      } catch {
                        message.error('Ошибка создания скриншота');
                      }
                    }}
                  >
                    Скриншот
                  </Button>
                </Tooltip>
                {selectedEmail?.screenshot_url && (
                  <Tooltip title="Посмотреть скриншот">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setCasinoScreenshotVisible(true)}
                    />
                  </Tooltip>
                )}
                {selectedEmail && !selectedEmail.is_read && (
                  <Button
                    size="small"
                    onClick={async () => {
                      try {
                        await markAsRead(selectedEmail.id).unwrap();
                        refetchEmails();
                      } catch { /* ignore */ }
                    }}
                  >
                    Прочитано
                  </Button>
                )}
              </Space>
            }
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="От">
                  {selectedEmail.from_name || ''} &lt;{selectedEmail.from_email}&gt;
                </Descriptions.Item>
                <Descriptions.Item label="Кому">
                  {selectedEmail.to_email || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Дата">
                  {selectedEmail.date_received
                    ? dayjs(selectedEmail.date_received).format('YYYY-MM-DD HH:mm')
                    : '—'}
                </Descriptions.Item>
              </Descriptions>

              {/* AI Summary */}
              {selectedEmail.ai_summary && (
                <Card
                  size="small"
                  style={{
                    background: token.colorPrimaryBg,
                    borderColor: token.colorPrimaryBorder,
                  }}
                >
                  <Space align="start" size={8}>
                    <Tag icon={<RobotOutlined />} color="processing" style={{ margin: 0, flexShrink: 0 }}>AI</Tag>
                    <Typography.Text style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {selectedEmail.ai_summary}
                    </Typography.Text>
                  </Space>
                </Card>
              )}

              {/* Hidden screenshot for fullscreen preview */}
              {selectedEmail.screenshot_url && (
                <Image
                  src={`${getApiBaseUrl().replace(/\/api\/?$/, '')}${selectedEmail.screenshot_url}`}
                  alt="Email screenshot"
                  style={{ display: 'none' }}
                  preview={{
                    visible: casinoScreenshotVisible,
                    onVisibleChange: (v) => setCasinoScreenshotVisible(v),
                  }}
                />
              )}

              <Card size="small" title="Текст письма">
                {selectedEmail.body_html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                    style={{ maxHeight: '60vh', overflow: 'auto' }}
                  />
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

      {/* Активность (комментарии + история) */}
      <CasinoActivity casinoId={casinoId} />

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

