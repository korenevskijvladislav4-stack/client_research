import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  BulbOutlined,
  EyeOutlined,
  InboxOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { resolvePublicUploadUrl } from '../../config/api';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useAppSelector } from '../../hooks/redux';
import type { BonusCategory, BonusKind, BonusType } from '../../store/api/casinoBonusApi';
import { BonusFormProfileCore } from '../../components/casinoForms/BonusFormProfileCore';
import { PromoFormProfileCore } from '../../components/casinoForms/PromoFormProfileCore';
import {
  useGetAiEmailProposalsQuery,
  useGetAiEmailProposalQuery,
  useMarkAiEmailProposalViewedMutation,
  useRejectAiEmailProposalMutation,
  useApproveAiEmailProposalBonusMutation,
  useApproveAiEmailProposalPromoMutation,
  type AiEmailProposalListItem,
  type AiEmailProposalType,
} from '../../store/api/aiEmailProposalsApi';

type DescriptionItem = NonNullable<DescriptionsProps['items']>[number];

/** Подписи полей как в анкете казино («Дополнительные поля») */
function profileStyleFieldLabel(text: string) {
  return (
    <Typography.Text strong style={{ fontSize: 13, color: 'inherit' }}>
      {text}
    </Typography.Text>
  );
}

function viewedStateTag(viewedAt: string | null | undefined) {
  if (viewedAt) {
    return <Tag color="processing">Просмотрено</Tag>;
  }
  return <Tag>Не просмотрено</Tag>;
}

function proposalWorkflowStatusTag(status: string) {
  if (status === 'pending') {
    return <Tag color="gold">Ожидает</Tag>;
  }
  if (status === 'approved') {
    return <Tag color="success">Принято</Tag>;
  }
  return <Tag color="error">Отклонено</Tag>;
}

function screenshotFullUrl(pathOrUrl: string | null | undefined): string | undefined {
  const u = resolvePublicUploadUrl(pathOrUrl);
  return u || undefined;
}

function formatProposalKind(type: AiEmailProposalType): string {
  return type === 'bonus' ? 'Бонусы' : 'Промо';
}

function proposalKindTag(type: AiEmailProposalType) {
  return <Tag color={type === 'bonus' ? 'blue' : 'purple'}>{formatProposalKind(type)}</Tag>;
}

function formatProposalDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dayjs(iso).format('DD.MM.YYYY HH:mm');
}

function formatGeoFromEmail(
  code: string | null | undefined,
  geos: { code: string; name: string }[],
): string {
  if (!code?.trim()) return '—';
  const row = geos.find((g) => g.code === code);
  return row ? `${row.code} — ${row.name}` : code;
}

/** GEO в форме бонуса/промо: сначала ящик из письма, затем подсказка ИИ (игнорируем «ALL» как «нет данных»). */
function resolveGeoFormValue(
  detail: {
    suggested_geo?: string | null;
    emails?: { geo?: string | null } | null;
  },
  payload: Record<string, unknown>,
): string[] {
  const emailGeo = detail.emails?.geo?.trim();
  if (emailGeo) {
    return [emailGeo.toUpperCase()];
  }
  const suggested = detail.suggested_geo?.trim();
  if (suggested && suggested.toUpperCase() !== 'ALL') {
    return [suggested.toUpperCase()];
  }
  const pg = payload.geo;
  if (typeof pg === 'string' && pg.trim() && pg.trim().toUpperCase() !== 'ALL') {
    return [pg.trim().toUpperCase()];
  }
  if (Array.isArray(pg)) {
    const codes = pg
      .map((x) => String(x).trim().toUpperCase())
      .filter((c) => c.length > 0 && c !== 'ALL');
    if (codes.length > 0) return codes;
  }
  if (suggested) {
    return [suggested.toUpperCase()];
  }
  return ['ALL'];
}

