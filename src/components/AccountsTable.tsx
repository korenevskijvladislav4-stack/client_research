import { Table, Popconfirm, Typography, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { CasinoAccount } from '../store/api/casinoAccountApi';
import dayjs from 'dayjs';


interface AccountsTableProps {
  accounts: CasinoAccount[];
  isLoading?: boolean;
  onEdit?: (account: CasinoAccount) => void;
  onDelete?: (id: number) => void;
  onAddTransaction?: (account: CasinoAccount) => void;
  readOnly?: boolean;
}

export function AccountsTable({ accounts, isLoading, onEdit, onDelete, onAddTransaction, readOnly = false }: AccountsTableProps) {

  return (
    <Table
      dataSource={accounts}
      rowKey="id"
      loading={isLoading}
      size="small"
      pagination={false}
      columns={[
        {
          title: 'GEO',
          dataIndex: 'geo',
          key: 'geo',
          width: 80,
          render: (geo: string) => <Typography.Text>{geo}</Typography.Text>,
        },
        {
          title: 'Почта',
          dataIndex: 'email',
          key: 'email',
          render: (email: string | null) =>
            email ? (
              <Typography.Text copyable={{ text: email }}>{email}</Typography.Text>
            ) : (
              '—'
            ),
        },
        {
          title: 'Телефон',
          dataIndex: 'phone',
          key: 'phone',
          render: (phone: string | null) =>
            phone ? (
              <Typography.Text copyable={{ text: phone }}>{phone}</Typography.Text>
            ) : (
              '—'
            ),
        },
        {
          title: 'Пароль',
          dataIndex: 'password',
          key: 'password',
          render: (password: string) => (
            <Typography.Text copyable={{ text: password }} style={{ fontFamily: 'monospace' }}>
              {password}
            </Typography.Text>
          ),
        },
        {
          title: 'Депозиты',
          key: 'deposit_count',
          width: 100,
          align: 'right',
          render: (_: any, r: CasinoAccount) => r.deposit_count ?? 0,
        },
        {
          title: 'Выводы',
          key: 'withdrawal_count',
          width: 100,
          align: 'right',
          render: (_: any, r: CasinoAccount) => r.withdrawal_count ?? 0,
        },
        {
          title: 'Владелец',
          dataIndex: 'owner_username',
          key: 'owner_username',
          render: (username: string | null) => username || '—',
        },
        {
          title: 'Последнее изменение',
          dataIndex: 'last_modified_at',
          key: 'last_modified_at',
          width: 180,
          render: (date: string) =>
            date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '—',
        },
        ...(!readOnly && onAddTransaction
          ? [{
              title: '',
              key: 'tx',
              width: 90,
              render: (_: any, record: CasinoAccount) => (
                <Button type="link" size="small" onClick={() => onAddTransaction(record)}>
                  Деп / Вывод
                </Button>
              ),
            }]
          : []),
        ...(!readOnly && onEdit && onDelete
          ? [
              {
                title: 'Действия',
                key: 'actions',
                width: 120,
                align: 'right' as const,
                render: (_: any, record: CasinoAccount) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(record);
                      }}
                    />
                    <Popconfirm
                      title="Удалить аккаунт?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        onDelete(record.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
