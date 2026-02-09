import { List, Pagination, Space, Tag, Typography, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Email } from '../../../store/api/emailApi';
import { PAGE_SIZE } from '../constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmailListProps {
  emails: Email[];
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelect: (email: Email) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailList({
  emails,
  total,
  currentPage,
  onPageChange,
  onSelect,
}: EmailListProps) {
  const { token: themeToken } = theme.useToken();
  return (
    <List
      dataSource={emails}
      locale={{ emptyText: 'Нет писем. Синхронизируйте почту, чтобы загрузить письма.' }}
      renderItem={(email) => (
        <List.Item
          onClick={() => onSelect(email)}
          style={{ cursor: 'pointer' }}
        >
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
                {email.casino_name && (
                  <Tag color="green">{email.casino_name}</Tag>
                )}
                {email.geo && (
                  <Tag color="orange">{email.geo}</Tag>
                )}
                {!email.is_read && <Tag color="blue">Новое</Tag>}
              </Space>
            }
            description={
              <Space direction="vertical" size={2}>
                <Typography.Text>{email.subject || '(Без темы)'}</Typography.Text>
                {email.ai_summary && (
                  <Typography.Text
                    style={{
                      fontSize: 12,
                      color: themeToken.colorPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RobotOutlined style={{ fontSize: 11 }} />
                    {email.ai_summary.length > 100
                      ? email.ai_summary.slice(0, 100) + '…'
                      : email.ai_summary}
                  </Typography.Text>
                )}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {email.date_received
                    ? dayjs(email.date_received).format('YYYY-MM-DD HH:mm')
                    : '—'}
                </Typography.Text>
              </Space>
            }
          />
        </List.Item>
      )}
      footer={
        total > 0 ? (
          <div style={{ textAlign: 'right', padding: '16px 0' }}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              showSizeChanger={false}
              showTotal={(t, range) => `${range[0]}-${range[1]} из ${t}`}
              onChange={(page) => {
                onPageChange(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        ) : undefined
      }
    />
  );
}
