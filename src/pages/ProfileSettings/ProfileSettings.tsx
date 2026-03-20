import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  Tabs,
} from 'antd';
import { EditOutlined, DeleteOutlined, InsertRowAboveOutlined, UnorderedListOutlined } from '@ant-design/icons';
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
import { SettingsEntityDrawer } from '../../components/settings/SettingsEntityDrawer';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { CasinoProfileTable } from '../../components/CasinoProfileTable';

export default function ProfileSettings() {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title="Настройки профиля казино"
        description="Задайте строки (типы настроек) и столбцы (контексты: сайт, почта и т.д.) для матрицы в анкете казино."
      />
      <Tabs
        type="card"
        size="middle"
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
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Эти поля — строки матрицы настроек в анкете казино.
          </Typography.Text>
          <Button type="primary" onClick={showCreate}>
            Добавить поле
          </Button>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<ProfileField>
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              { title: 'Название', dataIndex: 'name', key: 'name', width: 300, ellipsis: true },
              { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
              {
                title: 'Активно',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 110,
                render: (v: boolean) =>
                  v ? <Tag color="success">Да</Tag> : <Tag color="default">Нет</Tag>,
              },
              {
                title: 'Действия',
                key: 'actions',
                width: 120,
                align: 'right',
                render: (_, r) => (
                  <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEdit(r)} />
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
        </div>
      </Card>

      <SettingsEntityDrawer
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        editing={!!editing}
        icon={<UnorderedListOutlined />}
        titleCreate="Новая строка настроек"
        titleEdit="Редактировать строку"
        subtitleCreate="Название строки отображается в первом столбце матрицы «настройки профиля» в анкете казино."
        subtitleEdit="Измените название, порядок или активность — таблица в анкетах обновится после сохранения."
        alertCreate={{
          message: 'Строка матрицы',
          description: (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 6 }}>Одна строка = один тип настройки (например «Лицензия», «KYC»).</li>
              <li style={{ marginBottom: 6 }}>Меньший порядок — выше строка в таблице.</li>
              <li style={{ marginBottom: 0 }}>Неактивные строки не показываются при заполнении анкеты.</li>
            </ul>
          ),
        }}
        alertEdit={{
          message: 'Редактирование',
          description: 'Сохранение затронет отображение строки во всех казино при выборе соответствующего GEO.',
        }}
        onPrimaryClick={() => form.submit()}
        primaryLabelCreate="Создать"
        primaryLabelEdit="Сохранить"
      >
        <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
          <Card size="small" title="Название" style={{ marginBottom: 16 }} styles={{ header: { fontWeight: 600 } }}>
            <Form.Item
              label="Как называется строка"
              name="name"
              rules={[{ required: true, message: 'Укажите название' }]}
            >
              <Input placeholder="Например: Лицензия" />
            </Form.Item>
          </Card>

          <Card size="small" title="Порядок и видимость" styles={{ header: { fontWeight: 600 } }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Порядок сортировки" name="sort_order">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Активно" name="is_active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </SettingsEntityDrawer>
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
        message.success('Контекст обновлён');
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
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Контексты — столбцы матрицы (где применяется настройка: сайт, почта и т.д.).
          </Typography.Text>
          <Button type="primary" onClick={showCreate}>
            Добавить контекст
          </Button>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<ProfileContext>
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              { title: 'Название', dataIndex: 'name', key: 'name', width: 300, ellipsis: true },
              { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
              {
                title: 'Активно',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 110,
                render: (v: boolean) =>
                  v ? <Tag color="success">Да</Tag> : <Tag color="default">Нет</Tag>,
              },
              {
                title: 'Действия',
                key: 'actions',
                width: 120,
                align: 'right',
                render: (_, r) => (
                  <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showEdit(r)} />
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
        </div>
      </Card>

      <SettingsEntityDrawer
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        editing={!!editing}
        icon={<InsertRowAboveOutlined />}
        titleCreate="Новый контекст (столбец)"
        titleEdit="Редактировать контекст"
        subtitleCreate="Столбец матрицы: «На сайте», «В почте», «В CRM» — для каждого контекста отдельные переключатели в анкете."
        subtitleEdit="Имя столбца и порядок можно изменить; неактивный контекст скрывается из таблицы."
        alertCreate={{
          message: 'Контекст = столбец',
          description: (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 6 }}>Один контекст — один набор переключателей для всех строк полей.</li>
              <li style={{ marginBottom: 6 }}>Название должно быть понятно менеджерам (где применяется настройка).</li>
              <li style={{ marginBottom: 0 }}>Порядок столбцов слева направо задаётся числом сортировки.</li>
            </ul>
          ),
        }}
        alertEdit={{
          message: 'Редактирование контекста',
          description: 'Переименование изменит подпись столбца во всех анкетах.',
        }}
        onPrimaryClick={() => form.submit()}
        primaryLabelCreate="Создать"
        primaryLabelEdit="Сохранить"
      >
        <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
          <Card size="small" title="Название" style={{ marginBottom: 16 }} styles={{ header: { fontWeight: 600 } }}>
            <Form.Item
              label="Подпись столбца"
              name="name"
              rules={[{ required: true, message: 'Укажите название' }]}
            >
              <Input placeholder="Например: На сайте / В почте / В CRM" />
            </Form.Item>
          </Card>

          <Card size="small" title="Порядок и видимость" styles={{ header: { fontWeight: 600 } }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Порядок сортировки" name="sort_order">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Активно" name="is_active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </SettingsEntityDrawer>
    </>
  );
}
