import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Typography,
  theme,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { DollarOutlined, GiftOutlined, GlobalOutlined, TrophyOutlined } from '@ant-design/icons';
import { useGetBonusNamesQuery, useCreateBonusNameMutation } from '../../store/api/referenceApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';
import type { BonusCategory, BonusKind, BonusType } from '../../store/api/casinoBonusApi';

export interface BonusFormProfileCoreProps {
  form: FormInstance;
  bonusCategory: BonusCategory;
  setBonusCategory: (c: BonusCategory) => void;
  selectedBonusKind: BonusKind | undefined;
  setSelectedBonusKind: (k: BonusKind | undefined) => void;
  selectedBonusType: BonusType | undefined;
  setSelectedBonusType: (t: BonusType | undefined) => void;
  geoOptions: { value: string; label: string }[];
}

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

/** Общие поля формы бонуса (как в анкете казино), без AI-блока и без галереи */
export function BonusFormProfileCore({
  form: bonusForm,
  bonusCategory,
  setBonusCategory,
  selectedBonusKind,
  setSelectedBonusKind,
  selectedBonusType,
  setSelectedBonusType,
  geoOptions,
}: BonusFormProfileCoreProps) {
  const { token } = theme.useToken();
  const { data: bonusNames } = useGetBonusNamesQuery();
  const [createBonusName] = useCreateBonusNameMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();

  const bonusNameOptions =
    bonusNames?.map((b) => ({ value: b.name, label: b.name })) ?? [];

  return (
    <>
      <Card
        size="small"
        title={
          <Space size={8}>
            <GiftOutlined style={{ color: token.colorPrimary }} />
            <span>Основное</span>
          </Space>
        }
        style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={14}>
            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Укажите GEO' }]}
              extra="Код страны или рынка; новые коды можно добавить вручную — они попадут в справочник."
            >
              <Select
                mode="tags"
                placeholder="RU, DE, BR…"
                tokenSeparators={[',', ';', ' ']}
                options={geoOptions}
                suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
                onChange={async (values: string[]) => {
                  if (!values?.length) return;
                  const codes = (geos ?? []).map((g) => g.code);
                  for (const v of values
                    .map((x) => x.toUpperCase().trim())
                    .filter((x) => x && !codes.includes(x))) {
                    try {
                      await createGeo({ code: v, name: v }).unwrap();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item
              name="currency"
              label="Валюта"
              required={false}
              extra="Например EUR, USD — для отображения сумм в таблице."
            >
              <Input
                placeholder="EUR"
                prefix={<DollarOutlined style={{ color: token.colorTextQuaternary }} />}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="name"
          label="Название бонуса"
          rules={[{ required: true, message: 'Укажите название' }]}
          extra="Один вариант из справочника или новое имя — оно сохранится в списке названий."
        >
          <Select
            mode="tags"
            placeholder="Выберите или введите"
            maxCount={1}
            options={bonusNameOptions}
            onChange={async (values: string[]) => {
              if (!values?.length) return;
              const existing = (bonusNames ?? []).map((b) => b.name);
              for (const name of values.filter((v) => v && !existing.includes(v))) {
                try {
                  await createBonusName({ name }).unwrap();
                } catch {
                  /* ignore */
                }
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="bonus_category"
          label="Категория"
          initialValue="casino"
          rules={[{ required: true, message: 'Выберите категорию' }]}
          extra="От категории зависят доступные типы бонуса (казино или спорт)."
        >
          <Segmented
            block
            value={bonusCategory}
            options={[
              {
                value: 'casino',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <GiftOutlined />
                    Казино
                  </span>
                ),
              },
              {
                value: 'sport',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <TrophyOutlined />
                    Спорт
                  </span>
                ),
              },
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

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Form.Item name="bonus_kind" label="Вид бонуса" rules={[{ required: true, message: 'Выберите вид' }]}>
              <Select
                placeholder="Вид"
                onChange={(val: BonusKind) => setSelectedBonusKind(val)}
                options={casinoKindOptions}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="bonus_type"
              label="Тип бонуса"
              required={
                !!selectedBonusKind && selectedBonusKind !== 'cashback' && selectedBonusKind !== 'rakeback'
              }
              rules={[
                {
                  validator: (_, value) => {
                    if (selectedBonusKind === 'cashback' || selectedBonusKind === 'rakeback')
                      return Promise.resolve();
                    return !value ? Promise.reject(new Error('Выберите тип')) : Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                placeholder="Тип"
                onChange={(val: BonusType) => setSelectedBonusType(val)}
                options={bonusCategory === 'casino' ? casinoTypeOptions : sportTypeOptions}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

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
                <Select
                  placeholder="Период"
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
                  <Select
                    allowClear
                    options={[
                      { value: 'fixed', label: 'Фиксированная сумма' },
                      { value: 'coefficient', label: 'Коэффициент (x)' },
                    ]}
                  />
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
                  <Select
                    allowClear
                    options={[
                      { value: 'fixed', label: 'Фиксированная сумма' },
                      { value: 'coefficient', label: 'Коэффициент (x)' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item name="wagering_requirement" label="Вейджер на кэш (x)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Card>
      )}

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
                <Select
                  allowClear
                  options={[
                    { value: 'fixed', label: 'Фиксированная сумма' },
                    { value: 'coefficient', label: 'Коэффициент (x)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="wagering_freespin" label="Вейджер на фриспины (x)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Card>
      )}

      {bonusCategory === 'sport' && selectedBonusType === 'wagering' && (
        <Card size="small" title="Параметры вейджеринга" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="bonus_value" label="Размер">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bonus_unit" label="Единица">
                <Select options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Фикс.' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="min_deposit" label="Мин. депозит">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="max_bonus" label="Макс. бонус">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="wagering_requirement" label="Вейджер (x)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="wagering_games" label="Условия">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}

      {bonusCategory === 'sport' && selectedBonusType === 'freebet' && (
        <Card size="small" title="Параметры фрибета" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bonus_value" label="Сумма">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="max_cashout" label="Макс. выигрыш">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="min_deposit" label="Мин. коэффициент">
            <InputNumber style={{ width: '100%' }} step={0.01} min={1} />
          </Form.Item>
        </Card>
      )}

      {bonusCategory === 'sport' && selectedBonusType === 'insurance' && (
        <Card size="small" title="Параметры страховки" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="cashback_percent" label="Процент">
                <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonus_value" label="Макс. сумма">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="wagering_games" label="Условия">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
      )}

      {bonusCategory === 'sport' && selectedBonusType === 'accumulator' && (
        <Card size="small" title="Аккумулятор" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="freespins_count" label="Событий">
                <InputNumber style={{ width: '100%' }} min={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bonus_value" label="Множитель">
                <InputNumber style={{ width: '100%' }} step={0.1} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="max_bonus" label="Макс. бонус">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="wagering_games" label="Условия">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
      )}

      {bonusCategory === 'sport' && selectedBonusType === 'odds_boost' && (
        <Card size="small" title="Повышение коэффициентов" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="cashback_percent" label="Процент">
                <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonus_value" label="Макс. ставка">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="wagering_games" label="Условия">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
      )}

      {bonusCategory === 'casino' && selectedBonusKind === 'deposit' && (
        <Form.Item name="min_deposit" label="Минимальный депозит">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
      )}

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

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="promo_code" label="Промокод">
            <Input allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="valid_from" label="Действует с (YYYY-MM-DD)">
            <Input placeholder="2025-01-01" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="valid_to" label="по">
            <Input placeholder="2025-12-31" allowClear />
          </Form.Item>
        </Col>
      </Row>

      <Card
        size="small"
        title={<Typography.Text strong>Заметки</Typography.Text>}
        style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
      >
        <Form.Item
          name="notes"
          label="Текст"
          required={false}
          style={{ marginBottom: 0 }}
          extra="Внутренние пометки, не показываются игроку."
        >
          <Input.TextArea rows={3} placeholder="Условия акции, исключения, ссылки на правила…" />
        </Form.Item>
      </Card>
    </>
  );
}
