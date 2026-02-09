import { useEffect, useState } from 'react';
import { Button, Card, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { AccountsTable, AccountFormModal } from './components';
import {
  useGetImapAccountsQuery,
  useGmailOAuthCallbackMutation,
  type ImapAccount,
} from '../../store/api/imapAccountApi';

const { Title } = Typography;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImapAccounts() {
  const { data: accounts = [], isLoading } = useGetImapAccountsQuery();
  const [gmailCallback] = useGmailOAuthCallbackMutation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImapAccount | null>(null);

  // -------------------------------------------------------------------------
  // Handle Gmail OAuth callback redirect
  // -------------------------------------------------------------------------

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Remove the query params from the URL to avoid re-triggering
      setSearchParams({}, { replace: true });

      gmailCallback({ code })
        .unwrap()
        .then(() => {
          message.success('Gmail аккаунт успешно подключён через OAuth!');
        })
        .catch((err) => {
          message.error(err?.data?.error ?? 'Ошибка подключения Gmail через OAuth');
        });
    }
  }, [searchParams, setSearchParams, gmailCallback]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (account: ImapAccount) => {
    setEditing(account);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space>
          <Link to="/emails">← Почта</Link>
          <Title level={3} style={{ margin: 0, fontWeight: 500 }}>
            Почтовые аккаунты
          </Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить аккаунт
        </Button>
      </div>

      {/* Table */}
      <Card>
        <AccountsTable accounts={accounts} loading={isLoading} onEdit={openEdit} />
      </Card>

      {/* Add / Edit modal */}
      <AccountFormModal open={modalOpen} editing={editing} onClose={closeModal} />
    </Space>
  );
}
