import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
  Image,
  List,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import {
  BulbOutlined,
  CameraOutlined,
  DownOutlined,
  EyeOutlined,
  LoadingOutlined,
  MailOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  useGetEmailsForCasinoByNameQuery,
  useGetRecipientsQuery,
  useMarkEmailAsReadMutation,
  useRequestEmailSummaryMutation,
  useRequestEmailScreenshotMutation,
  Email,
} from '../../../store/api/emailApi';
import { getApiBaseUrl } from '../../../config/api';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../hooks/redux';
import { useDevTriggerAiEmailProposalMutation } from '../../../store/api/aiEmailProposalsApi';

interface EmailSectionProps {
  casinoId: number;
}

export default function EmailSection({ casinoId }: EmailSectionProps) {
  const PAGE_SIZE = 20;
  const [emailPage, setEmailPage] = useState(1);
  const [emailToFilter, setEmailToFilter] = useState<string | undefined>(undefined);
  const { token: themeToken } = theme.useToken();

  const {
    data: emailResp,
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useGetEmailsForCasinoByNameQuery(
    {
      casinoId,
      limit: PAGE_SIZE,
      offset: (emailPage - 1) * PAGE_SIZE,
      ...(emailToFilter ? { to_email: emailToFilter } : {}),
    },
    { skip: !casinoId } as Record<string, unknown>
  );

  const { data: recipients = [] } = useGetRecipientsQuery();
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [reqSummary, { isLoading: summaryLoading }] = useRequestEmailSummaryMutation();
  const [reqScreenshot, { isLoading: screenshotLoading }] = useRequestEmailScreenshotMutation();
  const [devTriggerProposal, { isLoading: proposalLoading }] = useDevTriggerAiEmailProposalMutation();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [screenshotVisible, setScreenshotVisible] = useState(false);
  const isAdmin = useAppSelector((s) => s.auth.user?.role === 'admin');

  return (
    <Card size="small" title={<Space><MailOutlined /><span>Почта</span></Space>}>
      <div style={{ marginBottom: 12 }}>
        <Select
          allowClear
          showSearch
          placeholder="Получатель"
          style={{ minWidth: 220 }}
          options={recipients.map((r) => ({ value: r.email, label: r.email }))}
          value={emailToFilter}
          onChange={(value) => { setEmailToFilter(value); setEmailPage(1); }}
          filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
        />
      </div>
      <List
        loading={emailsLoading}
        dataSource={emailResp?.data ?? []}
        renderItem={(email) => (
          <List.Item onClick={() => setSelectedEmail(email)} style={{ cursor: 'pointer' }}>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Typography.Text strong>{email.from_name || email.from_email || 'Без отправителя'}</Typography.Text>
                  {email.to_email && <Typography.Text type="secondary" style={{ fontSize: 12 }}>→ {email.to_email}</Typography.Text>}
                  {email.geo && <Tag color="orange">{email.geo}</Tag>}
                  {email.topic_name && <Tag color="purple">{email.topic_name}</Tag>}
                  {!email.is_read ? <Badge status="processing" text="Новое" /> : null}
                </Space>
              }
              description={
                <Space direction="vertical" size={2}>
                  <Typography.Text>{email.subject || '(Без темы)'}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {email.date_received ? dayjs(email.date_received).format('YYYY-MM-DD HH:mm') : '—'}
                  </Typography.Text>
                  {email.ai_summary && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <RobotOutlined style={{ marginRight: 4 }} />
                      {email.ai_summary.length > 100 ? email.ai_summary.slice(0, 100) + '…' : email.ai_summary}
                    </Typography.Text>
                  )}
                  <Space size={4}>
                    {email.screenshot_url && <Tag color="green" style={{ fontSize: 11, margin: 0 }}><CameraOutlined /> Скрин</Tag>}
                    {email.ai_summary && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}><RobotOutlined /> AI</Tag>}
                  </Space>
                </Space>
              }
            />
          </List.Item>
        )}
        pagination={{
          current: emailPage,
          total: emailResp?.total ?? 0,
          pageSize: PAGE_SIZE,
          onChange: (page) => { setEmailPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); },
        }}
      />

      {selectedEmail && (
        <Drawer
          open={!!selectedEmail}
          onClose={() => { setSelectedEmail(null); setScreenshotVisible(false); }}
          width={720}
          title={selectedEmail?.subject || '(Без темы)'}
          destroyOnClose
          extra={
            <Space size={4}>
              <Tooltip title={selectedEmail?.ai_summary ? 'Пересоздать саммари' : 'Запросить саммари'}>
                <Button
                  size="small"
                  icon={summaryLoading ? <LoadingOutlined /> : <RobotOutlined />}
                  loading={summaryLoading}
                  onClick={async () => {
                    try {
                      const updated = await reqSummary(selectedEmail.id).unwrap();
                      setSelectedEmail(updated);
                      refetchEmails();
                      message.success('Саммари получено');
                    } catch { message.error('Ошибка получения саммари'); }
                  }}
                >Саммари</Button>
              </Tooltip>
              <Tooltip title={selectedEmail?.screenshot_url ? 'Пересоздать скриншот' : 'Сделать скриншот'}>
                <Button
                  size="small"
                  icon={screenshotLoading ? <LoadingOutlined /> : <CameraOutlined />}
                  loading={screenshotLoading}
                  onClick={async () => {
                    try {
                      const updated = await reqScreenshot(selectedEmail.id).unwrap();
                      setSelectedEmail(updated);
                      refetchEmails();
                      message.success('Скриншот создан');
                    } catch { message.error('Ошибка создания скриншота'); }
                  }}
                >Скриншот</Button>
              </Tooltip>
              {isAdmin ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'bonus', label: 'Бонус' },
                      { key: 'promo', label: 'Промо' },
                      { type: 'divider' },
                      { key: 'bonus-force', label: 'Бонус (пересоздать)' },
                      { key: 'promo-force', label: 'Промо (пересоздать)' },
                    ],
                    onClick: async ({ key }) => {
                      if (!selectedEmail) return;
                      const type = key.includes('promo') ? 'promo' : 'bonus';
                      const force = key.endsWith('-force');
                      try {
                        const res = await devTriggerProposal({
                          emailId: selectedEmail.id,
                          type,
                          force,
                        }).unwrap();
                        if (res.skipped) {
                          message.info(res.message ?? 'Предложение уже есть');
                        } else {
                          message.success(
                            <span>
                              ИИ создал предложение.{' '}
                              <Link to="/ai-proposals">Открыть «Предложения ИИ»</Link>
                            </span>,
                          );
                        }
                      } catch (e: unknown) {
                        const err = e as { data?: { error?: string } };
                        message.error(err?.data?.error ?? 'Не удалось создать предложение ИИ');
                      }
                    },
                  }}
                >
                  <Tooltip title="Создать запись на странице «Предложения ИИ» по скрину письма">
                    <Button
                      size="small"
                      icon={proposalLoading ? <LoadingOutlined /> : <BulbOutlined />}
                      loading={proposalLoading}
                    >
                      Предложение ИИ <DownOutlined />
                    </Button>
                  </Tooltip>
                </Dropdown>
              ) : null}
              {selectedEmail?.screenshot_url && (
                <Tooltip title="Посмотреть скриншот">
                  <Button size="small" icon={<EyeOutlined />} onClick={() => setScreenshotVisible(true)} />
                </Tooltip>
              )}
              {selectedEmail && !selectedEmail.is_read && (
                <Button size="small" onClick={async () => { try { await markAsRead(selectedEmail.id).unwrap(); refetchEmails(); } catch { /* ignore */ } }}>
                  Прочитано
                </Button>
              )}
            </Space>
          }
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="От">{selectedEmail.from_name || ''} &lt;{selectedEmail.from_email}&gt;</Descriptions.Item>
              <Descriptions.Item label="Кому">{selectedEmail.to_email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Дата">{selectedEmail.date_received ? dayjs(selectedEmail.date_received).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
              {selectedEmail.geo && <Descriptions.Item label="GEO"><Tag color="orange">{selectedEmail.geo}</Tag></Descriptions.Item>}
              {selectedEmail.topic_name && <Descriptions.Item label="Тема письма"><Tag color="purple">{selectedEmail.topic_name}</Tag></Descriptions.Item>}
            </Descriptions>

            {selectedEmail.ai_summary && (
              <Card size="small" style={{ background: themeToken.colorPrimaryBg, borderColor: themeToken.colorPrimaryBorder }}>
                <Space align="start" size={8}>
                  <Tag icon={<RobotOutlined />} color="processing" style={{ margin: 0, flexShrink: 0 }}>AI</Tag>
                  <Typography.Text style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedEmail.ai_summary}</Typography.Text>
                </Space>
              </Card>
            )}

            {selectedEmail.screenshot_url && (
              <Image
                src={`${getApiBaseUrl().replace(/\/api\/?$/, '')}${selectedEmail.screenshot_url}`}
                alt="Email screenshot"
                style={{ display: 'none' }}
                preview={{ visible: screenshotVisible, onVisibleChange: (v) => setScreenshotVisible(v) }}
              />
            )}

            <Card size="small" title="Текст письма">
              {selectedEmail.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} style={{ maxHeight: '60vh', overflow: 'auto' }} />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{selectedEmail.body_text || 'Нет содержимого'}</pre>
              )}
            </Card>
          </Space>
        </Drawer>
      )}
    </Card>
  );
}
