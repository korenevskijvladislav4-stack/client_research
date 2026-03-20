import { Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const LIST_NAME = 'option_pairs';

/** Одна строка в форме */
export type OptionPairRow = { entry_key: string; entry_value: string };

export function optionsJsonFromPairs(rows: OptionPairRow[] | undefined): { options: { value: string; label: string }[] } | null {
  if (!rows?.length) return null;
  const options = rows
    .map((p) => ({
      value: (p?.entry_key ?? '').toString().trim(),
      label: (p?.entry_value ?? '').toString().trim(),
    }))
    .filter((o) => o.value.length > 0)
    .map((o) => ({
      value: o.value,
      label: o.label.length > 0 ? o.label : o.value,
    }));
  return options.length ? { options } : null;
}

export function pairsFromOptionsJson(json: unknown): OptionPairRow[] {
  const opts = (json as { options?: { value?: string; label?: string }[] } | null)?.options ?? [];
  if (!opts.length) return [{ entry_key: '', entry_value: '' }];
  return opts.map((o) => ({
    entry_key: o.value != null ? String(o.value) : '',
    entry_value: o.label != null ? String(o.label) : '',
  }));
}

/**
 * Редактор вариантов для select / multiselect: пары «ключ (value)» и «подпись (label)» без ручного JSON.
 */
export function SelectOptionsKeyValueList() {
  const fieldType = Form.useWatch('field_type');

  if (fieldType !== 'select' && fieldType !== 'multiselect') {
    return null;
  }

  return (
    <Card
      size="small"
      title="Варианты списка"
      style={{ marginBottom: 16 }}
      styles={{ header: { fontWeight: 600 } }}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.55 }}>
        Добавьте строки: <strong>ключ</strong> — внутреннее значение (в API и данных), <strong>подпись</strong> — текст
        для пользователя. JSON собирается автоматически.
      </Typography.Paragraph>
      <Form.List name={LIST_NAME}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {fields.map(({ key, name, ...restField }) => (
              <Row key={key} gutter={[10, 8]} wrap={false} align="top">
                <Col xs={24} sm={10}>
                  <Form.Item
                    {...restField}
                    name={[name, 'entry_key']}
                    style={{ marginBottom: 0 }}
                    rules={[{ max: 200, message: 'Не длиннее 200 символов' }]}
                  >
                    <Input placeholder="Ключ (value)" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={11}>
                  <Form.Item
                    {...restField}
                    name={[name, 'entry_value']}
                    style={{ marginBottom: 0 }}
                    rules={[{ max: 500, message: 'Не длиннее 500 символов' }]}
                  >
                    <Input placeholder="Подпись (label)" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={3} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Удалить строку"
                    disabled={fields.length <= 1}
                    onClick={() => remove(name)}
                  />
                </Col>
              </Row>
            ))}
            <Button type="dashed" onClick={() => add({ entry_key: '', entry_value: '' })} block icon={<PlusOutlined />}>
              Добавить строку
            </Button>
          </Space>
        )}
      </Form.List>
    </Card>
  );
}

export { LIST_NAME as OPTION_PAIRS_FIELD_NAME };
