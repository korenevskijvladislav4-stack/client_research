import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useCreateProfileFieldMutation,
  useDeleteProfileFieldMutation,
  useListProfileFieldsQuery,
  useUpdateProfileFieldMutation,
  ProfileField,
} from '../../store/api/casinoProfileApi';

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

  const groups = useMemo(() => {
    const s = new Set<string>();
    for (const f of rows) if (f.group_name) s.add(f.group_name);
    return Array.from(s).sort();
  }, [rows]);

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, is_required: false, sort_order: 0, field_type: 'text' });
    setOpen(true);
  };

  const showEdit = (field: ProfileField) => {
    setEditing(field);
    form.resetFields();
    form.setFieldsValue({
      ...field,
      options_json: field.options_json ? JSON.stringify(field.options_json, null, 2) : '',
    });
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    const rawGroup = values.group_name;
    const normalizedGroup =
      Array.isArray(rawGroup) && rawGroup.length > 0 ? rawGroup[0] : rawGroup || null;

    const payload = {
      ...values,
      key_name: normalizeKey(values.key_name),
      options_json: values.options_json ? JSON.parse(values.options_json) : null,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>
          Поля профиля казино
        </Typography.Title>
        <Button type="primary" onClick={showCreate}>
          Добавить поле
        </Button>
      </div>
      <Card>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: true, responsive: true }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Группа', dataIndex: 'group_name', width: 120, render: (v) => v || '—' },
          { title: 'Label', dataIndex: 'label', width: 180, ellipsis: true },
          { title: 'Key', dataIndex: 'key_name', width: 180, ellipsis: true },
          { 
            title: 'Тип', 
            dataIndex: 'field_type', 
            width: 120,
            render: (v: string) => {
              const type = FIELD_TYPES.find(t => t.value === v);
              return type?.label || v;
            }
          },
          {
            title: 'Обяз.',
            dataIndex: 'is_required',
            width: 70,
            align: 'center',
            render: (v) => (v ? 'Да' : 'Нет'),
          },
          {
            title: 'Активно',
            dataIndex: 'is_active',
            width: 70,
            align: 'center',
            render: (v) => (v ? 'Да' : 'Нет'),
          },
          { title: 'Порядок', dataIndex: 'sort_order', width: 80, align: 'center' },
          {
            title: 'Действия',
            key: 'actions',
            width: 100,
            align: 'right',
            fixed: 'right',
            render: (_, r) => (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => showEdit(r)}
                />
                <Button
                  type="link"
                  danger
                  size="small"
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

      <Drawer
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? 'Редактировать поле' : 'Создать поле'}
          </Typography.Title>
        }
        open={open}
        onClose={() => setOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onFinish} size="large">
          <Form.Item
            label="Key (латиница, уникально)"
            name="key_name"
            rules={[{ required: true, message: 'Укажите key' }]}
            extra="Например: welcome_bonus, has_gamification, vip_program_quality"
          >
            <Input placeholder="welcome_bonus" onBlur={(e) => form.setFieldValue('key_name', normalizeKey(e.target.value))} />
          </Form.Item>

          <Form.Item label="Название (label)" name="label" rules={[{ required: true }]}>
            <Input placeholder="Приветственный бонус" />
          </Form.Item>

          <Form.Item label="Группа" name="group_name">
            <Select
              allowClear
              showSearch
              mode="tags"
              tokenSeparators={[',', ';']}
              placeholder="Например: Bonuses / Product / Payments / UX"
              options={groups.map((g) => ({ value: g, label: g }))}
            />
          </Form.Item>

          <Form.Item label="Тип" name="field_type" rules={[{ required: true }]}>
            <Select options={FIELD_TYPES} />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} placeholder="Как оценивать/что считать источником" />
          </Form.Item>

          <Form.Item
            label="Options (JSON) — для select/multiselect"
            name="options_json"
            extra='Пример: {"options":[{"value":"high","label":"Высокий"},{"value":"low","label":"Низкий"}]}'
          >
            <Input.TextArea rows={6} placeholder='{"options":[{"value":"yes","label":"Да"}]}' />
          </Form.Item>

          <Space>
            <Form.Item label="Порядок" name="sort_order">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item label="Обязательное" name="is_required" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Активное" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit" style={{ minWidth: 120 }}>
              Сохранить
            </Button>
          </Space>
        </Form>
      </Drawer>
      </Card>
    </Space>
  );
}

