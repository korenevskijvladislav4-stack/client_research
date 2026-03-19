import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  List,
  Space,
  Typography,
  message,
} from 'antd';
import {
  useGetEmailsForCasinoByNameQuery,
  useMarkEmailAsReadMutation,
  Email,
} from '../../../store/api/emailApi';
import dayjs from 'dayjs';

interface EmailEditSectionProps {
  casinoId: number;
}

const PAGE_SIZE = 20;

export default function EmailEditSection({ casinoId }: EmailEditSectionProps) {
  const [page, setPage] = useState(1);
  const { data: emailResp, isLoading, refetch } = useGetEmailsForCasinoByNameQuery(
    { casinoId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    { skip: !casinoId } as any,
  );
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [selected, setSelected] = useState<Email | null>(null);

  return (
    <>
      <List
        loading={isLoading}
        dataSource={emailResp?.data ?? []}
        renderItem={(email) => (
          <List.Item onClick={() => setSelected(email)} style={{ cursor: 'pointer' }}>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Typography.Text strong>{email.from_name || email.from_email || 'Без отправителя'}</Typography.Text>
                  {!email.is_read && <Badge status="processing" text="Новое" />}
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
        pagination={{
          current: page,
          total: emailResp?.total ?? 0,
          pageSize: PAGE_SIZE,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          onChange: (p) => setPage(p),
        }}
      />

      {selected && (
        <Drawer
          open={!!selected}
          onClose={() => setSelected(null)}
          width={720}
          title={selected.subject || '(Без темы)'}
          destroyOnClose
          extra={
            selected && !selected.is_read ? (
              <Button
                onClick={async () => {
                  try { await markAsRead(selected.id).unwrap(); message.success('Отмечено прочитанным'); refetch(); }
                  catch { message.error('Ошибка'); }
                }}
              >Прочитано</Button>
            ) : null
          }
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="От">{selected.from_name || ''} &lt;{selected.from_email}&gt;</Descriptions.Item>
              <Descriptions.Item label="К">{selected.to_email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Дата">
                {selected.date_received ? dayjs(selected.date_received).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="Текст письма">
              {selected.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: selected.body_html }} />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{selected.body_text || 'Нет содержимого'}</pre>
              )}
            </Card>
          </Space>
        </Drawer>
      )}
    </>
  );
}
