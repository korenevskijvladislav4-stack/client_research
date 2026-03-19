import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  Upload,
  Image,
  Pagination,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  DownloadOutlined,
  SwapOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  UserOutlined,
  CameraOutlined,
  AppstoreOutlined,
  MailOutlined,
  CommentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ProfileSettingsTable } from '../../components/ProfileSettingsTable';
import { AccountsTable } from '../../components/AccountsTable';

import CasinoActivity from './components/CasinoActivity';
import CasinoTags from './components/CasinoTags';
import BonusSection from './components/BonusSection';
import PromoSection from './components/PromoSection';
import PaymentSection from './components/PaymentSection';
import EmailSection from './components/EmailSection';

import { useGetCasinoByIdQuery } from '../../store/api/casinoApi';
import {
  useGetCasinoProfileQuery,
  CasinoProfileItem,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import { useGetCasinoBonusesQuery } from '../../store/api/casinoBonusApi';
import { useGetCasinoPaymentsQuery } from '../../store/api/casinoPaymentApi';
import { useGetCasinoAccountsQuery } from '../../store/api/casinoAccountApi';
import { useGetCasinoPromosQuery } from '../../store/api/casinoPromoApi';
import { useGetCasinoProvidersQuery } from '../../store/api/casinoProviderApi';
import {
  useGetScreenshotsByCasinoQuery,
  useTakeScreenshotMutation,
  SlotScreenshot,
} from '../../store/api/slotSelectorApi';
import { useGetEmailsForCasinoByNameQuery, useGetRecipientsQuery } from '../../store/api/emailApi';
import { getApiBaseUrl } from '../../config/api';
import {
  useGetCasinoCommentsQuery,
  useGetCasinoImagesQuery,
  useCreateCommentMutation,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../store/api/casinoCommentApi';
import { useAppSelector } from '../../hooks/redux';
import dayjs from 'dayjs';
import { exportProfileToInteractiveHtml, ExportData } from '../../utils/exportProfileToInteractiveHtml';

function renderFieldValue(field: ProfileField, value: unknown) {
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
      return <Typography.Text strong>{String(value)}</Typography.Text>;
    case 'multiselect':
      return (
        <Space wrap size={[4, 4]}>
          {(Array.isArray(value) ? value : []).map((v: unknown) => (
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
  const casinoGeos = useMemo(() => casino?.geo ?? [], [casino?.geo]);
  const [activeGeo, setActiveGeo] = useState<string | undefined>(() =>
    Array.isArray(casinoGeos) && casinoGeos.length > 0 ? casinoGeos[0] : undefined,
  );

  useEffect(() => {
    if (!activeGeo && Array.isArray(casinoGeos) && casinoGeos.length > 0) {
      setActiveGeo(casinoGeos[0]);
    }
  }, [casinoGeos, activeGeo]);

  const { data: profileResp, isLoading: profileLoading } = useGetCasinoProfileQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as Record<string, unknown>,
  );
  const items: CasinoProfileItem[] = profileResp?.profile ?? [];

  const { data: bonuses, isLoading: bonusesLoading } = useGetCasinoBonusesQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as Record<string, unknown>,
  );

  const { data: payments, isLoading: paymentsLoading } = useGetCasinoPaymentsQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as Record<string, unknown>,
  );

  const { data: accounts, isLoading: accountsLoading } = useGetCasinoAccountsQuery(casinoId, {
    skip: !casinoId,
  });

  const { data: promos, isLoading: promosLoading } = useGetCasinoPromosQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as Record<string, unknown>,
  );

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: screenshots = [], isLoading: screenshotsLoading } = useGetScreenshotsByCasinoQuery(casinoId, {
    skip: !casinoId,
  });
  const [takeScreenshot, { isLoading: takingScreenshot }] = useTakeScreenshotMutation();

  const [activeProviderGeo] = useState<string | undefined>(undefined);
  const { data: casinoProviders = [], isLoading: casinoProvidersLoading } = useGetCasinoProvidersQuery(
    { casinoId, geo: activeProviderGeo ?? activeGeo },
    { skip: !casinoId },
  );

  const [imagesPage, setImagesPage] = useState(1);
  const IMAGES_PAGE_SIZE = 12;

  const { data: comments } = useGetCasinoCommentsQuery(casinoId, { skip: !casinoId } as Record<string, unknown>);
  const { data: images = [] } = useGetCasinoImagesQuery(casinoId, { skip: !casinoId } as Record<string, unknown>);
  const [createComment] = useCreateCommentMutation();
  const [uploadCommentImage] = useUploadCommentImageMutation();
  const [galleryCommentId, setGalleryCommentId] = useState<number | null>(null);
  const authToken = useAppSelector((state) => state.auth.token);

  const { data: emailResp } = useGetEmailsForCasinoByNameQuery(
    { casinoId, limit: 20, offset: 0 },
    { skip: !casinoId } as Record<string, unknown>,
  );
  const { data: recipients = [] } = useGetRecipientsQuery();

  const allImages: CasinoCommentImage[] = useMemo(() => {
    const base = images as CasinoCommentImage[];
    const screenshotImages: CasinoCommentImage[] =
      (screenshots ?? [])
        .filter((s) => s.screenshot_url)
        .map((s, idx) => ({
          id: -(s.screenshot_id ?? idx + 1),
          casino_id: casinoId,
          comment_id: null,
          bonus_id: null,
          payment_id: null,
          file_path: s.screenshot_path || '',
          original_name: s.section || 'Скриншот',
          created_at: s.screenshot_created_at || '',
          url: s.screenshot_url as string,
          label: s.section || undefined,
          username: undefined,
          bonus_name: undefined,
          payment_name: undefined,
          entity_type: 'comment',
        })) as CasinoCommentImage[];
    return [...base, ...screenshotImages];
  }, [images, screenshots, casinoId]);

  const paginatedImages = useMemo(() => {
    const start = (imagesPage - 1) * IMAGES_PAGE_SIZE;
    return allImages.slice(start, start + IMAGES_PAGE_SIZE);
  }, [allImages, imagesPage]);

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
      } catch { bonusImageUrls[b.id] = []; }
    }
    const paymentImageUrls: Record<number, string[]> = {};
    for (const p of payments ?? []) {
      try {
        const r = await fetch(`${baseUrl}casinos/${casinoId}/payments/${p.id}/images`, { credentials: 'include' });
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data?.data ?? data?.images ?? []);
        paymentImageUrls[p.id] = (list as { url?: string }[]).map((img) => img.url).filter(Boolean) as string[];
      } catch { paymentImageUrls[p.id] = []; }
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
        } catch { /* skip */ }
      }
      profileSettings = settingsByGeo;
    } catch { /* skip profile settings */ }

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
      } catch { return null; }
    };
    try {
      await exportProfileToInteractiveHtml(exportData, {
        title: `${casino.name} — анкета`,
        filename: `anketa-${String(casino.name).replace(/[^\w\s-]/g, '')}.html`,
        getImageDataUrl,
      });
      hide();
      message.success({ content: 'HTML-файл сохранён', key: 'export' });
    } catch {
      hide();
      message.error({ content: 'Ошибка экспорта', key: 'export' });
    }
  };

  const ensureGalleryComment = useCallback(async () => {
    if (galleryCommentId) return galleryCommentId;
    try {
      const comment = await createComment({ casinoId, data: { text: 'Галерея изображений' } }).unwrap();
      setGalleryCommentId(comment.id);
      return comment.id;
    } catch {
      message.error('Не удалось создать запись для изображений');
      throw new Error('gallery-comment-failed');
    }
  }, [galleryCommentId, createComment, casinoId]);

  const handleUploadImage = useCallback(
    async (file: File) => {
      try {
        const commentId = await ensureGalleryComment();
        await uploadCommentImage({ casinoId, commentId, file }).unwrap();
        message.success('Изображение загружено');
      } catch (e) {
        if ((e as Error).message !== 'gallery-comment-failed') {
          message.error('Не удалось загрузить изображение');
        }
      }
    },
    [ensureGalleryComment, uploadCommentImage, casinoId],
  );

  if (!casinoId) return <Card>Неверный id казино</Card>;
  if (casinoLoading || profileLoading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const overviewTab = (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card
        size="small"
        title={<Space size={8}><Tag>Теги</Tag><Typography.Text strong>Классификация казино</Typography.Text></Space>}
      >
        <CasinoTags casinoId={casinoId} />
      </Card>

      <Card size="small" title="Общая информация">
        <Descriptions
          column={1}
          bordered
          size="small"
          styles={{ label: { width: 200, minWidth: 200 } }}
        >
          <Descriptions.Item label="Название">{casino?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Сайт">
            {casino?.website ? <a href={casino.website} target="_blank" rel="noreferrer">{casino.website}</a> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="GEO">
            {casino?.geo?.length ? (
              <Space wrap size={[4, 4]}>{casino.geo.map((g) => <Tag key={g}>{g}</Tag>)}</Space>
            ) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Наш">
            {casino?.is_our ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>}
          </Descriptions.Item>
          {casino?.description && (
            <Descriptions.Item label="Описание">{casino.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card size="small" title={`Дополнительные поля${activeGeo ? ` (${activeGeo})` : ''}`}>
        {items.length === 0 ? (
          <Typography.Text type="secondary">Нет дополнительных полей для этого профиля.</Typography.Text>
        ) : (
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
                      <Tooltip title={it.field.description}><InfoCircleOutlined style={{ fontSize: 12 }} /></Tooltip>
                    ) : null}
                  </Space>
                }
              >
                {renderFieldValue(it.field, it.value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Card>

      <Card
        size="small"
        title={<Space><PictureOutlined /><span>Изображения ({allImages.length})</span></Space>}
        extra={
          <Upload
            accept="image/*"
            multiple
            showUploadList={false}
            beforeUpload={async (file) => { await handleUploadImage(file); return false; }}
          >
            <Button size="small" icon={<PictureOutlined />}>Загрузить</Button>
          </Upload>
        }
      >
        {allImages.length === 0 ? (
          <Typography.Text type="secondary">Изображения ещё не загружены.</Typography.Text>
        ) : (
          <>
            <Image.PreviewGroup>
              <Space wrap size={[8, 8]}>
                {paginatedImages.map((img, index) => {
                  const globalIndex = (imagesPage - 1) * IMAGES_PAGE_SIZE + index;
                  return (
                    <div key={`img-${img.id}-${globalIndex}`} style={{ width: 120, textAlign: 'center' }}>
                      <Image src={img.url} alt={img.original_name || ''} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      {(img.label || img.username) && (
                        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }} ellipsis={{ tooltip: img.label || img.username }}>
                          {img.label || img.username}
                        </Typography.Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            </Image.PreviewGroup>
            {allImages.length > IMAGES_PAGE_SIZE && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                  current={imagesPage}
                  total={allImages.length}
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

      <Card size="small" title={<Space><UserOutlined /><span>Аккаунты</span></Space>}>
        <AccountsTable
          accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
          isLoading={accountsLoading}
          readOnly={true}
        />
      </Card>

      <Card size="small" title={<Space><CameraOutlined /><span>Скриншоты</span></Space>}>
        <Table<SlotScreenshot>
          rowKey="selector_id"
          size="small"
          loading={screenshotsLoading}
          dataSource={screenshots.filter((s) => (activeGeo ? s.geo === activeGeo : true))}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 80 },
            { title: 'Раздел', dataIndex: 'section', width: 150, render: (v) => v || '—' },
            { title: 'Категория', dataIndex: 'category', width: 150, render: (v) => v || '—' },
            {
              title: 'Скриншот',
              width: 150,
              render: (_, record) =>
                record.screenshot_url ? (
                  <Button type="link" size="small" onClick={() => setPreviewImage(record.screenshot_url || null)}>Раскрыть</Button>
                ) : (
                  <Typography.Text type="secondary">Нет скриншота</Typography.Text>
                ),
            },
            {
              title: 'Дата обновления',
              width: 180,
              render: (_, record) =>
                record.screenshot_created_at ? (
                  <Typography.Text>{dayjs(record.screenshot_created_at).format('DD.MM.YYYY HH:mm')}</Typography.Text>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                ),
            },
            {
              title: 'Действия',
              width: 150,
              align: 'right' as const,
              render: (_, record) =>
                (record as SlotScreenshot & { selector?: string }).selector ? (
                  <Button
                    type="link"
                    size="small"
                    loading={takingScreenshot}
                    onClick={async () => {
                      try {
                        await takeScreenshot(record.selector_id).unwrap();
                        message.success('Скриншот обновлён');
                      } catch { message.error('Не удалось сделать скриншот'); }
                    }}
                  >
                    Обновить
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Card size="small" title={<Space><SettingOutlined /><span>Настройки профиля{activeGeo ? ` (${activeGeo})` : ''}</span></Space>}>
        <ProfileSettingsTable casinoId={casinoId} activeGeo={activeGeo} readOnly={true} />
      </Card>

      <BonusSection casinoId={casinoId} bonuses={bonuses} isLoading={bonusesLoading} activeGeo={activeGeo} />
      <PromoSection casinoId={casinoId} casinoName={casino?.name} promos={promos} isLoading={promosLoading} activeGeo={activeGeo} />

      <Card size="small" title={<Space><AppstoreOutlined /><span>Провайдеры{(activeProviderGeo ?? activeGeo) ? ` (${activeProviderGeo ?? activeGeo})` : ''}</span></Space>}>
        {casinoProvidersLoading ? (
          <Typography.Text type="secondary">Загрузка...</Typography.Text>
        ) : casinoProviders.length === 0 ? (
          <Typography.Text type="secondary">
            {activeProviderGeo ? `Нет провайдеров для GEO «${activeProviderGeo}».` : 'Выберите GEO для просмотра списка провайдеров.'}
          </Typography.Text>
        ) : (
          <Space wrap size={[8, 8]}>
            {casinoProviders.map((cp) => <Tag key={cp.id}>{cp.provider_name}</Tag>)}
          </Space>
        )}
      </Card>

      <PaymentSection casinoId={casinoId} payments={payments} isLoading={paymentsLoading} />
      <EmailSection casinoId={casinoId} />
      <CasinoActivity casinoId={casinoId} />
    </Space>
  );

  const tabItems = [
    {
      key: 'overview',
      label: <Space size={6}><SettingOutlined />Анкета</Space>,
      children: overviewTab,
    },
    {
      key: 'bonuses',
      label: <Space size={6}><GiftOutlined />Бонусы</Space>,
      children: <BonusSection casinoId={casinoId} bonuses={bonuses} isLoading={bonusesLoading} activeGeo={activeGeo} />,
    },
    {
      key: 'promos',
      label: <Space size={6}><ThunderboltOutlined />Промо</Space>,
      children: <PromoSection casinoId={casinoId} casinoName={casino?.name} promos={promos} isLoading={promosLoading} activeGeo={activeGeo} />,
    },
    {
      key: 'payments',
      label: <Space size={6}><CreditCardOutlined />Платежи</Space>,
      children: <PaymentSection casinoId={casinoId} payments={payments} isLoading={paymentsLoading} />,
    },
    {
      key: 'accounts',
      label: <Space size={6}><UserOutlined />Аккаунты</Space>,
      children: (
        <Card size="small" title={<Space><UserOutlined /><span>Аккаунты</span></Space>}>
          <AccountsTable
            accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
            isLoading={accountsLoading}
            readOnly={true}
          />
        </Card>
      ),
    },
    {
      key: 'screenshots',
      label: <Space size={6}><CameraOutlined />Скриншоты</Space>,
      children: (
        <Card size="small" title={<Space><CameraOutlined /><span>Скриншоты</span></Space>}>
          <Table<SlotScreenshot>
            rowKey="selector_id"
            size="small"
            loading={screenshotsLoading}
            dataSource={screenshots.filter((s) => (activeGeo ? s.geo === activeGeo : true))}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1200 }}
            columns={[
              { title: 'GEO', dataIndex: 'geo', width: 80 },
              { title: 'Раздел', dataIndex: 'section', width: 150, render: (v) => v || '—' },
              { title: 'Категория', dataIndex: 'category', width: 150, render: (v) => v || '—' },
              {
                title: 'Скриншот', width: 150,
                render: (_, record) =>
                  record.screenshot_url ? (
                    <Button type="link" size="small" onClick={() => setPreviewImage(record.screenshot_url || null)}>Раскрыть</Button>
                  ) : (
                    <Typography.Text type="secondary">Нет скриншота</Typography.Text>
                  ),
              },
              {
                title: 'Дата обновления', width: 180,
                render: (_, record) =>
                  record.screenshot_created_at ? (
                    <Typography.Text>{dayjs(record.screenshot_created_at).format('DD.MM.YYYY HH:mm')}</Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
              },
              {
                title: 'Действия', width: 150, align: 'right' as const,
                render: (_, record) =>
                  (record as SlotScreenshot & { selector?: string }).selector ? (
                    <Button type="link" size="small" loading={takingScreenshot}
                      onClick={async () => {
                        try { await takeScreenshot(record.selector_id).unwrap(); message.success('Скриншот обновлён'); }
                        catch { message.error('Не удалось сделать скриншот'); }
                      }}
                    >Обновить</Button>
                  ) : null,
              },
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'providers',
      label: <Space size={6}><AppstoreOutlined />Провайдеры</Space>,
      children: (
        <Card size="small" title={<Space><AppstoreOutlined /><span>Провайдеры{(activeProviderGeo ?? activeGeo) ? ` (${activeProviderGeo ?? activeGeo})` : ''}</span></Space>}>
          {casinoProvidersLoading ? (
            <Typography.Text type="secondary">Загрузка...</Typography.Text>
          ) : casinoProviders.length === 0 ? (
            <Typography.Text type="secondary">
              {activeProviderGeo ? `Нет провайдеров для GEO «${activeProviderGeo}».` : 'Выберите GEO для просмотра списка провайдеров.'}
            </Typography.Text>
          ) : (
            <Space wrap size={[8, 8]}>
              {casinoProviders.map((cp) => <Tag key={cp.id}>{cp.provider_name}</Tag>)}
            </Space>
          )}
        </Card>
      ),
    },
    {
      key: 'emails',
      label: <Space size={6}><MailOutlined />Почта</Space>,
      children: <EmailSection casinoId={casinoId} />,
    },
    {
      key: 'comments',
      label: <Space size={6}><CommentOutlined />Активность</Space>,
      children: <CasinoActivity casinoId={casinoId} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: '14px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space size={14} align="center">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => nav('/casinos')}
              shape="circle"
              size="middle"
            />
            <div style={{ lineHeight: 1.3 }}>
              <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                {casino?.name}
              </Typography.Title>
              <Space size={8} wrap>
                {casino?.website && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <a href={casino.website} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                      {casino.website}
                    </a>
                  </Typography.Text>
                )}
                {casino?.is_our && <Tag color="green">Наш проект</Tag>}
              </Space>
            </div>
          </Space>
          <Space size={10} wrap>
            {casinoGeos.length > 0 && (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: casinoGeos.map((g) => ({
                    key: g || 'ALL',
                    label: g || 'ALL',
                    onClick: () => setActiveGeo(g),
                  })),
                  selectedKeys: activeGeo ? [activeGeo] : [],
                }}
              >
                <Button
                  style={{
                    borderRadius: token.borderRadiusLG,
                    paddingInline: 14,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontWeight: 500 }}>
                    GEO
                  </span>
                  <Tag color="blue" style={{ margin: 0, borderRadius: 999, paddingInline: 10, fontSize: 12, fontWeight: 600 }}>
                    {activeGeo || 'ALL'}
                  </Tag>
                </Button>
              </Dropdown>
            )}
            <Tooltip title="Сравнить это казино с другим">
              <Button icon={<SwapOutlined />} onClick={() => nav(`/casinos/compare?casino1=${casinoId}`)}
                style={{ borderRadius: token.borderRadiusLG, height: 36 }}
              >Сравнить</Button>
            </Tooltip>
            <Tooltip title="Экспорт анкеты в интерактивный HTML">
              <Button icon={<DownloadOutlined />} onClick={handleExportHtml}
                style={{ borderRadius: token.borderRadiusLG, height: 36 }}
              >Экспорт</Button>
            </Tooltip>
            <Button type="primary" onClick={() => nav(`/casinos/${casinoId}/edit`)}
              style={{ borderRadius: token.borderRadiusLG, height: 36, fontWeight: 500 }}
            >Редактировать</Button>
          </Space>
        </div>
      </div>

      {/* Tabs */}
      <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
        <Tabs
          defaultActiveKey="overview"
          items={tabItems}
          size="middle"
          tabBarStyle={{ marginBottom: 16 }}
          destroyInactiveTabPane={false}
        />
      </Card>

      {previewImage && (
        <Image
          style={{ display: 'none' }}
          src={previewImage}
          preview={{
            visible: true,
            onVisibleChange: (visible) => { if (!visible) setPreviewImage(null); },
          }}
        />
      )}
    </div>
  );
}
