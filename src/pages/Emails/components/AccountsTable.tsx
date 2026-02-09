import { useState } from 'react';
import { Button, Popconfirm, Space, Table, Tag, Tooltip, message } from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  GoogleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  useTestImapAccountMutation,
  useDeleteImapAccountMutation,
  type ImapAccount,
} from '../../../store/api/imapAccountApi';
import { useSyncEmailsMutation, emailApi } from '../../../store/api/emailApi';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AccountsTableProps {
  accounts: ImapAccount[];
  loading: boolean;
  onEdit: (account: ImapAccount) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountsTable({ accounts, loading, onEdit }: AccountsTableProps) {
  const [testAccount] = useTestImapAccountMutation();
  const [deleteAccount] = useDeleteImapAccountMutation();
  const [syncEmails] = useSyncEmailsMutation();

  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await testAccount(id).unwrap();
      if (res.success) {
        message.success('Подключение успешно');
      } else {
        message.error(res.error ?? 'Ошибка подключения');
      }
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка подключения');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      const res = await syncEmails({ accountId: id }).unwrap();
      message.success(res.message ?? `Синхронизировано: ${res.totalSynced ?? 0} писем`);
      emailApi.util.invalidateTags(['Email']);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка синхронизации');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAccount(id).unwrap();
      message.success('Аккаунт удалён');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка удаления');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: ImapAccount) => (
        <Space size={6}>
          <strong>{name}</strong>
          {row.connection_type === 'gmail_oauth' && (
            <Tooltip title="Подключено через Google OAuth">
              <GoogleOutlined style={{ color: '#4285F4' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Сервер',
      dataIndex: 'host',
      key: 'host',
      responsive: ['md' as const],
    },
    {
      title: 'Пользователь',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Статус',
      key: 'status',
      width: 100,
      render: (_: unknown, row: ImapAccount) =>
        row.is_active ? <Tag color="blue">Активен</Tag> : <Tag>Неактивен</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 240,
      render: (_: unknown, row: ImapAccount) => (
        <Space size="small" wrap>
          <Tooltip title="Проверить подключение">
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={testingId === row.id}
              onClick={() => handleTest(row.id)}
            />
          </Tooltip>
          <Tooltip title="Синхронизировать">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              loading={syncingId === row.id}
              onClick={() => handleSync(row.id)}
            />
          </Tooltip>
          {row.connection_type !== 'gmail_oauth' && (
            <Tooltip title="Редактировать">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(row)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Удалить аккаунт?"
            description="Письма, уже синхронизированные, останутся."
            onConfirm={() => handleDelete(row.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      loading={loading}
      dataSource={accounts}
      rowKey="id"
      columns={columns}
      pagination={false}
      locale={{
        emptyText:
          'Нет почтовых аккаунтов. Нажмите «Добавить аккаунт», чтобы подключить ящик.',
      }}
    />
  );
}
