import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { CasinoProfileTable } from '../../components/CasinoProfileTable';
import { SettingsEntityDrawer } from '../../components/settings/SettingsEntityDrawer';
import {
  useGetChatAiModelsAdminQuery,
  useCreateChatAiModelMutation,
  useUpdateChatAiModelMutation,
  useDeleteChatAiModelMutation,
  type ChatAiModel,
} from '../../store/api/chatModelsApi';
import { getApiErrorMessage } from '../../store/api/baseApi';

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ChatModelsSettings() {
  const { token } = theme.useToken();
  const { data: rows = [], isLoading, error } = useGetChatAiModelsAdminQuery();
  const [createModel] = useCreateChatAiModelMutation();
  const [updateModel] = useUpdateChatAiModelMutation();
  const [deleteModel] = useDeleteChatAiModelMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChatAiModel | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (error) {
      message.error(getApiErrorMessage(error, 'Нет доступа или ошибка загрузки'));
    }
  }, [error]);

  const showCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      sort_order: 0,
    });
    setOpen(true);
  };

  const showEdit = (r: ChatAiModel) => {
    setEditing(r);
    form.setFieldsValue({
      model_id: r.model_id,
      label: r.label,
      input_price_per_million: numOrNull(r.input_price_per_million),
      output_price_per_million: numOrNull(r.output_price_per_million),
      is_active: r.is_active,
      sort_order: r.sort_order,
    });
    setOpen(true);
  };

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        model_id: String(values.model_id ?? '').trim(),
        label: String(values.label ?? '').trim(),
        input_price_per_million: numOrNull(values.input_price_per_million),
        output_price_per_million: numOrNull(values.output_price_per_million),
        is_active: Boolean(values.is_active),
        sort_order: Number(values.sort_order ?? 0),
      };
      if (editing) {
        await updateModel({ id: editing.id, data: payload }).unwrap();
        message.success('Модель обновлена');
      } else {
        await createModel(payload).unwrap();
        message.success('Модель добавлена');
      }
      setOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (e: unknown) {
      message.error(getApiErrorMessage(e, 'Ошибка сохранения'));
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title="Модели чата (ИИ)"
        description="Список моделей для ассистента: id как у провайдера (OpenRouter), подпись и ориентир стоимости $ за 1M токенов на вход и на выход. Только активные модели попадают в чат."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreate}>
            Добавить модель
          </Button>
        }
      />

      <Alert
        type="info"
        showIcon
        message="Приоритет конфигурации"
        description={
          <>
            Если в таблице есть хотя бы одна запись, чат использует <strong>только её</strong> (активные
            строки). Если таблица пуста — подставляются модели из <code>CHAT_MODEL_OPTIONS</code> /{' '}
            <code>OPENAI_MODEL</code> в .env без цен.
          </>
        }
      />

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<ChatAiModel>
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 960 }}
            columns={[
              { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 90, align: 'center' },
              { title: 'ID модели', dataIndex: 'model_id', key: 'model_id', width: 220, ellipsis: true },
              { title: 'Подпись', dataIndex: 'label', key: 'label', width: 200, ellipsis: true },
              {
                title: 'Вход $/1M',
                key: 'in',
                width: 110,
                align: 'right',
                render: (_, r) => {
                  const n = numOrNull(r.input_price_per_million);
                  return n != null ? n.toFixed(6).replace(/\.?0+$/, '') : '—';
                },
              },
              {
                title: 'Выход $/1M',
                key: 'out',
                width: 110,
                align: 'right',
                render: (_, r) => {
                  const n = numOrNull(r.output_price_per_million);
                  return n != null ? n.toFixed(6).replace(/\.?0+$/, '') : '—';
                },
              },
              {
                title: 'Активна',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 100,
                align: 'center',
                render: (v: boolean) =>
                  v ? <Tag color="success">Да</Tag> : <Tag>Нет</Tag>,
              },
              {
                title: 'Действия',
                key: 'actions',
                width: 120,
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
                          await deleteModel(r.id).unwrap();
                          message.success('Удалено');
                        } catch (e: unknown) {
                          message.error(getApiErrorMessage(e, 'Не удалось удалить'));
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
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        width={560}
        editing={!!editing}
        icon={<RobotOutlined />}
        titleCreate="Новая модель чата"
        titleEdit="Редактировать модель"
        subtitleCreate="Укажите тот же model id, что в OpenRouter / API (например openai/gpt-4o-mini)."
        subtitleEdit="Смена model_id повлияет на новые запросы; старые сообщения в чатах не меняются."
        onPrimaryClick={() => form.submit()}
        primaryLabelCreate="Создать"
        primaryLabelEdit="Сохранить"
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Card
            size="small"
            title="Идентификатор"
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ header: { fontWeight: 600 } }}
          >
            <Form.Item
              name="model_id"
              label="Model ID"
              rules={[{ required: true, message: 'Укажите id модели' }]}
              extra="Как в документации провайдера, например anthropic/claude-3.5-sonnet"
            >
              <Input placeholder="openai/gpt-4o-mini" disabled={!!editing} />
            </Form.Item>
            <Form.Item name="label" label="Короткая подпись в интерфейсе">
              <Input placeholder="GPT-4o mini" />
            </Form.Item>
          </Card>
          <Card
            size="small"
            title="Стоимость (справочно, USD за 1 млн токенов)"
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ header: { fontWeight: 600 } }}
          >
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0 }}>
              Подставьте актуальные цены с сайта провайдера — они показываются в селекте чата рядом с моделью.
            </Typography.Paragraph>
            <Form.Item name="input_price_per_million" label="На вход (prompt)">
              <InputNumber min={0} step={0.000001} style={{ width: '100%' }} placeholder="0.15" />
            </Form.Item>
            <Form.Item name="output_price_per_million" label="На выход (completion)">
              <InputNumber min={0} step={0.000001} style={{ width: '100%' }} placeholder="0.60" />
            </Form.Item>
          </Card>
          <Card size="small" title="Отображение" styles={{ header: { fontWeight: 600 } }}>
            <Form.Item name="sort_order" label="Порядок в списке">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="is_active" label="Активна" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Card>
        </Form>
      </SettingsEntityDrawer>
    </Space>
  );
}
