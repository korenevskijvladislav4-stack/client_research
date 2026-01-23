import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Badge,
  Image,
  theme,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
// import { ProfileSettingsTable } from '../../components/ProfileSettingsTable';
import { useGetCasinosQuery, useGetCasinoByIdQuery } from '../../store/api/casinoApi';
import {
  useGetCasinoProfileQuery,
  CasinoProfileItem,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import {
  useGetCasinoBonusesQuery,
  CasinoBonus,
} from '../../store/api/casinoBonusApi';
import {
  useGetCasinoPaymentsQuery,
  CasinoPayment,
} from '../../store/api/casinoPaymentApi';
import {
  useGetCasinoImagesQuery,
} from '../../store/api/casinoCommentApi';
import {
  useGetCasinoProfileSettingsQuery,
  useGetSettingsFieldsQuery,
  useGetProfileContextsQuery,
  ProfileSetting,
} from '../../store/api/profileSettingsApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { BonusKind, BonusType, BonusCategory } from '../../store/api/casinoBonusApi';
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

// Виды бонусов — общие для казино и спорта
const bonusKindLabels: Record<BonusKind, string> = {
  deposit: 'Депозитный',
  nodeposit: 'Бездепозитный',
  cashback: 'Кешбек',
  rakeback: 'Рейкбек',
};

// Типы бонусов — механика, включая спортивные варианты
const bonusTypeLabels: Record<BonusType, string> = {
  cash: 'Кэш-бонус',
  freespin: 'Фриспин',
  combo: 'Комбо',
  freebet: 'Фрибет',
  wagering: 'Вейджеринг',
  insurance: 'Страховка',
  accumulator: 'Аккумулятор',
  odds_boost: 'Повышение коэффициентов',
};

// Категории бонусов
const bonusCategoryLabels: Record<BonusCategory, string> = {
  casino: 'Казино',
  sport: 'Спорт',
};

// Функция сравнения значений
const areValuesEqual = (val1: any, val2: any): boolean => {
  if (val1 == null && val2 == null) return true;
  if (val1 == null || val2 == null) return false;
  
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    const sorted1 = [...val1].sort();
    const sorted2 = [...val2].sort();
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
  }
  
  if (typeof val1 === 'object' && typeof val2 === 'object') {
    return JSON.stringify(val1) === JSON.stringify(val2);
  }
  
  return String(val1) === String(val2);
};

// Функция рендеринга значения поля
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

// Компонент для отображения значения с подсветкой различий
function ComparisonValue({ value, isDifferent, hasValue }: { value: any; isDifferent: boolean; hasValue: boolean }) {
  const { token } = theme.useToken();

  const shouldHighlight = isDifferent && hasValue;
  const style: React.CSSProperties = {
    backgroundColor: shouldHighlight ? token.colorSuccessBg : undefined,
    border: shouldHighlight ? `1px solid ${token.colorSuccessBorder}` : undefined,
    borderRadius: '4px',
    padding: shouldHighlight ? '4px 8px' : undefined,
    color: shouldHighlight ? token.colorSuccessText : undefined,
  };

  return (
    <span style={style}>
      {value}
    </span>
  );
}

