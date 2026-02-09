import { Card, Col, Row, Tag, Typography } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { EMAIL_PROVIDERS, type EmailProvider } from '../constants';

const { Text } = Typography;

interface ProviderSelectProps {
  onSelect: (provider: EmailProvider) => void;
  gmailOAuthConfigured?: boolean;
  onGmailOAuth?: () => void;
  gmailOAuthLoading?: boolean;
}

/**
 * Grid of email provider cards. User picks one to pre-fill IMAP settings
 * or initiate an OAuth flow.
 */
export default function ProviderSelect({
  onSelect,
  gmailOAuthConfigured,
  onGmailOAuth,
  gmailOAuthLoading,
}: ProviderSelectProps) {
  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Выберите почтовый сервис для быстрой настройки или укажите параметры IMAP вручную.
      </Text>

      <Row gutter={[12, 12]}>
        {EMAIL_PROVIDERS.map((provider) => {
          const isGmail = provider.id === 'gmail';

          return (
            <Col xs={24} sm={12} md={8} key={provider.id}>
              <Card
                hoverable
                size="small"
                style={{ textAlign: 'center', height: '100%' }}
                onClick={() => onSelect(provider)}
              >
                <div style={{ fontSize: 28, marginBottom: 4 }}>{provider.icon}</div>
                <Text strong>{provider.name}</Text>

                {isGmail && gmailOAuthConfigured && (
                  <div style={{ marginTop: 8 }}>
                    <Tag
                      icon={<GoogleOutlined />}
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onGmailOAuth?.();
                      }}
                    >
                      {gmailOAuthLoading ? 'Подключение…' : 'Войти через Google'}
                    </Tag>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
