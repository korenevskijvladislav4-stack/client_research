import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckOutlined, CloseOutlined, BulbOutlined, ExperimentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getApiBaseUrl } from '../../config/api';
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
  useDevTriggerAiEmailProposalMutation,
  type AiEmailProposalListItem,
  type AiEmailProposalType,
} from '../../store/api/aiEmailProposalsApi';

function screenshotFullUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const origin = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function statusTag(status: string) {
  if (status === 'pending') return <Tag>Ожидает</Tag>;
  if (status === 'approved') return <Tag color="success">Принято</Tag>;
  return <Tag color="error">Отклонено</Tag>;
}

function viewedLabel(viewedAt: string | null | undefined) {
  if (viewedAt) return <Tag color="processing">Просмотрено</Tag>;
  return <Tag color="default">Не просмотрено</Tag>;
}

export default function AiProposals() {
  const isAdmin = useAppSelector((s) => s.auth.user?.role === 'admin');
  const [tab, setTab] = useState<string>('new');
  const viewed = tab === 'seen';

  const { data: rows = [], isLoading, refetch } = useGetAiEmailProposalsQuery({ viewed });
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
  const [devTrigger, { isLoading: devLoading }] = useDevTriggerAiEmailProposalMutation();

  const [form] = Form.useForm();
  const seededProposalId = useRef<number | null>(null);

  const [bonusCategory, setBonusCategory] = useState<BonusCategory>('casino');
  const [selectedBonusKind, setSelectedBonusKind] = useState<BonusKind | undefined>();
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | undefined>();

  const [devEmailId, setDevEmailId] = useState<string>('');
  const [devType, setDevType] = useState<AiEmailProposalType>('bonus');
  const [devForce, setDevForce] = useState(false);

  const casinoOptions = useMemo(
    () => casinos.map((c) => ({ value: c.id, label: c.name })),
    [casinos],
  );
  const geoOptions = useMemo(
    () => geos.filter((g) => g.is_active !== false).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos],
  );

  useEffect(() => {
    if (drawerId == null) seededProposalId.current = null;
  }, [drawerId]);

  useEffect(() => {
    if (!detail || detail.id !== drawerId) return;
    if (seededProposalId.current === detail.id) return;
    seededProposalId.current = detail.id;

    const p = (detail.payload_json || {}) as Record<string, unknown>;

    if (detail.proposal_type === 'bonus') {
      setBonusCategory((p.bonus_category as BonusCategory) || 'casino');
      setSelectedBonusKind(p.bonus_kind as BonusKind | undefined);
      setSelectedBonusType(p.bonus_type as BonusType | undefined);
      const { casino_name: _cn, geo: _g, ...restPayload } = p;
      form.setFieldsValue({
        ...restPayload,
        casino_id: detail.suggested_casino_id ?? undefined,
        geo: detail.suggested_geo
          ? [detail.suggested_geo]
          : typeof p.geo === 'string'
            ? [p.geo]
            : Array.isArray(p.geo)
              ? p.geo
              : ['ALL'],
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
        geo: detail.suggested_geo
          ? [detail.suggested_geo]
          : typeof p.geo === 'string'
            ? [p.geo]
            : ['ALL'],
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

  const handleDevTrigger = async () => {
    const id = Number(devEmailId);
    if (!id || Number.isNaN(id)) {
      message.warning('Введите числовой ID письма');
      return;
    }
    try {
      const res = await devTrigger({ emailId: id, type: devType, force: devForce }).unwrap();
      if (res.skipped) {
        message.info(res.message ?? 'Уже есть предложение');
      } else {
        message.success('ИИ обработал письмо');
      }
      void refetch();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка');
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
        description="Письма по темам с действием «Бонусы» или «Промо»: ИИ анализирует скриншот и заполняет форму как в анкете казино. Администратор может принять запись в CRM; все пользователи могут просматривать."
      />

      {isAdmin ? (
        <Card size="small" title={<Space><ExperimentOutlined />Тест: сгенерировать предложение по письму</Space>}>
          <Space wrap align="start">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">ID письма (emails.id)</Typography.Text>
              <InputNumber
                min={1}
                placeholder="например 42"
                value={devEmailId ? Number(devEmailId) : undefined}
                onChange={(v) => setDevEmailId(v != null ? String(v) : '')}
                style={{ width: 160 }}
              />
            </Space>
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">Тип</Typography.Text>
              <Select
                style={{ width: 140 }}
                value={devType}
                onChange={(v) => setDevType(v)}
                options={[
                  { value: 'bonus', label: 'Бонус' },
                  { value: 'promo', label: 'Промо' },
                ]}
              />
            </Space>
            <Checkbox checked={devForce} onChange={(e) => setDevForce(e.target.checked)}>
              Пересоздать (удалить старое)
            </Checkbox>
            <Button type="primary" loading={devLoading} onClick={() => void handleDevTrigger()}>
              Запустить ИИ
            </Button>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Нужны скриншот письма и тема с ai_target или назначенная тема у письма. Требуется OPENAI_API_KEY на сервере.
          </Typography.Paragraph>
        </Card>
      ) : null}

      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'new', label: 'Не просмотрены' },
            { key: 'seen', label: 'Просмотрены' },
          ]}
        />
        {isLoading ? (
          <Typography.Text type="secondary">Загрузка…</Typography.Text>
        ) : rows.length === 0 ? (
          <Typography.Text type="secondary">Нет предложений</Typography.Text>
        ) : (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {rows.map((r: AiEmailProposalListItem) => {
              const thumb = screenshotFullUrl(r.emails?.screenshot_url);
              const casinoLabel = r.casinos?.name || r.casino_name_guess || '—';
              return (
                <Col xs={24} sm={12} lg={8} key={r.id}>
                  <Card
                    hoverable
                    onClick={() => openDrawer(r.id)}
                    styles={{ body: { padding: 12 } }}
                  >
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Typography.Text strong ellipsis style={{ width: '100%' }}>
                        {casinoLabel}
                      </Typography.Text>
                      <Space wrap size={6}>
                        <Tag color={r.proposal_type === 'bonus' ? 'blue' : 'purple'}>
                          {r.proposal_type === 'bonus' ? 'Бонус' : 'Промо'}
                        </Tag>
                        {statusTag(r.status)}
                        {viewedLabel(r.viewed_at)}
                      </Space>
                      <div
                        style={{
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: 'var(--ant-color-fill-quaternary, #f5f5f5)',
                          minHeight: 120,
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
                            style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }}
                          />
                        ) : (
                          <Typography.Text type="secondary" style={{ padding: 16 }}>
                            Нет скриншота
                          </Typography.Text>
                        )}
                      </div>
                      <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, width: '100%' }}>
                        {r.emails?.subject || 'Без темы'}
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

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

            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <Typography.Text strong>Письмо: </Typography.Text>
              {detail.emails?.subject || '—'}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              От: {detail.emails?.from_name} &lt;{detail.emails?.from_email}&gt;
            </Typography.Text>

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
