import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Form,
  Image,
  Input,
  InputNumber,
  Pagination,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  theme,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  PictureOutlined,
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
import { useGetCasinoByIdQuery } from '../../store/api/casinoApi';
import {
  useGetCasinoProfileHistoryQuery,
  useGetCasinoProfileQuery,
  useUpdateCasinoProfileMutation,
  CasinoProfileItem,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import {
  useGetCasinoImagesQuery,
  CasinoCommentImage,
} from '../../store/api/casinoCommentApi';

import BonusEditSection from './components/BonusEditSection';
import PromoEditSection from './components/PromoEditSection';
import PaymentEditSection from './components/PaymentEditSection';
import AccountEditSection from './components/AccountEditSection';
import ScreenshotsEditSection from './components/ScreenshotsEditSection';
import ProvidersEditSection from './components/ProvidersEditSection';
import CommentsEditSection from './components/CommentsEditSection';
import EmailEditSection from './components/EmailEditSection';

const CASINO_PROFILE_TAB_KEYS = new Set([
  'overview',
  'bonuses',
  'promos',
  'payments',
  'accounts',
  'screenshots',
  'providers',
  'emails',
  'comments',
]);

function parseCasinoProfileUrl() {
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const g = sp.get('geo')?.trim();
  const t = sp.get('tab')?.trim();
  return {
    geo: g || undefined,
    tab: t && CASINO_PROFILE_TAB_KEYS.has(t) ? t : 'overview',
  };
}

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
    case 'rating':
      return <Select options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: v }))} placeholder="1..5" />;
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
  const { token } = theme.useToken();
  const [, setSearchParams] = useSearchParams();
  const urlInit = useMemo(() => parseCasinoProfileUrl(), []);

  const { data: casino, isLoading: casinoLoading } = useGetCasinoByIdQuery(casinoId);
  const casinoGeos = useMemo(() => casino?.geo ?? [], [casino?.geo]);
  const [activeGeo, setActiveGeo] = useState<string | undefined>(urlInit.geo);
  const [activeTab, setActiveTab] = useState<string>(urlInit.tab);

  useEffect(() => {
    if (!Array.isArray(casinoGeos) || casinoGeos.length === 0) return;
    if (activeGeo && casinoGeos.includes(activeGeo)) return;
    if (activeGeo && !casinoGeos.includes(activeGeo)) {
      setActiveGeo(casinoGeos[0]);
      return;
    }
    if (!activeGeo) setActiveGeo(casinoGeos[0]);
  }, [casinoGeos, activeGeo]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (activeGeo?.trim()) next.set('geo', activeGeo.trim());
        else next.delete('geo');
        if (activeTab && activeTab !== 'overview') next.set('tab', activeTab);
        else next.delete('tab');
        return next;
      },
      { replace: true },
    );
  }, [activeGeo, activeTab, setSearchParams]);

  const { data: profileResp, isLoading: profileLoading } = useGetCasinoProfileQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as any,
  );
  useGetCasinoProfileHistoryQuery({ casinoId, limit: 200 }, { skip: !casinoId } as any);
  const [updateProfile, { isLoading: saving }] = useUpdateCasinoProfileMutation();
  const [form] = Form.useForm();
  const { data: geos } = useGetGeosQuery();

  const geoOptions = useMemo(() => {
    const allowed = new Set(casino?.geo ?? []);
    return (geos ?? [])
      .filter((g) => allowed.has(g.code))
      .map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` }));
  }, [geos, casino?.geo]);

  const items: CasinoProfileItem[] = profileResp?.profile ?? [];

  const initialValues = useMemo(() => {
    const v: any = {};
    for (const it of items) {
      v[`f_${it.field.id}`] = it.value;
      if (it.field.field_type === 'boolean') v[`f_${it.field.id}`] = !!it.value;
    }
    return v;
  }, [items]);

  // Image gallery
  const IMAGES_PAGE_SIZE = 12;
  const [imagesPage, setImagesPage] = useState(1);
  const { data: images = [] } = useGetCasinoImagesQuery(casinoId, { skip: !casinoId } as any);
  const paginatedImages = useMemo(() => {
    const start = (imagesPage - 1) * IMAGES_PAGE_SIZE;
    return images.slice(start, start + IMAGES_PAGE_SIZE);
  }, [images, imagesPage]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payloadItems = items.map((it) => ({
        field_id: it.field.id,
        value_json: serializeValue(it.field, values[`f_${it.field.id}`]),
      }));
      await updateProfile({ casinoId, items: payloadItems, geo: activeGeo }).unwrap();
      message.success('Профиль сохранён');
      nav(`/casinos/${casinoId}`);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.data?.error ?? 'Ошибка сохранения профиля');
    }
  };

  if (!casinoId) return <Card>Неверный id казино</Card>;
  if (casinoLoading || profileLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const sharedSectionProps = { casinoId, activeGeo, geoOptions };

  const overviewTab = (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* General info */}
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

      {/* Custom fields form */}
      <Card size="small" title={`Дополнительные поля${activeGeo ? ` (${activeGeo})` : ''}`}>
        {items.length === 0 ? (
          <Typography.Text type="secondary">Нет дополнительных полей для этого профиля.</Typography.Text>
        ) : (
          <Form form={form} layout="vertical" initialValues={initialValues} key={`${casinoId}-${activeGeo}`}>
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
                      {it.field.description && (
                        <Tooltip title={it.field.description}><InfoCircleOutlined style={{ fontSize: 12 }} /></Tooltip>
                      )}
                      {it.field.is_required && <Badge status="processing" text="required" />}
                    </Space>
                  }
                >
                  <Form.Item
                    name={`f_${it.field.id}`}
                    valuePropName={valuePropNameFor(it.field)}
                    rules={it.field.is_required ? [{ required: true, message: 'Обязательное поле' }] : []}
                    style={{ marginBottom: 0, maxWidth: 400 }}
                  >
                    {buildFieldInput(it.field)}
                  </Form.Item>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Form>
        )}
      </Card>

      {/* Images gallery */}
      <Card size="small" title={<Space><PictureOutlined /><span>Изображения ({images.length})</span></Space>}>
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
                      <Image src={img.url} alt={img.original_name || ''} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      {(img.label || img.username) && (
                        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}
                          ellipsis={{ tooltip: img.label || img.username }}
                        >{img.label || img.username}</Typography.Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            </Image.PreviewGroup>
            {images.length > IMAGES_PAGE_SIZE && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination current={imagesPage} total={images.length} pageSize={IMAGES_PAGE_SIZE}
                  onChange={(p) => setImagesPage(p)} showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Accounts */}
      <Card size="small" title={<Space><UserOutlined /><span>Аккаунты</span></Space>}>
        <AccountEditSection {...sharedSectionProps} />
      </Card>

      {/* Screenshots */}
      <Card size="small" title={<Space><CameraOutlined /><span>Скриншоты</span></Space>}>
        <ScreenshotsEditSection {...sharedSectionProps} defaultUrl={casino?.website} />
      </Card>

      {/* Profile settings */}
      <Card size="small" title={<Space><SettingOutlined /><span>Настройки профиля</span></Space>}>
        <ProfileSettingsTable casinoId={casinoId} activeGeo={activeGeo} readOnly={false} />
      </Card>

      {/* Bonuses */}
      <Card size="small" title={<Space><GiftOutlined /><span>Бонусы</span></Space>}>
        <BonusEditSection {...sharedSectionProps} />
      </Card>

      {/* Promos */}
      <Card size="small" title={<Space><ThunderboltOutlined /><span>Промо</span></Space>}>
        <PromoEditSection {...sharedSectionProps} />
      </Card>

      {/* Providers */}
      <Card size="small" title={<Space><AppstoreOutlined /><span>Провайдеры</span></Space>}>
        <ProvidersEditSection casinoId={casinoId} activeGeo={activeGeo} />
      </Card>

      {/* Payments */}
      <Card size="small" title={<Space><CreditCardOutlined /><span>Платёжные решения</span></Space>}>
        <PaymentEditSection {...sharedSectionProps} />
      </Card>

      {/* Emails */}
      <Card size="small" title={<Space><MailOutlined /><span>Почта</span></Space>}>
        <EmailEditSection casinoId={casinoId} />
      </Card>

      {/* Comments */}
      <Card size="small" title={<Space><CommentOutlined /><span>Комментарии</span></Space>}>
        <CommentsEditSection casinoId={casinoId} />
      </Card>
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
      children: <Card size="small" title={<Space><GiftOutlined /><span>Бонусы</span></Space>}><BonusEditSection {...sharedSectionProps} /></Card>,
    },
    {
      key: 'promos',
      label: <Space size={6}><ThunderboltOutlined />Промо</Space>,
      children: <Card size="small" title={<Space><ThunderboltOutlined /><span>Промо</span></Space>}><PromoEditSection {...sharedSectionProps} /></Card>,
    },
    {
      key: 'payments',
      label: <Space size={6}><CreditCardOutlined />Платежи</Space>,
      children: <Card size="small" title={<Space><CreditCardOutlined /><span>Платёжные решения</span></Space>}><PaymentEditSection {...sharedSectionProps} /></Card>,
    },
    {
      key: 'accounts',
      label: <Space size={6}><UserOutlined />Аккаунты</Space>,
      children: <Card size="small" title={<Space><UserOutlined /><span>Аккаунты</span></Space>}><AccountEditSection {...sharedSectionProps} /></Card>,
    },
    {
      key: 'screenshots',
      label: <Space size={6}><CameraOutlined />Скриншоты</Space>,
      children: <Card size="small" title={<Space><CameraOutlined /><span>Скриншоты</span></Space>}><ScreenshotsEditSection {...sharedSectionProps} defaultUrl={casino?.website} /></Card>,
    },
    {
      key: 'providers',
      label: <Space size={6}><AppstoreOutlined />Провайдеры</Space>,
      children: <Card size="small" title={<Space><AppstoreOutlined /><span>Провайдеры</span></Space>}><ProvidersEditSection casinoId={casinoId} activeGeo={activeGeo} /></Card>,
    },
    {
      key: 'emails',
      label: <Space size={6}><MailOutlined />Почта</Space>,
      children: <Card size="small" title={<Space><MailOutlined /><span>Почта</span></Space>}><EmailEditSection casinoId={casinoId} /></Card>,
    },
    {
      key: 'comments',
      label: <Space size={6}><CommentOutlined />Комментарии</Space>,
      children: <Card size="small" title={<Space><CommentOutlined /><span>Комментарии</span></Space>}><CommentsEditSection casinoId={casinoId} /></Card>,
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
              {casino?.website && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <a href={casino.website} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                    {casino.website}
                  </a>
                </Typography.Text>
              )}
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
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{ borderRadius: token.borderRadiusLG, height: 36, fontWeight: 500 }}
            >
              Сохранить
            </Button>
          </Space>
        </div>
      </div>

      {/* Tabs */}
      <Card
        size="small"
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="middle"
          tabBarStyle={{ marginBottom: 16 }}
          destroyInactiveTabPane={false}
        />
      </Card>
    </div>
  );
}
