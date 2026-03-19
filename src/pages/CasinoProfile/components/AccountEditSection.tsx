import { useState, useMemo } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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

  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); form.resetFields(); };

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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить аккаунт</Button>
      </div>

      <AccountsTable
        accounts={(accounts ?? []).filter((a) => (activeGeo ? a.geo === activeGeo : true))}
        isLoading={isLoading}
        onAddTransaction={(account) => setTransactionAccount(account)}
        onEdit={openEdit}
        onDelete={async (id) => {
          try { await deleteAccount(id).unwrap(); message.success('Аккаунт удалён'); }
          catch { message.error('Не удалось удалить аккаунт'); }
        }}
        readOnly={false}
      />

      <Drawer
        title={editing ? 'Редактировать аккаунт' : 'Новый аккаунт'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={480}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Сохранить' : 'Создать'}</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical"
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
          <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Выберите GEO' }]}>
            <Select placeholder="Выберите GEO" options={geoOptions} showSearch />
          </Form.Item>
          <Form.Item name="email" label="Почта"><Input placeholder="email@example.com" type="email" /></Form.Item>
          <Form.Item name="phone" label="Телефон"><Input placeholder="+1234567890" /></Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="owner_id" label="Владелец">
            <Select placeholder="Выберите владельца" options={userOptions} allowClear showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
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
