import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
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
import { SettingsEntityDrawer } from '../../components/settings/SettingsEntityDrawer';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { CasinoProfileTable } from '../../components/CasinoProfileTable';

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
        await updateTopic({
          id: editing.id,
          name: values.name,
          description: values.description || undefined,
        }).unwrap();
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
      <PageHeaderCard
        title={
          <Space size={8}>
            <MailOutlined />
            <span>Темы писем</span>
          </Space>
        }
        description="Список тем для ИИ-классификации входящих писем."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Добавить тему
          </Button>
        }
      />
      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<EmailTopic>
            rowKey="id"
            loading={isLoading}
            dataSource={topics}
            pagination={false}
            scroll={{ x: 560 }}
            locale={{ emptyText: 'Нет тем. Добавьте темы, чтобы ИИ мог классифицировать письма.' }}
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
                title: 'Действия',
                key: 'actions',
                width: 110,
                align: 'right',
                render: (_, record) => (
                  <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <SettingsEntityDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        editing={!!editing}
        icon={<MailOutlined />}
        titleCreate="Новая тема письма"
        titleEdit="Редактировать тему"
        subtitleCreate="Тема подсказывает модели, к какому типу относить входящие письма."
        subtitleEdit="Обновите название или описание — классификация новых писем будет использовать новые данные."
        alertCreate={{
          message: 'Подсказка для ИИ',
          description:
            'В описании перечислите признаки писем этой темы (тема письма, отправитель, ключевые слова). Чем конкретнее текст, тем стабильнее классификация.',
        }}
        alertEdit={{
          message: 'Изменение темы',
          description: 'Сохранённые письма не пересчитываются автоматически; правила применяются к новым сообщениям.',
        }}
        onPrimaryClick={() => form.submit()}
        primaryLabelCreate="Добавить тему"
        primaryLabelEdit="Сохранить"
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
          <Card size="small" title="Название" style={{ marginBottom: 16 }} styles={{ header: { fontWeight: 600 } }}>
            <Form.Item name="name" label="Короткое имя темы" rules={[{ required: true, message: 'Введите название' }]}>
              <Input placeholder="Например: Промо-предложение" />
            </Form.Item>
          </Card>
          <Card size="small" title="Описание для модели" styles={{ header: { fontWeight: 600 } }}>
            <Form.Item name="description" label="Какие письма относятся к теме">
              <Input.TextArea rows={4} placeholder="Опишите для ИИ: формулировки, типичные отправители, ключевые слова…" />
            </Form.Item>
          </Card>
        </Form>
      </SettingsEntityDrawer>
    </Space>
  );
}
