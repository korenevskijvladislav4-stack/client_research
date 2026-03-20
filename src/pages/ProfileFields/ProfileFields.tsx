import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import {
  useCreateProfileFieldMutation,
  useDeleteProfileFieldMutation,
  useListProfileFieldsQuery,
  useUpdateProfileFieldMutation,
  ProfileField,
} from '../../store/api/casinoProfileApi';
import { SettingsEntityDrawer } from '../../components/settings/SettingsEntityDrawer';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { CasinoProfileTable } from '../../components/CasinoProfileTable';
import {
  SelectOptionsKeyValueList,
  optionsJsonFromPairs,
  pairsFromOptionsJson,
} from '../../components/settings/SelectOptionsKeyValueList';

const FIELD_TYPES = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Текст (многостр.)' },
  { value: 'number', label: 'Число' },
  { value: 'boolean', label: 'Да/Нет' },
  { value: 'select', label: 'Список (1)' },
  { value: 'multiselect', label: 'Список (много)' },
  { value: 'rating', label: 'Оценка (1-5)' },
  { value: 'date', label: 'Дата' },
  { value: 'url', label: 'Ссылка' },
];

function normalizeKey(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export default function ProfileFields() {
  const { data, isLoading } = useListProfileFieldsQuery();
  const [createField] = useCreateProfileFieldMutation();
  const [updateField] = useUpdateProfileFieldMutation();
  const [deleteField] = useDeleteProfileFieldMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileField | null>(null);
  const [form] = Form.useForm();

  const rows = data ?? [];
  const fieldType = Form.useWatch('field_type', form);

  const groups = useMemo(() => {
    const s = new Set<string>();
    for (const f of rows) if (f.group_name) s.add(f.group_name);
    return Array.from(s).sort();
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    if (fieldType === 'select' || fieldType === 'multiselect') {
      const pairs = form.getFieldValue('option_pairs');
      if (!pairs?.length) {
        form.setFieldValue('option_pairs', [{ entry_key: '', entry_value: '' }]);
      }
    }
  }, [open, fieldType, form]);

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      is_required: false,
      sort_order: 0,
      field_type: 'text',
      option_pairs: [{ entry_key: '', entry_value: '' }],
    });
    setOpen(true);
  };

  const showEdit = (field: ProfileField) => {
    setEditing(field);
    form.resetFields();
    form.setFieldsValue({
      ...field,
      option_pairs: pairsFromOptionsJson(field.options_json),
    });
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    const rawGroup = values.group_name;
    const normalizedGroup =
      Array.isArray(rawGroup) && rawGroup.length > 0 ? rawGroup[0] : rawGroup || null;

    const { option_pairs, ...rest } = values;
    let options_json: ReturnType<typeof optionsJsonFromPairs> = null;
    if (rest.field_type === 'select' || rest.field_type === 'multiselect') {
      options_json = optionsJsonFromPairs(option_pairs);
    }

    const payload = {
      ...rest,
      key_name: normalizeKey(rest.key_name),
      options_json,
      group_name: normalizedGroup,
    };

    try {
      if (editing) {
        await updateField({ id: editing.id, patch: payload }).unwrap();
        message.success('Поле обновлено');
      } else {
        await createField(payload).unwrap();
        message.success('Поле создано');
      }
      setOpen(false);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title="Поля профиля казино"
        description="Схема анкеты: группы, типы полей, порядок и варианты для списков."
        actions={
          <Button type="primary" onClick={showCreate}>
            Добавить поле
          </Button>
        }
      />
      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<ProfileField>
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Группа', dataIndex: 'group_name', key: 'group_name', width: 120, render: (v) => v || '—' },
              { title: 'Label', dataIndex: 'label', key: 'label', width: 180, ellipsis: true },
              { title: 'Key', dataIndex: 'key_name', key: 'key_name', width: 180, ellipsis: true },
              {
                title: 'Тип',
                dataIndex: 'field_type',
                key: 'field_type',
                width: 120,
                render: (v: string) => {
                  const type = FIELD_TYPES.find((t) => t.value === v);
                  return type?.label || v;
                },
              },
              {
                title: 'Обяз.',
                dataIndex: 'is_required',
                key: 'is_required',
                width: 80,
                align: 'center',
                render: (v: boolean) =>
                  v ? <Tag color="success">Да</Tag> : <Tag color="default">Нет</Tag>,
              },
              {
                title: 'Активно',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 90,
                align: 'center',
                render: (v: boolean) =>
                  v ? <Tag color="success">Да</Tag> : <Tag color="default">Нет</Tag>,
              },
              { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 90, align: 'center' },
              {
                title: 'Действия',
                key: 'actions',
                width: 100,
                align: 'right',
                fixed: 'right',
                render: (_, r) => (
                  <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEdit(r)} />
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        try {
                          await deleteField(r.id).unwrap();
                          message.success('Удалено');
                        } catch (e: any) {
                          message.error(e?.data?.error ?? 'Ошибка удаления');
                        }
                      }}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <SettingsEntityDrawer
          open={open}
          onClose={() => setOpen(false)}
          width={640}
          editing={!!editing}
          icon={<FormOutlined />}
          titleCreate="Новое поле профиля"
          titleEdit="Редактировать поле"
          subtitleCreate="Поле появится в анкете казино: тип определяет вид ввода, для списков задайте варианты строками «ключ / подпись»."
          subtitleEdit="Изменения применятся ко всем анкетам; проверьте key и тип, если уже есть заполненные значения."
          alertCreate={{
            message: 'Как заполнить',
            description: (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li style={{ marginBottom: 6 }}>
                  <strong>Key</strong> — латиница и подчёркивания, уникален в системе (например{' '}
                  <code>welcome_bonus</code>).
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>Тип «Список»</strong> — добавьте пары ключ + подпись; JSON для API формируется сам.
                </li>
                <li style={{ marginBottom: 0 }}>
                  <strong>Группа</strong> — для визуального блока в анкете; можно ввести новую или выбрать из существующих.
                </li>
              </ul>
            ),
          }}
          alertEdit={{
            message: 'Редактирование',
            description:
              'Смена типа или key может повлиять на уже сохранённые данные. Для списков обновите варианты в блоке ниже.',
          }}
          onPrimaryClick={() => form.submit()}
          primaryLabelCreate="Создать поле"
          primaryLabelEdit="Сохранить"
        >
          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
            <Card
              size="small"
              title="Идентификаторы и тип"
              style={{ marginBottom: 16 }}
              styles={{ header: { fontWeight: 600 } }}
            >
              <Form.Item
                label="Key (латиница, уникально)"
                name="key_name"
                rules={[{ required: true, message: 'Укажите key' }]}
                extra="Например: welcome_bonus, has_gamification"
              >
                <Input
                  placeholder="welcome_bonus"
                  onBlur={(e) => form.setFieldValue('key_name', normalizeKey(e.target.value))}
                />
              </Form.Item>

              <Form.Item label="Название (label)" name="label" rules={[{ required: true, message: 'Укажите название' }]}>
                <Input placeholder="Приветственный бонус" />
              </Form.Item>

              <Form.Item label="Группа" name="group_name">
                <Select
                  allowClear
                  showSearch
                  mode="tags"
                  maxCount={1}
                  tokenSeparators={[',', ';']}
                  placeholder="Например: Bonuses / Product / UX"
                  options={groups.map((g) => ({ value: g, label: g }))}
                />
              </Form.Item>

              <Form.Item label="Тип поля" name="field_type" rules={[{ required: true, message: 'Выберите тип' }]}>
                <Select options={FIELD_TYPES} placeholder="Тип" />
              </Form.Item>
            </Card>

            <SelectOptionsKeyValueList />

            <Card
              size="small"
              title="Подсказка в анкете"
              style={{ marginBottom: 16 }}
              styles={{ header: { fontWeight: 600 } }}
            >
              <Form.Item label="Описание" name="description">
                <Input.TextArea rows={3} placeholder="Как оценивать поле, откуда брать данные" />
              </Form.Item>
            </Card>

            <Card size="small" title="Порядок и правила" styles={{ header: { fontWeight: 600 } }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Порядок" name="sort_order">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Обязательное" name="is_required" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Активное" name="is_active" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form>
        </SettingsEntityDrawer>
    </Space>
  );
}
