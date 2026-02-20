import { useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, MailOutlined } from '@ant-design/icons';
import {
  useGetEmailTopicsQuery,
  useCreateEmailTopicMutation,
  useUpdateEmailTopicMutation,
  useDeleteEmailTopicMutation,
  type EmailTopic,
} from '../../store/api/emailApi';

export default function EmailTopics() {
  const { data: topics = [], isLoading } = useGetEmailTopicsQuery();
  const [createTopic] = useCreateEmailTopicMutation();
  const [updateTopic] = useUpdateEmailTopicMutation();
  const [deleteTopic] = useDeleteEmailTopicMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTopic | null>(null);
  const [form] = Form.useForm();

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleEdit = (topic: EmailTopic) => {
    setEditing(topic);
    form.setFieldsValue({ name: topic.name, description: topic.description ?? '' });
    setDrawerOpen(true);
  };

  const handleFinish = async (values: { name: string; description?: string }) => {
    try {
      if (editing) {
        await updateTopic({ id: editing.id, name: values.name, description: values.description || undefined }).unwrap();
        message.success('Тема обновлена');
      } else {
        await createTopic({ name: values.name, description: values.description }).unwrap();
        message.success('Тема добавлена');
      }
      setDrawerOpen(false);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  const handleDelete = async (topic: EmailTopic) => {
    try {
      await deleteTopic(topic.id).unwrap();
      message.success('Тема удалена');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка удаления');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <MailOutlined style={{ marginRight: 8 }} />
            Темы писем
          </Typography.Title>
          <Typography.Text type="secondary">
            Список тем для ИИ-классификации писем. При синхронизации и при ручном запросе саммари тема подбирается по описанию.
          </Typography.Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Добавить тему
        </Button>
      </div>
      <Card>
        <Table<EmailTopic>
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={topics}
          columns={[
            { title: 'Название', dataIndex: 'name', key: 'name', ellipsis: true },
            {
              title: 'Описание',
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
              render: (v: string) => v || '—',
            },
            {
              title: '',
              key: 'actions',
              width: 100,
              render: (_, record) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
              ),
            },
          ]}
          pagination={false}
          locale={{ emptyText: 'Нет тем. Добавьте темы, чтобы ИИ мог классифицировать письма.' }}
        />
      </Card>

      <Drawer
        title={editing ? 'Редактировать тему' : 'Добавить тему'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Например: Промо-предложение" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={4} placeholder="Опишите, какие письма относятся к этой теме (для ИИ)" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editing ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button onClick={() => setDrawerOpen(false)}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
