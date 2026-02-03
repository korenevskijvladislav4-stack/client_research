import { useMemo, useState } from 'react';
import {
  useGetEmailsQuery,
  useGetRecipientsQuery,
  useSyncEmailsMutation,
  useMarkEmailAsReadMutation,
  useLinkEmailToCasinoMutation,
  Email,
} from '../../store/api/emailApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { Button, Card, Descriptions, Drawer, List, Pagination, Select, Space, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

type ReadFilter = 'all' | 'unread' | 'read';

export default function Emails() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCasinoId, setFilterCasinoId] = useState<number | undefined>(undefined);
  const [filterToEmail, setFilterToEmail] = useState<string | undefined>(undefined);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const { data: emailsResponse, isLoading, refetch } = useGetEmailsQuery({
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
    ...(readFilter !== 'all' ? { is_read: readFilter === 'read' } : {}),
    ...(filterCasinoId ? { related_casino_id: filterCasinoId } : {}),
    ...(filterToEmail ? { to_email: filterToEmail } : {}),
  });
  const { data: recipients = [] } = useGetRecipientsQuery();
  const { data: casinos } = useGetAllCasinosQuery();
  const [syncEmails] = useSyncEmailsMutation();
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [linkToCasino] = useLinkEmailToCasinoMutation();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [syncing, setSyncing] = useState(false);

  const emails = emailsResponse?.data ?? [];
  const total = emailsResponse?.total ?? 0;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncEmails().unwrap();
      refetch();
    } catch (error) {
      message.error('Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id).unwrap();
      refetch();
    } catch (error) {
      message.error('Не удалось отметить как прочитанное');
    }
  };

  const handleLinkToCasino = async (emailId: number, casinoId: number) => {
    try {
      await linkToCasino({ id: emailId, casino_id: casinoId }).unwrap();
      refetch();
      message.success('Связано с казино');
    } catch (error) {
      message.error('Не удалось связать');
    }
  };

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  if (isLoading) return <Card loading />;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 500 }}>
          Почта
        </Typography.Title>
        <Button type="primary" loading={syncing} onClick={handleSync}>
          {syncing ? 'Синхронизация...' : 'Синхронизировать'}
        </Button>
      </div>
      <Card>
        <Space
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space wrap>
            <Select
              allowClear
              placeholder="Фильтр по казино"
              style={{ minWidth: 220 }}
              options={casinoOptions}
              value={filterCasinoId}
              onChange={(value) => {
                setFilterCasinoId(value);
                setCurrentPage(1);
              }}
            />
            <Select
              allowClear
              showSearch
              placeholder="Получатель"
              style={{ minWidth: 220 }}
              options={recipients.map((r) => ({ value: r, label: r }))}
              value={filterToEmail}
              onChange={(value) => {
                setFilterToEmail(value);
                setCurrentPage(1);
              }}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select<ReadFilter>
              value={readFilter}
              style={{ minWidth: 180 }}
              onChange={(value) => {
                setReadFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'Все письма' },
                { value: 'unread', label: 'Непрочитанные' },
                { value: 'read', label: 'Прочитанные' },
              ]}
            />
          </Space>
        </Space>

        <List
        dataSource={emails}
        renderItem={(email) => (
          <List.Item onClick={() => setSelectedEmail(email)} style={{ cursor: 'pointer' }}>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Typography.Text strong>
                    {email.from_name || email.from_email || 'Без отправителя'}
                  </Typography.Text>
                  {email.to_email && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      → {email.to_email}
                    </Typography.Text>
                  )}
                  {!email.is_read ? <Tag color="blue">Новое</Tag> : null}
                  {email.related_casino_id ? <Tag color="green">Связано</Tag> : null}
                </Space>
              }
              description={
                <Space direction="vertical" size={2}>
                  <Typography.Text>{email.subject || '(Без темы)'}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {email.date_received ? dayjs(email.date_received).format('YYYY-MM-DD HH:mm') : '—'}
                  </Typography.Text>
                </Space>
              }
            />
          </List.Item>
        )}
        footer={
          <div style={{ textAlign: 'right', padding: '16px 0' }}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              showSizeChanger={false}
              showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
              onChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        }
        />

        <Drawer
        open={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        width={720}
        title={selectedEmail?.subject || '(Без темы)'}
        destroyOnClose
        extra={
          selectedEmail && !selectedEmail.is_read ? (
            <Button onClick={() => handleMarkAsRead(selectedEmail.id)}>Отметить прочитанным</Button>
          ) : null
        }
      >
        {selectedEmail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="От">
                {selectedEmail.from_name || ''} &lt;{selectedEmail.from_email}&gt;
              </Descriptions.Item>
              <Descriptions.Item label="К">{selectedEmail.to_email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Дата">
                {selectedEmail.date_received ? dayjs(selectedEmail.date_received).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Связать с казино">
                <Select
                  style={{ width: '100%' }}
                  options={casinoOptions}
                  allowClear
                  value={selectedEmail.related_casino_id ?? undefined}
                  onChange={(v) => v && handleLinkToCasino(selectedEmail.id, v)}
                  placeholder="Выберите казино"
                />
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="Текст письма">
              {selectedEmail.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedEmail.body_text || 'Нет содержимого'}
                </pre>
              )}
            </Card>
          </Space>
        ) : null}
        </Drawer>
      </Card>
    </Space>
  );
}
