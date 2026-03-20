import {
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  theme,
} from 'antd';
import { CalendarOutlined, GlobalOutlined, SettingOutlined, TagOutlined } from '@ant-design/icons';
import { useGetPromoTypesQuery, useCreatePromoTypeMutation } from '../../store/api/referenceApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../store/api/geoApi';

export interface PromoFormProfileCoreProps {
  geoOptions: { value: string; label: string }[];
  /** В режиме редактирования — только одно GEO */
  editing: boolean;
}

/** Поля промо как в анкете казино (без блока изображений) */
export function PromoFormProfileCore({ geoOptions, editing }: PromoFormProfileCoreProps) {
  const { token } = theme.useToken();
  const { data: promoTypes } = useGetPromoTypesQuery();
  const [createPromoType] = useCreatePromoTypeMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();

  const promoTypeOptions = (promoTypes ?? []).map((t) => ({ value: t.name, label: t.name }));

  return (
    <>
      <Card
        size="small"
        title={
          <Space size={8}>
            <TagOutlined style={{ color: token.colorPrimary }} />
            <span>Основное</span>
          </Space>
        }
        style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Form.Item
          name="geo"
          label="GEO"
          rules={[{ required: true, message: 'Выберите GEO' }]}
          extra={
            editing
              ? 'Один рынок для этой записи.'
              : 'Несколько кодов — несколько промо с одинаковыми полями. Новый код можно ввести вручную — он добавится в справочник GEO.'
          }
        >
          <Select
            mode="tags"
            placeholder="Выберите или введите коды"
            options={geoOptions}
            maxCount={editing ? 1 : undefined}
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

        <Form.Item
          name="promo_category"
          label="Категория"
          initialValue="tournament"
          rules={[{ required: true, message: 'Выберите категорию' }]}
          extra="Турнир, акция или лотерея — для фильтров и отображения в таблице."
        >
          <Select
            options={[
              { value: 'tournament', label: 'Турнир' },
              { value: 'promotion', label: 'Акция' },
              { value: 'lottery', label: 'Лотерея' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="promo_type"
          label="Тип турнира"
          required={false}
          extra="Необязательно. Новое значение сохранится в справочнике типов."
        >
          <Select
            mode="tags"
            maxCount={1}
            placeholder="Выберите или введите"
            options={promoTypeOptions}
            onChange={async (values: string[]) => {
              if (!values?.length) return;
              const existing = (promoTypes ?? []).map((t) => t.name);
              for (const name of values.filter((v) => v && !existing.includes(v))) {
                try {
                  await createPromoType({ name }).unwrap();
                } catch {
                  /* ignore */
                }
              }
            }}
          />
        </Form.Item>

        <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
          <Input placeholder="Как отображается в CRM и на сайте" allowClear />
        </Form.Item>
      </Card>

      <Card
        size="small"
        title={
          <Space size={8}>
            <CalendarOutlined style={{ color: token.colorPrimary }} />
            <span>Период и статус</span>
          </Space>
        }
        style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Form.Item
          name="period_type"
          label="Тип периода"
          initialValue="fixed"
          rules={[{ required: true, message: 'Выберите тип периода' }]}
          extra="Для фиксированных дат укажите диапазон ниже."
        >
          <Select
            options={[
              { value: 'daily', label: 'Ежедневный' },
              { value: 'weekly', label: 'Еженедельный' },
              { value: 'monthly', label: 'Ежемесячный' },
              { value: 'fixed', label: 'Фиксированные даты' },
            ]}
          />
        </Form.Item>

        <Form.Item shouldUpdate={(prev, next) => prev.period_type !== next.period_type}>
          {({ getFieldValue }) =>
            getFieldValue('period_type') === 'fixed' && (
              <Form.Item
                name="period"
                label="Период проведения"
                required={false}
                extra="Необязательно, если даты уточните позже."
              >
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item
          name="status"
          label="Статус"
          initialValue="active"
          rules={[{ required: true, message: 'Выберите статус' }]}
        >
          <Select
            options={[
              { value: 'active', label: 'Активен' },
              { value: 'paused', label: 'Пауза' },
              { value: 'expired', label: 'Истёк' },
              { value: 'draft', label: 'Черновик' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="has_participation_button"
          label="Кнопка для участия"
          valuePropName="checked"
          required={false}
          extra="Показывать ли в интерфейсе отметку о кнопке участия."
        >
          <Switch checkedChildren="Да" unCheckedChildren="Нет" />
        </Form.Item>
      </Card>

      <Card
        size="small"
        title={
          <Space size={8}>
            <SettingOutlined style={{ color: token.colorPrimary }} />
            <span>Условия и призы</span>
          </Space>
        }
        style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Form.Item name="provider" label="Провайдер" required={false} extra="Поставщик игр или бренд турнира.">
          <Input allowClear placeholder="Например: Pragmatic Play" />
        </Form.Item>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Form.Item name="prize_fund" label="Общий ПФ" required={false}>
              <Input placeholder="100 000 EUR" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="min_bet" label="Мин. ставка" required={false}>
              <Input placeholder="0.5 EUR" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="mechanics" label="Механика" required={false} extra="Кратко: как начисляются очки, этапы и т.д.">
          <Input.TextArea rows={3} placeholder="Описание механики промо…" />
        </Form.Item>

        <Form.Item name="wagering_prize" label="Вейджер на приз" required={false} extra="Например x30 или текст условий.">
          <Input placeholder="x30" allowClear />
        </Form.Item>
      </Card>
    </>
  );
}
