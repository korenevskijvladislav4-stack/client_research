import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Steps,
  Switch,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ProviderSelect from './ProviderSelect';
import { EMAIL_PROVIDERS, type EmailProvider } from '../constants';
import {
  useCreateImapAccountMutation,
  useUpdateImapAccountMutation,
  useGetGmailOAuthStatusQuery,
  useLazyGetGmailAuthUrlQuery,
  type ImapAccount,
} from '../../../store/api/imapAccountApi';

const { Link } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AccountFormModalProps {
  open: boolean;
  editing: ImapAccount | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

interface FormValues {
  name: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  tls: boolean;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountFormModal({ open, editing, onClose }: AccountFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState<'provider' | 'form'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);

  const [createAccount, { isLoading: creating }] = useCreateImapAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateImapAccountMutation();
  const { data: gmailStatus } = useGetGmailOAuthStatusQuery();
  const [triggerGmailAuth, { isFetching: gmailAuthLoading }] = useLazyGetGmailAuthUrlQuery();

  const saving = creating || updating;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editing) {
        // Editing existing account → go straight to form
        setStep('form');
        // Try to detect the provider from host
        const detected = EMAIL_PROVIDERS.find(
          (p) => p.id !== 'custom' && p.host === editing.host,
        );
        setSelectedProvider(detected || EMAIL_PROVIDERS.find((p) => p.id === 'custom')!);
        form.setFieldsValue({
          name: editing.name,
          host: editing.host,
          port: editing.port,
          user: editing.user,
          tls: editing.tls,
          is_active: editing.is_active,
        });
      } else {
        // New account → start with provider selection
        setStep('provider');
        setSelectedProvider(null);
        form.resetFields();
      }
    }
  }, [open, editing, form]);

  // ---------------------------------------------------------------------------
  // Provider selection
  // ---------------------------------------------------------------------------

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    setStep('form');
    form.setFieldsValue({
      name: provider.id !== 'custom' ? provider.name : '',
      host: provider.host,
      port: provider.port,
      tls: provider.tls,
      is_active: true,
    });
  };

  const handleGmailOAuth = async () => {
    try {
      const result = await triggerGmailAuth().unwrap();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось начать OAuth-авторизацию');
    }
  };

  const handleBack = () => {
    setStep('provider');
    setSelectedProvider(null);
    form.resetFields();
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleFinish = async (values: FormValues) => {
    try {
      if (editing) {
        await updateAccount({
          id: editing.id,
          body: {
            name: values.name,
            host: values.host,
            port: values.port,
            user: values.user,
            ...(values.password ? { password: values.password } : {}),
            tls: values.tls,
            is_active: values.is_active,
          },
        }).unwrap();
        message.success('Аккаунт обновлён');
      } else {
        if (!values.password?.trim()) {
          message.error('Укажите пароль');
          return;
        }
        await createAccount({
          name: values.name,
          host: values.host,
          port: values.port ?? 993,
          user: values.user,
          password: values.password!,
          tls: values.tls ?? true,
          is_active: values.is_active ?? true,
        }).unwrap();
        message.success('Аккаунт добавлен');
      }
      onClose();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  // ---------------------------------------------------------------------------
  // Dynamic help alert for selected provider
  // ---------------------------------------------------------------------------

  const providerAlert = useMemo(() => {
    if (!selectedProvider || !selectedProvider.helpText) return null;
    return (
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`${selectedProvider.name}: подсказка`}
        description={
          <Space direction="vertical" size={4}>
            <span>{selectedProvider.helpText}</span>
            {selectedProvider.helpUrl && (
              <Link href={selectedProvider.helpUrl} target="_blank">
                Подробная инструкция →
              </Link>
            )}
          </Space>
        }
      />
    );
  }, [selectedProvider]);

  // Current step index for Steps component
  const currentStep = step === 'provider' ? 0 : 1;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      title={editing ? 'Редактировать почтовый аккаунт' : 'Добавить почтовый аккаунт'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={560}
    >
      {!editing && (
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 20 }}
          items={[
            { title: 'Провайдер' },
            { title: 'Настройки' },
          ]}
        />
      )}

      {step === 'provider' && !editing && (
        <ProviderSelect
          onSelect={handleProviderSelect}
          gmailOAuthConfigured={gmailStatus?.configured}
          onGmailOAuth={handleGmailOAuth}
          gmailOAuthLoading={gmailAuthLoading}
        />
      )}

      {step === 'form' && (
        <>
          {!editing && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginBottom: 12 }}
            >
              Назад к выбору провайдера
            </Button>
          )}

          {providerAlert}

          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item name="name" label="Название аккаунта" rules={[{ required: true, message: 'Введите название' }]}>
              <Input placeholder="Например: Рабочая почта" />
            </Form.Item>

            <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
              <Form.Item
                name="host"
                label="IMAP-сервер"
                rules={[{ required: true, message: 'Укажите хост' }]}
                style={{ flex: 1 }}
              >
                <Input
                  placeholder="imap.example.com"
                  disabled={selectedProvider?.id !== 'custom' && !editing}
                />
              </Form.Item>

              <Form.Item name="port" label="Порт" rules={[{ required: true }]} style={{ width: 100 }}>
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  disabled={selectedProvider?.id !== 'custom' && !editing}
                />
              </Form.Item>
            </Space>

            <Form.Item
              name="user"
              label="Email / логин"
              rules={[{ required: true, message: 'Укажите логин' }]}
            >
              <Input placeholder="user@example.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                editing
                  ? 'Пароль (оставьте пустым, чтобы не менять)'
                  : 'Пароль (или пароль приложения)'
              }
              rules={editing ? [] : [{ required: true, message: 'Укажите пароль' }]}
            >
              <Input.Password
                placeholder={editing ? '••••••••' : 'Пароль'}
                autoComplete="new-password"
              />
            </Form.Item>

            <Space size={24}>
              <Form.Item name="tls" label="TLS" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="is_active" label="Активен" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>

            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {editing ? 'Сохранить' : 'Добавить'}
                </Button>
                <Button onClick={onClose}>Отмена</Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
