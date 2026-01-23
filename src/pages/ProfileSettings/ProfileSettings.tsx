import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Table,
  Typography,
  message,
  Tabs,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useGetSettingsFieldsQuery,
  useCreateSettingsFieldMutation,
  useUpdateSettingsFieldMutation,
  useDeleteSettingsFieldMutation,
  useGetProfileContextsQuery,
  useCreateProfileContextMutation,
  useUpdateProfileContextMutation,
  useDeleteProfileContextMutation,
  ProfileField,
  ProfileContext,
} from '../../store/api/profileSettingsApi';

const { Title } = Typography;

export default function ProfileSettings() {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0, fontWeight: 500 }}>
        Настройки профиля казино
      </Title>
      <Tabs
        items={[
          {
            key: 'fields',
            label: 'Поля (строки)',
            children: <FieldsTab />,
          },
          {
            key: 'contexts',
            label: 'Контексты (столбцы)',
            children: <ContextsTab />,
          },
        ]}
      />
    </Space>
  );
}

function FieldsTab() {
  const { data, isLoading } = useGetSettingsFieldsQuery();
  const [createField] = useCreateSettingsFieldMutation();
  const [updateField] = useUpdateSettingsFieldMutation();
  const [deleteField] = useDeleteSettingsFieldMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileField | null>(null);
  const [form] = Form.useForm();

  const rows = data ?? [];

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, sort_order: 0 });
    setOpen(true);
  };

  const showEdit = (field: ProfileField) => {
    setEditing(field);
    form.resetFields();
    form.setFieldsValue(field);
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        await updateField({ id: editing.id, data: values }).unwrap();
        message.success('Поле обновлено');
      } else {
        await createField(values).unwrap();
        message.success('Поле создано');
      }
      setOpen(false);
    } catch (e: any) {
      message.error(e?.data?.message ?? 'Ошибка сохранения');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Text type="secondary">
          Эти поля будут строками в таблице настроек профиля казино
        </Typography.Text>
        <Button type="primary" onClick={showCreate}>
          Добавить поле
        </Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          pagination={false}
          size="small"
          columns={[
            { title: 'Название', dataIndex: 'name', width: 300 },
            { title: 'Порядок', dataIndex: 'sort_order', width: 100 },
            {
              title: 'Активно',
              dataIndex: 'is_active',
              width: 100,
              render: (v) => (v ? 'Да' : 'Нет'),
            },
            {
              title: 'Действия',
              key: 'actions',
              width: 120,
              align: 'right',
              render: (_, r) => (
                <Space>
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
                        message.error(e?.data?.message ?? 'Ошибка удаления');
                      }
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={editing ? 'Редактировать поле' : 'Создать поле'}
        open={open}
        onClose={() => setOpen(false)}
        width={500}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Например: Лицензия" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Порядок сортировки" name="sort_order">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Активно" name="is_active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Сохранить
            </Button>
          </Space>
        </Form>
      </Drawer>
    </>
  );
}

function ContextsTab() {
  const { data, isLoading } = useGetProfileContextsQuery();
  const [createContext] = useCreateProfileContextMutation();
  const [updateContext] = useUpdateProfileContextMutation();
  const [deleteContext] = useDeleteProfileContextMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileContext | null>(null);
  const [form] = Form.useForm();

  const rows = data ?? [];

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, sort_order: 0 });
    setOpen(true);
  };

  const showEdit = (context: ProfileContext) => {
    setEditing(context);
    form.resetFields();
    form.setFieldsValue(context);
    setOpen(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        await updateContext({ id: editing.id, data: values }).unwrap();
        message.success('Контекст обновлен');
      } else {
        await createContext(values).unwrap();
        message.success('Контекст создан');
      }
      setOpen(false);
    } catch (e: any) {
      message.error(e?.data?.message ?? 'Ошибка сохранения');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Text type="secondary">
          Эти контексты будут столбцами в таблице настроек профиля казино
        </Typography.Text>
        <Button type="primary" onClick={showCreate}>
          Добавить контекст
        </Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          pagination={false}
          size="small"
          columns={[
            { title: 'Название', dataIndex: 'name', width: 300 },
            { title: 'Порядок', dataIndex: 'sort_order', width: 100 },
            {
              title: 'Активно',
              dataIndex: 'is_active',
              width: 100,
              render: (v) => (v ? 'Да' : 'Нет'),
            },
            {
              title: 'Действия',
              key: 'actions',
              width: 120,
              align: 'right',
              render: (_, r) => (
                <Space>
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
                        await deleteContext(r.id).unwrap();
                        message.success('Удалено');
                      } catch (e: any) {
                        message.error(e?.data?.message ?? 'Ошибка удаления');
                      }
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={editing ? 'Редактировать контекст' : 'Создать контекст'}
        open={open}
        onClose={() => setOpen(false)}
        width={500}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Например: На сайте / В почте / В CRM" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Порядок сортировки" name="sort_order">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Активно" name="is_active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              Сохранить
            </Button>
          </Space>
        </Form>
      </Drawer>
    </>
  );
}