function proposalMetaItems(params: {
  casinoName: string;
  proposalType: AiEmailProposalType;
  viewedAt: string | null | undefined;
  status: string;
  createdAt: string | null | undefined;
  emailGeoLabel: string;
}): DescriptionItem[] {
  return [
    { key: 'casino', label: profileStyleFieldLabel('Казино'), children: params.casinoName || '—' },
    { key: 'kind', label: profileStyleFieldLabel('Предложение'), children: proposalKindTag(params.proposalType) },
    {
      key: 'viewed',
      label: profileStyleFieldLabel('Состояние'),
      children: viewedStateTag(params.viewedAt),
    },
    {
      key: 'status',
      label: profileStyleFieldLabel('Статус'),
      children: proposalWorkflowStatusTag(params.status),
    },
    {
      key: 'created',
      label: profileStyleFieldLabel('Дата предложения'),
      children: formatProposalDate(params.createdAt),
    },
    { key: 'geo', label: profileStyleFieldLabel('ГЕО из письма'), children: params.emailGeoLabel },
  ];
}

/** Как в CasinoProfileView: «Дополнительные поля» */
const proposalListDescriptionsStyles = {
  label: { width: 200, minWidth: 200 },
  content: { minWidth: 0 },
} as const;

const proposalDrawerDescriptionsStyles = {
  label: { width: 200, minWidth: 200 },
  content: { minWidth: 300 },
} as const;