export default function CasinoCompare() {
  const nav = useNavigate();
  const [casino1Id, setCasino1Id] = useState<number | undefined>(undefined);
  const [casino2Id, setCasino2Id] = useState<number | undefined>(undefined);
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);

  const { data: casinos, isLoading: casinosLoading } = useGetCasinosQuery();
  const { data: casino1, isLoading: casino1Loading } = useGetCasinoByIdQuery(casino1Id!, {
    skip: !casino1Id,
  });
  const { data: casino2, isLoading: casino2Loading } = useGetCasinoByIdQuery(casino2Id!, {
    skip: !casino2Id,
  });

  const { data: profile1Resp, isLoading: profile1Loading } = useGetCasinoProfileQuery(casino1Id!, {
    skip: !casino1Id,
  } as any);
  const { data: profile2Resp, isLoading: profile2Loading } = useGetCasinoProfileQuery(casino2Id!, {
    skip: !casino2Id,
  } as any);

  const { data: bonuses1, isLoading: bonuses1Loading } = useGetCasinoBonusesQuery(
    { casinoId: casino1Id!, geo: filterGeo },
    { skip: !casino1Id } as any
  );
  const { data: bonuses2, isLoading: bonuses2Loading } = useGetCasinoBonusesQuery(
    { casinoId: casino2Id!, geo: filterGeo },
    { skip: !casino2Id } as any
  );

  const { data: payments1, isLoading: payments1Loading } = useGetCasinoPaymentsQuery(
    { casinoId: casino1Id!, geo: filterGeo },
    { skip: !casino1Id } as any
  );
  const { data: payments2, isLoading: payments2Loading } = useGetCasinoPaymentsQuery(
    { casinoId: casino2Id!, geo: filterGeo },
    { skip: !casino2Id } as any
  );

  const { data: geos } = useGetGeosQuery();

  const { data: images1 = [], isLoading: images1Loading } = useGetCasinoImagesQuery(casino1Id!, {
    skip: !casino1Id,
  } as any);
  const { data: images2 = [], isLoading: images2Loading } = useGetCasinoImagesQuery(casino2Id!, {
    skip: !casino2Id,
  } as any);

  const { data: settings1 = [], isLoading: settings1Loading } = useGetCasinoProfileSettingsQuery(
    { casinoId: casino1Id!, geo: filterGeo },
    { skip: !casino1Id } as any
  );
  const { data: settings2 = [], isLoading: settings2Loading } = useGetCasinoProfileSettingsQuery(
    { casinoId: casino2Id!, geo: filterGeo },
    { skip: !casino2Id } as any
  );

  const { data: fields = [] } = useGetSettingsFieldsQuery();
  const { data: contexts = [] } = useGetProfileContextsQuery();

  const items1: CasinoProfileItem[] = profile1Resp?.profile ?? [];
  const items2: CasinoProfileItem[] = profile2Resp?.profile ?? [];

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );

  const isLoading =
    casinosLoading ||
    casino1Loading ||
    casino2Loading ||
    profile1Loading ||
    profile2Loading ||
    bonuses1Loading ||
    bonuses2Loading ||
    payments1Loading ||
    payments2Loading ||
    images1Loading ||
    images2Loading ||
    settings1Loading ||
    settings2Loading;

  // Сравнение общей информации
  const basicInfoComparison = useMemo(() => {
    if (!casino1 || !casino2) return null;

    const fields = [
      { key: 'name', label: 'Название', getValue: (c: any) => c.name },
      { key: 'website', label: 'Сайт', getValue: (c: any) => c.website || '—' },
      { key: 'description', label: 'Описание', getValue: (c: any) => c.description || '—' },
      {
        key: 'geo',
        label: 'ГЕО',
        getValue: (c: any) => {
          if (!c.geo) return '—';
          if (Array.isArray(c.geo)) return c.geo.join(', ');
          return String(c.geo);
        },
      },
      {
        key: 'is_our',
        label: 'Наш',
        getValue: (c: any) => (c.is_our ? 'Да' : 'Нет'),
      },
      {
        key: 'status',
        label: 'Статус',
        getValue: (c: any) => {
          const statusLabels: Record<string, string> = {
            active: 'Активный',
            inactive: 'Неактивный',
            pending: 'В ожидании',
          };
          return statusLabels[c.status] || c.status;
        },
      },
    ];

    return fields.map((field) => {
      const val1 = field.getValue(casino1);
      const val2 = field.getValue(casino2);
      const isEqual = areValuesEqual(val1, val2);
      const hasVal1 = val1 !== '—' && val1 != null;
      const hasVal2 = val2 !== '—' && val2 != null;

      return {
        label: field.label,
        value1: val1,
        value2: val2,
        isDifferent: !isEqual || (hasVal1 && !hasVal2) || (!hasVal1 && hasVal2),
        hasVal1,
        hasVal2,
      };
    });
  }, [casino1, casino2]);

  // Сравнение дополнительных полей профиля
  const profileFieldsComparison = useMemo(() => {
    const allFields = new Map<number, ProfileField>();
    const values1 = new Map<number, any>();
    const values2 = new Map<number, any>();

    items1.forEach((item) => {
      allFields.set(item.field.id, item.field);
      values1.set(item.field.id, item.value);
    });

    items2.forEach((item) => {
      allFields.set(item.field.id, item.field);
      values2.set(item.field.id, item.value);
    });

    return Array.from(allFields.values()).map((field) => {
      const val1 = values1.get(field.id);
      const val2 = values2.get(field.id);
      const isEqual = areValuesEqual(val1, val2);
      const hasVal1 = val1 != null && val1 !== '';
      const hasVal2 = val2 != null && val2 !== '';

      return {
        field,
        value1: val1,
        value2: val2,
        isDifferent: !isEqual || (hasVal1 && !hasVal2) || (!hasVal1 && hasVal2),
        hasVal1,
        hasVal2,
      };
    });
  }, [items1, items2]);

  // Сравнение платежных решений
  const paymentsComparison = useMemo(() => {
    if (!payments1 || !payments2) return null;

    const payments1Map = new Map<string, CasinoPayment>();
    const payments2Map = new Map<string, CasinoPayment>();

    payments1.forEach((p) => {
      const key = `${p.geo}-${p.type}-${p.method}`;
      payments1Map.set(key, p);
    });

    payments2.forEach((p) => {
      const key = `${p.geo}-${p.type}-${p.method}`;
      payments2Map.set(key, p);
    });

    const allKeys = new Set([...payments1Map.keys(), ...payments2Map.keys()]);

    return Array.from(allKeys).map((key) => {
      const p1 = payments1Map.get(key);
      const p2 = payments2Map.get(key);
      const hasOnly1 = !!p1 && !p2;
      const hasOnly2 = !!p2 && !p1;
      // const hasBoth = !!p1 && !!p2; // Not used currently

      return {
        key,
        payment1: p1,
        payment2: p2,
        isDifferent: hasOnly1 || hasOnly2,
        hasVal1: !!p1,
        hasVal2: !!p2,
      };
    });
  }, [payments1, payments2]);

  if (isLoading) return <Card loading />;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/casinos')}>
            Назад
          </Button>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>
            Сравнение анкет казино
          </Typography.Title>
        </Space>
      </div>

      <Card>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Select
              style={{ width: '100%' }}
              placeholder="Выберите первое казино"
              options={casinoOptions}
              value={casino1Id}
              onChange={setCasino1Id}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24} sm={12}>
            <Select
              style={{ width: '100%' }}
              placeholder="Выберите второе казино"
              options={casinoOptions}
              value={casino2Id}
              onChange={setCasino2Id}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24}>
            <Select
              style={{ width: '100%', marginTop: 16 }}
              placeholder="Фильтр по GEO (все GEO)"
              options={[{ value: undefined, label: 'Все GEO' }, ...geoOptions]}
              value={filterGeo}
              onChange={setFilterGeo}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {casino1 && casino2 && (
        <>
          {/* Общая информация */}
          <Card title={`Общая информация${filterGeo ? ` (${filterGeo})` : ''}`}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino1.name}
                </Typography.Title>
                <Descriptions bordered column={1} size="small">
                  {basicInfoComparison?.map((item) => (
                    <Descriptions.Item key={item.label} label={item.label}>
                      <ComparisonValue
                        value={item.value1}
                        isDifferent={item.isDifferent}
                        hasValue={item.hasVal1}
                      />
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino2.name}
                </Typography.Title>
                <Descriptions bordered column={1} size="small">
                  {basicInfoComparison?.map((item) => (
                    <Descriptions.Item key={item.label} label={item.label}>
                      <ComparisonValue
                        value={item.value2}
                        isDifferent={item.isDifferent}
                        hasValue={item.hasVal2}
                      />
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Col>
            </Row>
          </Card>

          {/* Дополнительные поля */}
          {profileFieldsComparison.length > 0 && (
            <Card title={`Дополнительные поля${filterGeo ? ` (${filterGeo})` : ''}`}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                    {casino1.name}
                  </Typography.Title>
                  <Descriptions bordered column={1} size="small">
                    {profileFieldsComparison.map((item) => (
                      <Descriptions.Item key={item.field.id} label={item.field.label}>
                        <ComparisonValue
                          value={renderFieldValue(item.field, item.value1)}
                          isDifferent={item.isDifferent}
                          hasValue={item.hasVal1}
                        />
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                    {casino2.name}
                  </Typography.Title>
                  <Descriptions bordered column={1} size="small">
                    {profileFieldsComparison.map((item) => (
                      <Descriptions.Item key={item.field.id} label={item.field.label}>
                        <ComparisonValue
                          value={renderFieldValue(item.field, item.value2)}
                          isDifferent={item.isDifferent}
                          hasValue={item.hasVal2}
                        />
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Col>
              </Row>
            </Card>
          )}

          {/* Бонусы */}
          <Card title={`Бонусы${filterGeo ? ` (${filterGeo})` : ''}`}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino1.name}
                </Typography.Title>
                <Table
                  dataSource={bonuses1 ?? []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: true }}
                  columns={[
                    { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 60 },
                    {
                      title: 'Категория',
                      dataIndex: 'bonus_category',
                      key: 'bonus_category',
                      width: 90,
                      render: (val: BonusCategory) =>
                        val ? (
                          <Tag color={val === 'casino' ? 'blue' : 'green'}>
                            {bonusCategoryLabels[val]}
                          </Tag>
                        ) : (
                          '—'
                        ),
                    },
                    { title: 'Название', dataIndex: 'name', key: 'name', width: 150 },
                    {
                      title: 'Вид',
                      dataIndex: 'bonus_kind',
                      key: 'bonus_kind',
                      width: 120,
                      render: (val: BonusKind) => (val ? bonusKindLabels[val] : '—'),
                    },
                    {
                      title: 'Тип',
                      dataIndex: 'bonus_type',
                      key: 'bonus_type',
                      width: 130,
                      render: (val: BonusType) => (val ? bonusTypeLabels[val] : '—'),
                    },
                    {
                      title: 'Бонус',
                      key: 'bonus_value',
                      width: 120,
                      render: (_: any, record: CasinoBonus) => {
                        if (record.bonus_value != null) {
                          return fmtAmount(record.bonus_value, record.currency);
                        }
                        if (record.freespins_count != null) {
                          return `${record.freespins_count} сп.`;
                        }
                        if (record.cashback_percent != null) {
                          return `${record.cashback_percent}%`;
                        }
                        return '—';
                      },
                    },
                    {
                      title: 'Мин. деп.',
                      dataIndex: 'min_deposit',
                      key: 'min_deposit',
                      width: 100,
                      render: (val: any, record: CasinoBonus) => fmtAmount(val, record.currency),
                    },
                  ]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino2.name}
                </Typography.Title>
                <Table
                  dataSource={bonuses2 ?? []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: true }}
                  columns={[
                    { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 60 },
                    {
                      title: 'Категория',
                      dataIndex: 'bonus_category',
                      key: 'bonus_category',
                      width: 90,
                      render: (val: BonusCategory) =>
                        val ? (
                          <Tag color={val === 'casino' ? 'blue' : 'green'}>
                            {bonusCategoryLabels[val]}
                          </Tag>
                        ) : (
                          '—'
                        ),
                    },
                    { title: 'Название', dataIndex: 'name', key: 'name', width: 150 },
                    {
                      title: 'Вид',
                      dataIndex: 'bonus_kind',
                      key: 'bonus_kind',
                      width: 120,
                      render: (val: BonusKind) => (val ? bonusKindLabels[val] : '—'),
                    },
                    {
                      title: 'Тип',
                      dataIndex: 'bonus_type',
                      key: 'bonus_type',
                      width: 130,
                      render: (val: BonusType) => (val ? bonusTypeLabels[val] : '—'),
                    },
                    {
                      title: 'Бонус',
                      key: 'bonus_value',
                      width: 120,
                      render: (_: any, record: CasinoBonus) => {
                        if (record.bonus_value != null) {
                          return fmtAmount(record.bonus_value, record.currency);
                        }
                        if (record.freespins_count != null) {
                          return `${record.freespins_count} сп.`;
                        }
                        if (record.cashback_percent != null) {
                          return `${record.cashback_percent}%`;
                        }
                        return '—';
                      },
                    },
                    {
                      title: 'Мин. деп.',
                      dataIndex: 'min_deposit',
                      key: 'min_deposit',
                      width: 100,
                      render: (val: any, record: CasinoBonus) => fmtAmount(val, record.currency),
                    },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          {/* Платежные решения */}
          <Card title={`Платежные решения${filterGeo ? ` (${filterGeo})` : ''}`}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino1.name}
                </Typography.Title>
                <Table
                  dataSource={payments1 ?? []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 60 },
                    {
                      title: 'Тип',
                      dataIndex: 'type',
                      key: 'type',
                      render: (val: string, record: CasinoPayment) => {
                        const key = `${record.geo}-${record.type}-${record.method}`;
                        const comparison = paymentsComparison?.find((c) => c.key === key);
                        const isDifferent = comparison?.isDifferent && comparison?.hasVal1;
                        return (
                          <ComparisonValue
                            value={val || '—'}
                            isDifferent={!!isDifferent}
                            hasValue={!!val}
                          />
                        );
                      },
                    },
                    {
                      title: 'Метод',
                      dataIndex: 'method',
                      key: 'method',
                      render: (val: string, record: CasinoPayment) => {
                        const key = `${record.geo}-${record.type}-${record.method}`;
                        const comparison = paymentsComparison?.find((c) => c.key === key);
                        const isDifferent = comparison?.isDifferent && comparison?.hasVal1;
                        return (
                          <ComparisonValue
                            value={val || '—'}
                            isDifferent={!!isDifferent}
                            hasValue={!!val}
                          />
                        );
                      },
                    },
                  ]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino2.name}
                </Typography.Title>
                <Table
                  dataSource={payments2 ?? []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'GEO', dataIndex: 'geo', key: 'geo', width: 60 },
                    {
                      title: 'Тип',
                      dataIndex: 'type',
                      key: 'type',
                      render: (val: string, record: CasinoPayment) => {
                        const key = `${record.geo}-${record.type}-${record.method}`;
                        const comparison = paymentsComparison?.find((c) => c.key === key);
                        const isDifferent = comparison?.isDifferent && comparison?.hasVal2;
                        return (
                          <ComparisonValue
                            value={val || '—'}
                            isDifferent={!!isDifferent}
                            hasValue={!!val}
                          />
                        );
                      },
                    },
                    {
                      title: 'Метод',
                      dataIndex: 'method',
                      key: 'method',
                      render: (val: string, record: CasinoPayment) => {
                        const key = `${record.geo}-${record.type}-${record.method}`;
                        const comparison = paymentsComparison?.find((c) => c.key === key);
                        const isDifferent = comparison?.isDifferent && comparison?.hasVal2;
                        return (
                          <ComparisonValue
                            value={val || '—'}
                            isDifferent={!!isDifferent}
                            hasValue={!!val}
                          />
                        );
                      },
                    },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          {/* Настройки профиля */}
          {fields.length > 0 && contexts.length > 0 && (
            <Card title={`Настройки профиля${filterGeo ? ` (${filterGeo})` : ''}`}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                    {casino1.name}
                  </Typography.Title>
                  <Table
                    dataSource={fields.map((field) => ({
                      field,
                      rows: contexts.map((context) => {
                        const setting = (settings1 as ProfileSetting[]).find(
                          (s) => s.field_id === field.id && s.context_id === context.id
                        );
                        return {
                          context,
                          value: Boolean(setting?.value ?? false),
                        };
                      }),
                    }))}
                    rowKey={(record) => record.field.id}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: 'Поле',
                        dataIndex: 'field',
                        key: 'field',
                        width: 150,
                        render: (field: any) => field.name,
                      },
                      ...contexts.map((context) => ({
                        title: context.name,
                        key: `ctx_${context.id}`,
                        align: 'center' as const,
                        width: 100,
                        render: (_: any, record: any) => {
                          const row = record.rows.find((r: any) => r.context.id === context.id);
                          const val1 = Boolean(row?.value ?? false);
                          const setting2 = (settings2 as ProfileSetting[]).find(
                            (s) => s.field_id === record.field.id && s.context_id === context.id
                          );
                          const val2 = Boolean(setting2?.value ?? false);
                          const isDifferent = val1 !== val2;

                          return (
                            <ComparisonValue
                              value={val1 ? 'Да' : 'Нет'}
                              isDifferent={isDifferent}
                              hasValue={isDifferent}
                            />
                          );
                        },
                      })),
                    ]}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                    {casino2.name}
                  </Typography.Title>
                  <Table
                    dataSource={fields.map((field) => ({
                      field,
                      rows: contexts.map((context) => {
                        const setting = (settings2 as ProfileSetting[]).find(
                          (s) => s.field_id === field.id && s.context_id === context.id
                        );
                        return {
                          context,
                          value: Boolean(setting?.value ?? false),
                        };
                      }),
                    }))}
                    rowKey={(record) => record.field.id}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: 'Поле',
                        dataIndex: 'field',
                        key: 'field',
                        width: 150,
                        render: (field: any) => field.name,
                      },
                      ...contexts.map((context) => ({
                        title: context.name,
                        key: `ctx_${context.id}`,
                        align: 'center' as const,
                        width: 100,
                        render: (_: any, record: any) => {
                          const row = record.rows.find((r: any) => r.context.id === context.id);
                          const val2 = Boolean(row?.value ?? false);
                          const setting1 = (settings1 as ProfileSetting[]).find(
                            (s) => s.field_id === record.field.id && s.context_id === context.id
                          );
                          const val1 = Boolean(setting1?.value ?? false);
                          const isDifferent = val1 !== val2;

                          return (
                            <ComparisonValue
                              value={val2 ? 'Да' : 'Нет'}
                              isDifferent={isDifferent}
                              hasValue={isDifferent}
                            />
                          );
                        },
                      })),
                    ]}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Изображения */}
          <Card title={`Изображения${filterGeo ? ` (${filterGeo})` : ''}`}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino1.name} ({images1.length})
                </Typography.Title>
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {images1.slice(0, 12).map((img, idx) => (
                      <Image
                        key={idx}
                        width={100}
                        height={100}
                        src={img.url || img.file_path || ''}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
                  {casino2.name} ({images2.length})
                </Typography.Title>
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {images2.slice(0, 12).map((img, idx) => (
                      <Image
                        key={idx}
                        width={100}
                        height={100}
                        src={img.url || img.file_path || ''}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Col>
            </Row>
          </Card>
        </>
      )}
    </Space>
  );
}
