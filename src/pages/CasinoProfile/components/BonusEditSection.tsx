import { useState, useMemo } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Segmented,
  Space,
  Table,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  RobotOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  useGetCasinoBonusesQuery,
  useCreateCasinoBonusMutation,
  useUpdateCasinoBonusMutation,
  useDeleteCasinoBonusMutation,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  useDeleteBonusImageMutation,
  useAnalyzeBonusImageMutation,
  CasinoBonus,
  BonusCategory,
  BonusKind,
  BonusType,
  CasinoBonusImage,
} from '../../../store/api/casinoBonusApi';
import {
  useGetBonusNamesQuery,
  useCreateBonusNameMutation,
} from '../../../store/api/referenceApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../../store/api/geoApi';

interface BonusEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

const fmt = (n: unknown) => {
  const num = Number(n);
  if (isNaN(num)) return n;
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};

const fmtAmount = (value: unknown, currency?: string | null) => {
  if (value == null) return '—';
  const formatted = fmt(value);
  return currency ? `${formatted} ${currency}` : formatted;
};

export default function BonusEditSection({ casinoId, activeGeo, geoOptions }: BonusEditSectionProps) {
  const { token } = theme.useToken();
  const { data: bonuses, isLoading: bonusesLoading } = useGetCasinoBonusesQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as any,
  );
  const [createBonus] = useCreateCasinoBonusMutation();
  const [updateBonus] = useUpdateCasinoBonusMutation();
  const [deleteBonus] = useDeleteCasinoBonusMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<CasinoBonus | null>(null);
  const [bonusForm] = Form.useForm();
  const [bonusCategory, setBonusCategory] = useState<BonusCategory>('casino');
  const [selectedBonusKind, setSelectedBonusKind] = useState<BonusKind | undefined>();
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | undefined>();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [analyzeBonusImage, { isLoading: analyzingImage }] = useAnalyzeBonusImageMutation();

  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: editingBonus?.id ?? 0 },
    { skip: !editingBonus?.id || !casinoId },
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();
  const [deleteBonusImage] = useDeleteBonusImageMutation();

  const { data: bonusNames } = useGetBonusNamesQuery();
  const [createBonusName] = useCreateBonusNameMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();

  const bonusNameOptions = useMemo(
    () => (bonusNames ?? []).map((b) => ({ value: b.name, label: b.name })),
    [bonusNames],
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setBonusCategory('casino');
    setSelectedBonusKind(undefined);
    setSelectedBonusType(undefined);
    setEditingBonus(null);
    setPendingImages([]);
  };

  const openCreate = () => {
    setEditingBonus(null);
    bonusForm.resetFields();
    if (activeGeo) bonusForm.setFieldsValue({ geo: activeGeo });
    setDrawerOpen(true);
  };

  const openEdit = (b: CasinoBonus) => {
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
    setDrawerOpen(true);
  };

  const handleAnalyzeImage = async (file: File) => {
    setPendingImages((prev) => [...prev, file]);
    const currentGeo = bonusForm.getFieldValue('geo');
    const geoVal = Array.isArray(currentGeo) ? currentGeo[currentGeo.length - 1] || currentGeo[0] : currentGeo;
    try {
      const suggestions = await analyzeBonusImage({
        casinoId,
        geo: typeof geoVal === 'string' ? geoVal : undefined,
        file,
      }).unwrap();

      if (!suggestions || Object.keys(suggestions).length === 0) {
        message.info('Не удалось распознать данные бонуса с картинки');
        return;
      }

      const currentValues = bonusForm.getFieldsValue();
      const patch: Record<string, unknown> = {};
      const isEmpty = (val: unknown) =>
        val === undefined || val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0);

      if ((suggestions as any).name && isEmpty(currentValues.name)) {
        patch.name = [(suggestions as any).name];
      }

      const simpleKeys: (keyof CasinoBonus)[] = [
        'bonus_category', 'bonus_kind', 'bonus_type', 'bonus_value', 'bonus_unit',
        'currency', 'freespins_count', 'freespin_value', 'freespin_game',
        'cashback_percent', 'cashback_period', 'min_deposit', 'max_bonus',
        'max_cashout', 'max_win_cash_value', 'max_win_cash_unit',
        'max_win_freespin_value', 'max_win_freespin_unit',
        'max_win_percent_value', 'max_win_percent_unit',
        'wagering_requirement', 'wagering_freespin', 'wagering_games',
        'wagering_time_limit', 'promo_code', 'valid_from', 'valid_to', 'notes',
      ];

      simpleKeys.forEach((key) => {
        const value = (suggestions as any)[key];
        if (value === undefined || value === null) return;
        if (isEmpty((currentValues as any)[key])) patch[key] = value;
      });

      if (Object.keys(patch).length > 0) bonusForm.setFieldsValue(patch);
      if ((suggestions as any).bonus_category) setBonusCategory((suggestions as any).bonus_category);
      if ((suggestions as any).bonus_kind) setSelectedBonusKind((suggestions as any).bonus_kind);
      if ((suggestions as any).bonus_type) setSelectedBonusType((suggestions as any).bonus_type);
      message.success('Поля бонуса заполнены по картинке');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось распознать бонус по картинке');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const geoVal = Array.isArray(values.geo) ? values.geo[values.geo.length - 1] || values.geo[0] : values.geo;
      const nameVal = Array.isArray(values.name) ? values.name[values.name.length - 1] || values.name[0] : values.name;
      const payload = { ...values, geo: geoVal, name: nameVal, bonus_category: bonusCategory };

      let savedBonus: CasinoBonus;
      if (editingBonus) {
        savedBonus = await updateBonus({ casinoId, id: editingBonus.id, patch: payload }).unwrap();
        message.success('Бонус обновлён');
      } else {
        savedBonus = await createBonus({ casinoId, ...payload }).unwrap();
        message.success('Бонус создан');
      }

      if (pendingImages.length > 0 && savedBonus.id) {
        try {
          await uploadBonusImages({ casinoId, bonusId: savedBonus.id, files: pendingImages }).unwrap();
        } catch (e: any) {
          message.error(e?.data?.error ?? 'Ошибка загрузки изображений бонуса');
        } finally {
          setPendingImages([]);
        }
      }
      closeDrawer();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения бонуса');
    }
  };

  const casinoKindOptions = [
    { value: 'deposit', label: 'Депозитный' },
    { value: 'nodeposit', label: 'Бездепозитный' },
    { value: 'cashback', label: 'Кешбек' },
    { value: 'rakeback', label: 'Рейкбек' },
  ];

  const casinoTypeOptions = [
    { value: 'cash', label: 'Кэш-бонус' },
    { value: 'freespin', label: 'Фриспин-бонус' },
    { value: 'combo', label: 'Комбинированный' },
  ];

  const sportTypeOptions = [
    { value: 'freebet', label: 'Фрибет' },
    { value: 'wagering', label: 'Вейджеринг' },
    { value: 'insurance', label: 'Страховка' },
    { value: 'accumulator', label: 'Аккумулятор' },
    { value: 'odds_boost', label: 'Повышение коэффициентов' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить бонус
        </Button>
      </div>

      <Table<CasinoBonus>
        rowKey="id"
        size="small"
        loading={bonusesLoading}
        dataSource={bonuses ?? []}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Название', dataIndex: 'name', width: 160, ellipsis: true },
          {
            title: 'Категория', dataIndex: 'bonus_category', width: 80,
            render: (v: string) => ({ casino: 'Казино', sport: 'Спорт' }[v as 'casino' | 'sport'] || v || 'Казино'),
          },
          {
            title: 'Вид', dataIndex: 'bonus_kind', width: 90,
            render: (v: BonusKind) => ({ deposit: 'Депозит', nodeposit: 'Бездеп', cashback: 'Кешбек', rakeback: 'Рейкбек' }[v] || v || '—'),
          },
          {
            title: 'Тип', dataIndex: 'bonus_type', width: 90,
            render: (v: BonusType) => ({
              cash: 'Кэш', freespin: 'FS', combo: 'Комбо', freebet: 'Фрибет',
              wagering: 'Вейджеринг', insurance: 'Страховка', accumulator: 'Аккумулятор', odds_boost: 'Повышение коэф.',
            }[v] || v || '—'),
          },
          {
            title: 'Бонус', width: 120,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.bonus_value != null) {
                parts.push(b.bonus_unit === 'percent' ? `${fmt(b.bonus_value)}%` : (b.currency ? `${fmt(b.bonus_value)} ${b.currency}` : `${fmt(b.bonus_value)}`));
              }
              if (b.freespins_count) parts.push(`${fmt(b.freespins_count)} FS`);
              if (b.cashback_percent_min != null || b.cashback_percent_max != null) {
                const from = b.cashback_percent_min != null ? fmt(b.cashback_percent_min) : null;
                const to = b.cashback_percent_max != null ? fmt(b.cashback_percent_max) : null;
                if (from != null && to != null) parts.push(`${from}–${to}%`);
                else if (from != null) parts.push(`${from}%`);
                else if (to != null) parts.push(`${to}%`);
              } else if (b.cashback_percent != null) {
                parts.push(`${fmt(b.cashback_percent)}%`);
              }
              return parts.length > 0 ? parts.join('+') : '—';
            },
          },
          { title: 'Мин.', width: 80, render: (_, b) => fmtAmount(b.min_deposit, b.currency) as React.ReactNode },
          {
            title: 'Вейджер', width: 100,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.wagering_requirement != null) parts.push(`кэш x${fmt(b.wagering_requirement)}`);
              if (b.wagering_freespin != null) parts.push(`FS x${fmt(b.wagering_freespin)}`);
              return parts.length > 0 ? parts.join(', ') : '—';
            },
          },
          {
            title: '', width: 100, align: 'right',
            render: (_, b) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(b)} />
                <Button type="link" size="small" danger icon={<DeleteOutlined />}
                  onClick={async () => {
                    try { await deleteBonus({ casinoId, id: b.id }).unwrap(); message.success('Бонус удалён'); }
                    catch (e: any) { message.error(e?.data?.error ?? 'Ошибка удаления'); }
                  }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editingBonus ? 'Редактировать бонус' : 'Новый бонус'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={620}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" onClick={() => bonusForm.submit()}>
              {editingBonus ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        }
      >
        <Form layout="vertical" form={bonusForm} onFinish={handleSubmit}>
          {/* AI Auto-fill */}
          <Card size="small" style={{ marginBottom: 16, borderStyle: 'dashed' }}>
            <div
              style={{ textAlign: 'center', padding: 8 }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault(); e.stopPropagation();
                const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                if (files.length > 0) await handleAnalyzeImage(files[0]);
              }}
              onPaste={async (e) => {
                const items = Array.from(e.clipboardData.items || []);
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) { await handleAnalyzeImage(file); break; }
                  }
                }
              }}
            >
              <RobotOutlined style={{ fontSize: 20, color: token.colorPrimary, marginBottom: 4 }} />
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Перетащите картинку бонуса — AI заполнит форму автоматически
                </Typography.Text>
              </div>
              <Upload accept="image/*" showUploadList={false}
                beforeUpload={async (file) => { await handleAnalyzeImage(file); return false; }}
              >
                <Button size="small" icon={<RobotOutlined />} loading={analyzingImage} style={{ marginTop: 8 }}>
                  Выбрать картинку
                </Button>
              </Upload>
            </div>
          </Card>

          {/* GEO + Currency */}
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Укажите GEO' }]}>
                <Select mode="tags" placeholder="RU, DE, BR..." tokenSeparators={[',', ';', ' ']} options={geoOptions}
                  onChange={async (values: string[]) => {
                    if (!values?.length) return;
                    const codes = (geos ?? []).map((g) => g.code);
                    for (const v of values.map((v) => v.toUpperCase().trim()).filter((v) => v && !codes.includes(v))) {
                      try { await createGeo({ code: v, name: v }).unwrap(); } catch {}
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="currency" label="Валюта">
                <Input placeholder="EUR" />
              </Form.Item>
            </Col>
          </Row>

          {/* Name */}
          <Form.Item name="name" label="Название бонуса" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="Выберите или введите" maxCount={1} options={bonusNameOptions}
              onChange={async (values: string[]) => {
                if (!values?.length) return;
                const existing = (bonusNames ?? []).map((b) => b.name);
                for (const name of values.filter((v) => v && !existing.includes(v))) {
                  try { await createBonusName({ name }).unwrap(); } catch {}
                }
              }}
            />
          </Form.Item>

          {/* Category */}
          <Form.Item name="bonus_category" label="Категория" initialValue="casino">
            <Segmented
              value={bonusCategory}
              options={[
                { value: 'casino', label: 'Казино' },
                { value: 'sport', label: 'Спорт' },
              ]}
              onChange={(val) => {
                const cat = val as BonusCategory;
                setBonusCategory(cat);
                bonusForm.setFieldsValue({ bonus_category: cat, bonus_kind: undefined, bonus_type: undefined });
                setSelectedBonusKind(undefined);
                setSelectedBonusType(undefined);
              }}
            />
          </Form.Item>

          {/* Kind + Type */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bonus_kind" label="Вид бонуса" rules={[{ required: true, message: 'Выберите вид' }]}>
                <Select placeholder="Вид" onChange={(val: BonusKind) => setSelectedBonusKind(val)} options={casinoKindOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonus_type" label="Тип бонуса"
                rules={[{
                  validator: (_, value) => {
                    if (selectedBonusKind === 'cashback' || selectedBonusKind === 'rakeback') return Promise.resolve();
                    return !value ? Promise.reject(new Error('Выберите тип')) : Promise.resolve();
                  },
                }]}
              >
                <Select placeholder="Тип" onChange={(val: BonusType) => setSelectedBonusType(val)}
                  options={bonusCategory === 'casino' ? casinoTypeOptions : sportTypeOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Cashback / Rakeback params */}
          {(selectedBonusKind === 'cashback' || selectedBonusKind === 'rakeback') && (
            <Card size="small" title="Параметры кешбека / рейкбека" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="cashback_percent_min" label="Мин. %">
                    <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="cashback_percent_max" label="Макс. %">
                    <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="cashback_period" label="Период">
                    <Select placeholder="Период" options={[
                      { value: 'daily', label: 'Ежедневно' },
                      { value: 'weekly', label: 'Еженедельно' },
                      { value: 'monthly', label: 'Ежемесячно' },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          {/* Casino Cash bonus */}
          {bonusCategory === 'casino' && (selectedBonusType === 'cash' || selectedBonusType === 'combo') && (
            <Card size="small" title="Кэш-бонус" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="bonus_value" label="Размер">
                    <InputNumber style={{ width: '100%' }} placeholder="100" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="bonus_unit" label="Единица">
                    <Select placeholder="Тип" options={[
                      { value: 'percent', label: '%' },
                      { value: 'amount', label: 'Фикс. сумма' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="max_bonus" label="Макс. бонус">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              {selectedBonusType === 'cash' && (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="max_win_cash_value" label="Максвин">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="max_win_cash_unit" label="Тип максвина">
                      <Select allowClear options={[
                        { value: 'fixed', label: 'Фиксированная сумма' },
                        { value: 'coefficient', label: 'Коэффициент (x)' },
                      ]} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              {selectedBonusType === 'combo' && (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="max_win_percent_value" label="Максвин">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="max_win_percent_unit" label="Тип максвина">
                      <Select allowClear options={[
                        { value: 'fixed', label: 'Фиксированная сумма' },
                        { value: 'coefficient', label: 'Коэффициент (x)' },
                      ]} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Form.Item name="wagering_requirement" label="Вейджер на кэш (x)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Card>
          )}

          {/* Casino Freespin */}
          {bonusCategory === 'casino' && (selectedBonusType === 'freespin' || selectedBonusType === 'combo') && (
            <Card size="small" title="Фриспин-бонус" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="freespins_count" label="Кол-во">
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="freespin_value" label="Стоимость">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="freespin_game" label="Игра">
                    <Input placeholder="Book of Dead" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="max_win_freespin_value" label="Максвин">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="max_win_freespin_unit" label="Тип максвина">
                    <Select allowClear options={[
                      { value: 'fixed', label: 'Фиксированная сумма' },
                      { value: 'coefficient', label: 'Коэффициент (x)' },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="wagering_freespin" label="Вейджер на фриспины (x)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Card>
          )}

          {/* Sport: Wagering */}
          {bonusCategory === 'sport' && selectedBonusType === 'wagering' && (
            <Card size="small" title="Параметры вейджеринга" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="bonus_value" label="Размер"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}>
                  <Form.Item name="bonus_unit" label="Единица">
                    <Select options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Фикс.' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="min_deposit" label="Мин. депозит"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="max_bonus" label="Макс. бонус"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="wagering_requirement" label="Вейджер (x)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="wagering_games" label="Условия"><Input /></Form.Item></Col>
              </Row>
            </Card>
          )}

          {/* Sport: Freebet */}
          {bonusCategory === 'sport' && selectedBonusType === 'freebet' && (
            <Card size="small" title="Параметры фрибета" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="bonus_value" label="Сумма"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="max_cashout" label="Макс. выигрыш"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="min_deposit" label="Мин. коэффициент">
                <InputNumber style={{ width: '100%' }} step={0.01} min={1} />
              </Form.Item>
            </Card>
          )}

          {/* Sport: Insurance */}
          {bonusCategory === 'sport' && selectedBonusType === 'insurance' && (
            <Card size="small" title="Параметры страховки" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="cashback_percent" label="Процент"><InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" /></Form.Item></Col>
                <Col span={12}><Form.Item name="bonus_value" label="Макс. сумма"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="wagering_games" label="Условия"><Input.TextArea rows={2} /></Form.Item>
            </Card>
          )}

          {/* Sport: Accumulator */}
          {bonusCategory === 'sport' && selectedBonusType === 'accumulator' && (
            <Card size="small" title="Аккумулятор" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="freespins_count" label="Событий"><InputNumber style={{ width: '100%' }} min={2} /></Form.Item></Col>
                <Col span={8}><Form.Item name="bonus_value" label="Множитель"><InputNumber style={{ width: '100%' }} step={0.1} min={1} /></Form.Item></Col>
                <Col span={8}><Form.Item name="max_bonus" label="Макс. бонус"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="wagering_games" label="Условия"><Input.TextArea rows={2} /></Form.Item>
            </Card>
          )}

          {/* Sport: Odds boost */}
          {bonusCategory === 'sport' && selectedBonusType === 'odds_boost' && (
            <Card size="small" title="Повышение коэффициентов" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="cashback_percent" label="Процент"><InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" /></Form.Item></Col>
                <Col span={12}><Form.Item name="bonus_value" label="Макс. ставка"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="wagering_games" label="Условия"><Input.TextArea rows={2} /></Form.Item>
            </Card>
          )}

          {/* Deposit (casino deposit kind) */}
          {bonusCategory === 'casino' && selectedBonusKind === 'deposit' && (
            <Form.Item name="min_deposit" label="Минимальный депозит">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          )}

          {/* Wagering time + games (casino) */}
          {bonusCategory === 'casino' && selectedBonusType && (
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="wagering_time_limit" label="Время на отыгрыш">
                  <Input placeholder="7 дней" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="wagering_games" label="Игры для отыгрыша">
                  <Input placeholder="Только слоты" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="notes" label="Заметки">
            <Input.TextArea rows={2} />
          </Form.Item>

          {/* Images */}
          <Card size="small" title="Изображения" style={{ marginBottom: 16 }}>
            {editingBonus && bonusImages.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                  {bonusImages.map((img: CasinoBonusImage) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <Image src={img.url} alt={img.original_name || ''} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        onClick={async () => {
                          try { await deleteBonusImage({ casinoId, bonusId: editingBonus.id, imageId: img.id }).unwrap(); message.success('Удалено'); }
                          catch (e: any) { message.error(e?.data?.error ?? 'Ошибка удаления'); }
                        }}
                      />
                    </div>
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}
            <div
              style={{ border: `2px dashed ${token.colorBorder}`, borderRadius: 6, padding: 12, textAlign: 'center' }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                if (files.length > 0) { setPendingImages((prev) => [...prev, ...files]); message.info('Добавлены к загрузке'); }
              }}
              onPaste={(e) => {
                const files: File[] = [];
                for (const item of Array.from(e.clipboardData.items || [])) {
                  if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) files.push(f); }
                }
                if (files.length > 0) { setPendingImages((prev) => [...prev, ...files]); }
              }}
            >
              <PictureOutlined style={{ fontSize: 20, color: token.colorTextTertiary }} />
              <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Drag & Drop / Ctrl+V / кнопка</Typography.Text></div>
              <Upload multiple accept="image/*" showUploadList={false}
                beforeUpload={(file) => { setPendingImages((prev) => [...prev, file]); return false; }}
              >
                <Button size="small" icon={<PictureOutlined />} style={{ marginTop: 6 }}>Выбрать</Button>
              </Upload>
            </div>
            {pendingImages.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text strong style={{ fontSize: 12 }}>К загрузке ({pendingImages.length}):</Typography.Text>
                <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
                  {pendingImages.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(file)} alt={file.name} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 0, right: 0 }}
                        onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                      />
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Form>
      </Drawer>
    </>
  );
}
