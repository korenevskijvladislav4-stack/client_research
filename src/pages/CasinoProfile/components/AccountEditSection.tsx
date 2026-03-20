import { useState, useMemo } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  theme,
} from 'antd';
import {
  EditOutlined,
  GlobalOutlined,
  KeyOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AccountsTable } from '../../../components/AccountsTable';
import { TransactionModal } from '../../Accounts/TransactionModal';
import {
  useGetCasinoAccountsQuery,
  useCreateCasinoAccountMutation,
  useUpdateCasinoAccountMutation,
  useDeleteCasinoAccountMutation,
  CasinoAccount,
  CreateCasinoAccountDto,
} from '../../../store/api/casinoAccountApi';
import { useGetUsersQuery } from '../../../store/api/userApi';

interface AccountEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

export default function AccountEditSection({ casinoId, activeGeo, geoOptions }: AccountEditSectionProps) {
  const { token } = theme.useToken();
  const { data: accounts, isLoading } = useGetCasinoAccountsQuery(casinoId, { skip: !casinoId });
  const [createAccount] = useCreateCasinoAccountMutation();
  const [updateAccount] = useUpdateCasinoAccountMutation();
  const [deleteAccount] = useDeleteCasinoAccountMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CasinoAccount | null>(null);
  const [transactionAccount, setTransactionAccount] = useState<CasinoAccount | null>(null);
  const [form] = Form.useForm();

  const { data: usersResp } = useGetUsersQuery({ page: 1, pageSize: 100, sortField: 'username', sortOrder: 'asc' });
  const users = usersResp?.data ?? [];
  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` })),
    [users],
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (activeGeo) form.setFieldsValue({ geo: activeGeo });
    setDrawerOpen(true);
  };

  const openEdit = (account: CasinoAccount) => {
    setEditing(account);
    form.resetFields();
    form.setFieldsValue({
      geo: account.geo,
      email: account.email || undefined,
      phone: account.phone || undefined,
      password: account.password,
      owner_id: account.owner_id || undefined,
    });
    setDrawerOpen(true);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить аккаунт
        </Button>
      </div>

      <AccountsTable
        accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
        isLoading={isLoading}
        onAddTransaction={(account) => setTransactionAccount(account)}
        onEdit={openEdit}
        onDelete={async (id) => {
          try {
            await deleteAccount(id).unwrap();
            message.success('Аккаунт удалён');
          } catch {
            message.error('Не удалось удалить аккаунт');
          }
        }}
        readOnly={false}
      />

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        width={640}
        destroyOnClose
        styles={{
          body: { paddingTop: 16 },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
        }}
        title={
          <Space align="start" size={14} style={{ paddingRight: 32 }}>
            <Avatar
              size={48}
              style={{
                background: editing ? token.colorWarning : token.colorPrimary,
                flexShrink: 0,
              }}
              icon={editing ? <EditOutlined /> : <PlusOutlined />}
            />
            <div style={{ minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>
                {editing ? 'Редактировать аккаунт' : 'Новый аккаунт казино'}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13, marginBottom: 0 }}>
                {editing
                  ? 'Обновите GEO, контакты или пароль. История депозитов и выводов — в таблице ниже.'
                  : 'Запись об игровом аккаунте в этом казино: регион, доступ и при желании контакты для поиска.'}
              </Typography.Paragraph>
            </div>
          </Space>
        }
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 140 }} onClick={() => form.submit()}>
              {editing ? 'Сохранить' : 'Создать аккаунт'}
            </Button>
          </Space>
        }
      >
        {editing ? (
          <Alert
            type="info"
            showIcon
            icon={<EditOutlined />}
            message="Редактирование"
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                После сохранения изменения сразу отобразятся в списке аккаунтов. Чтобы добавить депозит или вывод,
                используйте действия в строке таблицы.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как заполнить форму"
            description={
              <div style={{ fontSize: 13 }}>
                <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
                  Аккаунт привязан к этому казино и к выбранному GEO. Депозиты и выводы ведутся отдельно — после
                  создания записи добавляйте операции из таблицы «Аккаунты».
                </Typography.Paragraph>
                <ul style={{ margin: 0, paddingLeft: 20, color: token.colorTextSecondary }}>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>GEO</Typography.Text> — обязательно: страна/рынок этого логина (удобно
                    согласовать с вкладкой GEO в профиле казино).
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>Пароль</Typography.Text> — обязательно: пароль от аккаунта в казино
                    (хранится в CRM для команды; не передавайте посторонним).
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>Почта и телефон</Typography.Text> — по желанию: ускоряют поиск и напоминание,
                    какой логин к чему относится.
                  </li>
                  <li>
                    <Typography.Text strong>Владелец</Typography.Text> — сотрудник, ответственный за аккаунт
                    (необязательно; помогает в отчётах и фильтре «Все аккаунты»).
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ geo: undefined, email: undefined, phone: undefined, password: '', owner_id: undefined }}
          onFinish={async (values: CreateCasinoAccountDto) => {
            try {
              if (editing) {
                await updateAccount({ id: editing.id, data: values }).unwrap();
                message.success('Аккаунт обновлён');
              } else {
                await createAccount({ casinoId, data: values }).unwrap();
                message.success('Аккаунт создан');
              }
              closeDrawer();
            } catch (e: any) {
              message.error(e?.data?.error || 'Ошибка сохранения');
            }
          }}
        >
          <Card
            size="small"
            title={
              <Space size={8}>
                <GlobalOutlined style={{ color: token.colorPrimary }} />
                <span>Регион и ответственный</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 8 } }}
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Выберите GEO' }]}
              extra="Рынок, для которого заведён этот логин в казино."
            >
              <Select
                size="large"
                placeholder="Выберите GEO"
                options={geoOptions}
                showSearch
                suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
              />
            </Form.Item>

            <Form.Item
              name="owner_id"
              label="Владелец (сотрудник)"
              extra="Кто ведёт этот аккаунт внутри команды. Можно оставить пустым."
            >
              <Select
                placeholder="Выберите пользователя"
                options={userOptions}
                allowClear
                showSearch
                suffixIcon={<TeamOutlined style={{ color: token.colorTextQuaternary }} />}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <UserOutlined style={{ color: token.colorPrimary }} />
                <span>Контакты и пароль</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 4 } }}
            style={{ marginBottom: 8, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item
              name="email"
              label="Почта"
              extra="Email логина в казино или для восстановления — как договорились в команде."
            >
              <Input
                placeholder="email@example.com"
                type="email"
                allowClear
                prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Телефон"
              extra="Если к аккаунту привязан номер — укажите в международном формате."
            >
              <Input
                placeholder="+7 900 000-00-00"
                allowClear
                prefix={<PhoneOutlined style={{ color: token.colorTextQuaternary }} />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Укажите пароль от аккаунта' }]}
              extra="Пароль для входа в казино. При редактировании можно заменить или оставить прежний в поле."
            >
              <Input.Password prefix={<KeyOutlined style={{ color: token.colorTextQuaternary }} />} />
            </Form.Item>
          </Card>
        </Form>
      </Drawer>

      <TransactionModal
        open={!!transactionAccount}
        onClose={() => setTransactionAccount(null)}
        account={transactionAccount}
        onSuccess={() => setTransactionAccount(null)}
      />
    </>
  );
}