export default function AiProposals() {
  const { token } = theme.useToken();
  const isAdmin = useAppSelector((s) => s.auth.user?.role === 'admin');
  const [tab, setTab] = useState<'new' | 'seen' | 'all'>('new');
  const viewedArg: boolean | 'all' = tab === 'all' ? 'all' : tab === 'seen';
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);
  const [filterCasinoId, setFilterCasinoId] = useState<number | undefined>(undefined);

  const { data: rows = [], isLoading, refetch } = useGetAiEmailProposalsQuery({
    viewed: viewedArg,
    ...(filterGeo?.trim() ? { geo: filterGeo.trim() } : {}),
    ...(filterCasinoId != null && filterCasinoId > 0 ? { casinoId: filterCasinoId } : {}),
  });
  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();

  const [drawerId, setDrawerId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useGetAiEmailProposalQuery(drawerId!, {
    skip: drawerId == null,
  });

  const [markViewed] = useMarkAiEmailProposalViewedMutation();
  const [rejectProposal, { isLoading: rejecting }] = useRejectAiEmailProposalMutation();
  const [approveBonus, { isLoading: approvingB }] = useApproveAiEmailProposalBonusMutation();
  const [approvePromo, { isLoading: approvingP }] = useApproveAiEmailProposalPromoMutation();

  const [form] = Form.useForm();
  /** Повторный сев при появлении GEO в письме после первого ответа API */
  const proposalSeedKeyRef = useRef<string>('');

  const [bonusCategory, setBonusCategory] = useState<BonusCategory>('casino');
  const [selectedBonusKind, setSelectedBonusKind] = useState<BonusKind | undefined>();
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | undefined>();

  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos],
  );
  const geoOptions = useMemo(
    () => geos.filter((g) => g.is_active !== false).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );

  useEffect(() => {
    if (drawerId == null) proposalSeedKeyRef.current = '';
  }, [drawerId]);

  useEffect(() => {
    if (!detail || detail.id !== drawerId) return;

    const p = (detail.payload_json || {}) as Record<string, unknown>;
    const emailGeoKey = detail.emails?.geo?.trim() ?? '';
    const suggestedKey = detail.suggested_geo?.trim() ?? '';
    const seedKey = `${detail.id}|eg:${emailGeoKey}|sg:${suggestedKey}`;
    if (proposalSeedKeyRef.current === seedKey) return;
    proposalSeedKeyRef.current = seedKey;

    if (detail.proposal_type === 'bonus') {
      setBonusCategory((p.bonus_category as BonusCategory) || 'casino');
      setSelectedBonusKind(p.bonus_kind as BonusKind | undefined);
      setSelectedBonusType(p.bonus_type as BonusType | undefined);
      const { casino_name: _cn, geo: _g, ...restPayload } = p;
      form.setFieldsValue({
        ...restPayload,
        casino_id: detail.suggested_casino_id ?? undefined,
        geo: resolveGeoFormValue(detail, p),
        name:
          typeof p.name === 'string' && p.name
            ? [p.name]
            : detail.emails?.subject
              ? [detail.emails.subject]
              : [],
        bonus_category: (p.bonus_category as string) || 'casino',
        bonus_kind: p.bonus_kind,
        bonus_type: p.bonus_type,
      });
    } else {
      setBonusCategory('casino');
      setSelectedBonusKind(undefined);
      setSelectedBonusType(undefined);
      const { casino_name: _cn, ...restPayload } = p;
      const ps = typeof p.period_start === 'string' ? p.period_start : null;
      const pe = typeof p.period_end === 'string' ? p.period_end : null;
      form.setFieldsValue({
        ...restPayload,
        casino_id: detail.suggested_casino_id ?? undefined,
        geo: resolveGeoFormValue(detail, p),
        name: (typeof p.name === 'string' && p.name) || detail.emails?.subject || 'Из письма',
        promo_type: typeof p.promo_type === 'string' && p.promo_type ? [p.promo_type] : undefined,
        period: ps && pe ? [dayjs(ps), dayjs(pe)] : undefined,
        period_type: (p.period_type as string) || 'fixed',
      });
    }

    if (!detail.viewed_at) {
      void markViewed(detail.id).unwrap().catch(() => undefined);
    }
  }, [detail, drawerId, form, markViewed]);

  const openDrawer = (id: number) => setDrawerId(id);

  const canAct = isAdmin && detail?.status === 'pending';

  const handleReject = async () => {
    if (!detail) return;
    try {
      await rejectProposal(detail.id).unwrap();
      message.success('Отклонено');
      setDrawerId(null);
      void refetch();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка');
    }
  };

  const normalizeBonusBody = (vals: Record<string, unknown>, casinoId: number) => {
    const geoVal = Array.isArray(vals.geo)
      ? vals.geo[vals.geo.length - 1] || vals.geo[0]
      : vals.geo;
    const nameVal = Array.isArray(vals.name)
      ? vals.name[vals.name.length - 1] || vals.name[0]
      : vals.name;
    const { casino_id: _c, ...rest } = vals;
    return {
      ...rest,
      casino_id: casinoId,
      geo: typeof geoVal === 'string' ? geoVal : String(geoVal ?? 'ALL'),
      name: typeof nameVal === 'string' ? nameVal : String(nameVal ?? 'Бонус'),
      bonus_category: bonusCategory,
    };
  };

  const normalizePromoBody = (vals: Record<string, unknown>, casinoId: number) => {
    const period = vals.period as [dayjs.Dayjs | null, dayjs.Dayjs | null] | undefined;
    const [ps, pe] = period ?? [null, null];
    const periodType = (vals.period_type as string) ?? 'fixed';
    const promoTypeVal = Array.isArray(vals.promo_type)
      ? vals.promo_type[0]
      : (vals.promo_type as string | undefined);
    const geoArr = Array.isArray(vals.geo) ? vals.geo : vals.geo != null ? [vals.geo] : [];
    const geoFirst = String(geoArr[0] ?? 'ALL').slice(0, 10);
    const { casino_id: _c, period: _p, ...rest } = vals;
    return {
      ...rest,
      casino_id: casinoId,
      geo: geoFirst,
      promo_type: promoTypeVal ?? null,
      period_type: periodType,
      period_start:
        periodType === 'fixed' && ps ? dayjs(ps).format('YYYY-MM-DD') : null,
      period_end:
        periodType === 'fixed' && pe ? dayjs(pe).format('YYYY-MM-DD') : null,
      has_participation_button: Boolean(vals.has_participation_button),
    };
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      const vals = await form.validateFields();
      const casinoId = Number(vals.casino_id);
      if (!casinoId) {
        message.warning('Выберите казино');
        return;
      }
      if (detail.proposal_type === 'bonus') {
        const body = normalizeBonusBody(vals as Record<string, unknown>, casinoId);
        await approveBonus({ id: detail.id, body }).unwrap();
        message.success('Бонус создан, скрин письма прикреплён');
      } else {
        const body = normalizePromoBody(vals as Record<string, unknown>, casinoId);
        await approvePromo({ id: detail.id, body }).unwrap();
        message.success('Промо создано, скрин письма прикреплён');
      }
      setDrawerId(null);
      void refetch();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  const imgSrc = screenshotFullUrl(detail?.emails?.screenshot_url);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeaderCard
        title={
          <Space>
            <BulbOutlined />
            <span>Предложения ИИ</span>
          </Space>
        }
      />

      {/* Фильтры — как на странице «Казино» */}
      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Select
            allowClear
            placeholder="GEO письма"
            style={{ width: 200 }}
            options={geoOptions}
            value={filterGeo}
            onChange={(v) => setFilterGeo(v)}
            showSearch
            optionFilterProp="label"
            popupMatchSelectWidth={false}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Казино"
            style={{ width: 260 }}
            options={casinoOptions}
            value={filterCasinoId}
            onChange={(v) => setFilterCasinoId(v)}
            popupMatchSelectWidth={false}
          />
          {(filterGeo?.trim() || (filterCasinoId != null && filterCasinoId > 0)) && (
            <Button
              onClick={() => {
                setFilterGeo(undefined);
                setFilterCasinoId(undefined);
              }}
            >
              Сбросить
            </Button>
          )}
        </Space>
      </Card>

      <div
        style={{
          padding: 6,
          marginBottom: 20,
          background: token.colorFillAlter,
          borderRadius: token.borderRadiusLG * 1.25,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: `0 1px 2px ${token.colorFillSecondary}`,
        }}
      >
        <Segmented
          block
          size="large"
          value={tab}
          onChange={(v) => setTab(v as 'new' | 'seen' | 'all')}
          options={[
            {
              value: 'new',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <InboxOutlined />
                  Не просмотрены
                </span>
              ),
            },
            {
              value: 'seen',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <EyeOutlined />
                  Просмотрены
                </span>
              ),
            },
            {
              value: 'all',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <UnorderedListOutlined />
                  Все
                </span>
              ),
            },
          ]}
        />
      </div>

      {isLoading ? (
        <Typography.Text type="secondary">Загрузка…</Typography.Text>
      ) : rows.length === 0 ? (
        <Card styles={{ body: { padding: 32, textAlign: 'center' } }}>
          <Typography.Text type="secondary">Нет предложений в этой вкладке</Typography.Text>
        </Card>
      ) : (
        <Row gutter={[18, 18]}>
          {rows.map((r: AiEmailProposalListItem) => {
            const thumb = screenshotFullUrl(r.emails?.screenshot_url);
            const casinoLabel = r.casinos?.name || r.casino_name_guess || '—';
            const emailGeoLabel = formatGeoFromEmail(r.emails?.geo, geos);
            const meta = proposalMetaItems({
              casinoName: casinoLabel,
              proposalType: r.proposal_type,
              viewedAt: r.viewed_at,
              status: r.status,
              createdAt: r.created_at,
              emailGeoLabel,
            });
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={r.id}>
                <Card
                  hoverable
                  onClick={() => openDrawer(r.id)}
                  styles={{
                    body: { padding: 0 },
                  }}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    overflow: 'hidden',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      minHeight: 132,
                      background: token.colorFillQuaternary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        preview={false}
                        style={{ width: '100%', height: 148, objectFit: 'cover' }}
                      />
                    ) : (
                      <Typography.Text type="secondary" style={{ padding: 20 }}>
                        Нет скриншота
                      </Typography.Text>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    <Card
                      size="small"
                      title={
                        <Typography.Text strong style={{ fontSize: 14 }}>
                          Данные предложения
                        </Typography.Text>
                      }
                      styles={{
                        header: {
                          minHeight: 40,
                          padding: '8px 12px',
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        },
                        body: { padding: 0 },
                      }}
                    >
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        colon
                        styles={proposalListDescriptionsStyles}
                        items={meta}
                      />
                    </Card>
                    <Typography.Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ marginTop: 12, marginBottom: 0, fontSize: 12, lineHeight: 1.45 }}
                    >
                      {r.emails?.subject || 'Без темы'}
                    </Typography.Paragraph>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Drawer
        title={detail ? `Предложение #${detail.id}` : 'Предложение'}
        width={960}
        open={drawerId != null}
        onClose={() => setDrawerId(null)}
        destroyOnClose
        extra={
          canAct ? (
            <Space>
              <Button danger icon={<CloseOutlined />} loading={rejecting} onClick={() => void handleReject()}>
                Отклонить
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={approvingB || approvingP}
                onClick={() => void handleApprove()}
              >
                Принять в CRM
              </Button>
            </Space>
          ) : null
        }
      >
        {detailLoading ? (
          <Typography.Text type="secondary">Загрузка…</Typography.Text>
        ) : detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {!isAdmin ? (
              <Alert
                type="info"
                showIcon
                message="Только просмотр"
                description="Принятие и отклонение доступны администратору."
              />
            ) : null}
            {detail.error_message ? <Alert type="warning" message={detail.error_message} /> : null}

            <Card
              size="small"
              title={
                <Typography.Text strong style={{ fontSize: 15 }}>
                  Сведения о предложении
                </Typography.Text>
              }
              styles={{
                header: {
                  fontWeight: 600,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                },
                body: { padding: 0 },
              }}
            >
              <Descriptions
                bordered
                size="small"
                column={1}
                colon
                styles={proposalDrawerDescriptionsStyles}
                items={[
                  ...proposalMetaItems({
                    casinoName: detail.casinos?.name || detail.casino_name_guess || '—',
                    proposalType: detail.proposal_type,
                    viewedAt: detail.viewed_at,
                    status: detail.status,
                    createdAt: detail.created_at,
                    emailGeoLabel: formatGeoFromEmail(detail.emails?.geo, geos),
                  }),
                  {
                    key: 'subject',
                    label: profileStyleFieldLabel('Тема письма'),
                    children: detail.emails?.subject || '—',
                  },
                  {
                    key: 'from',
                    label: profileStyleFieldLabel('Отправитель'),
                    children: (() => {
                      const fn = detail.emails?.from_name?.trim();
                      const fe = detail.emails?.from_email?.trim();
                      if (fn && fe) return `${fn} <${fe}>`;
                      return fn || fe || '—';
                    })(),
                  },
                ]}
              />
            </Card>

            {imgSrc ? (
              <div>
                <Typography.Text strong>Скриншот письма</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Image src={imgSrc} alt="email" style={{ maxWidth: '100%', borderRadius: 8 }} />
                </div>
              </div>
            ) : (
              <Alert type="info" message="Скриншот письма недоступен" />
            )}

            <Collapse
              size="small"
              items={[
                {
                  key: 'raw',
                  label: 'Сырой JSON от ИИ',
                  children: (
                    <Input.TextArea
                      readOnly
                      rows={8}
                      value={JSON.stringify(detail.payload_json ?? {}, null, 2)}
                      style={{ fontFamily: 'monospace', fontSize: 11 }}
                    />
                  ),
                },
              ]}
            />

            {detail.status !== 'pending' ? (
              <Typography.Text type="secondary">
                Решение принято
                {detail.resolved_bonus_id ? ` · бонус #${detail.resolved_bonus_id}` : ''}
                {detail.resolved_promo_id ? ` · промо #${detail.resolved_promo_id}` : ''}
              </Typography.Text>
            ) : null}

            <Form form={form} layout="vertical" disabled={!canAct}>
              <Card size="small" title="Привязка к казино" style={{ marginBottom: 16 }}>
                <Form.Item name="casino_id" label="Казино" rules={[{ required: true, message: 'Выберите казино' }]}>
                  <Select showSearch optionFilterProp="label" options={casinoOptions} placeholder="Казино" />
                </Form.Item>
              </Card>

              {detail.proposal_type === 'bonus' ? (
                <BonusFormProfileCore
                  form={form}
                  bonusCategory={bonusCategory}
                  setBonusCategory={setBonusCategory}
                  selectedBonusKind={selectedBonusKind}
                  setSelectedBonusKind={setSelectedBonusKind}
                  selectedBonusType={selectedBonusType}
                  setSelectedBonusType={setSelectedBonusType}
                  geoOptions={geoOptions}
                />
              ) : (
                <PromoFormProfileCore geoOptions={geoOptions} editing />
              )}
            </Form>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
