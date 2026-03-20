import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Descriptions, Drawer, Dropdown, Image, Select, Space, Tag, Tooltip, Typography, message, theme } from 'antd';
import {
  BulbOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EyeOutlined,
  LoadingOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { resolvePublicUploadUrl } from '../../../config/api';
import dayjs from 'dayjs';
import type { Email } from '../../../store/api/emailApi';
import {
  useMarkEmailAsReadMutation,
  useLinkEmailToCasinoMutation,
  useRequestEmailSummaryMutation,
  useRequestEmailScreenshotMutation,
} from '../../../store/api/emailApi';
import { useAppSelector } from '../../../hooks/redux';
import { useDevTriggerAiEmailProposalMutation } from '../../../store/api/aiEmailProposalsApi';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CasinoOption {
  value: number;
  label: string;
}

interface EmailDetailDrawerProps {
  email: Email | null;
  casinoOptions: CasinoOption[];
  onClose: () => void;
  onUpdated: (updatedEmail?: Email) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailDetailDrawer({
  email,
  casinoOptions,
  onClose,
  onUpdated,
}: EmailDetailDrawerProps) {
  const { token: themeToken } = theme.useToken();
  const [markAsRead] = useMarkEmailAsReadMutation();
  const [linkToCasino] = useLinkEmailToCasinoMutation();
  const [requestSummary, { isLoading: summaryLoading }] = useRequestEmailSummaryMutation();
  const [requestScreenshot, { isLoading: screenshotLoading }] = useRequestEmailScreenshotMutation();
  const [devTriggerProposal, { isLoading: proposalLoading }] = useDevTriggerAiEmailProposalMutation();
  const [screenshotVisible, setScreenshotVisible] = useState(false);
  const isAdmin = useAppSelector((s) => s.auth.user?.role === 'admin');

  const handleMarkAsRead = async () => {
    if (!email) return;
    try {
      const updated = await markAsRead(email.id).unwrap();
      onUpdated(updated);
    } catch {
      message.error('Не удалось отметить как прочитанное');
    }
  };

  const handleLinkToCasino = async (casinoId: number) => {
    if (!email) return;
    try {
      const updated = await linkToCasino({ id: email.id, casino_id: casinoId }).unwrap();
      onUpdated(updated);
      message.success('Связано с казино');
    } catch {
      message.error('Не удалось связать');
    }
  };

  const handleRequestSummary = async () => {
    if (!email) return;
    try {
      const updated = await requestSummary(email.id).unwrap();
      onUpdated(updated);
      message.success('Саммари получено');
    } catch {
      message.error('Не удалось получить саммари');
    }
  };

  const handleRequestScreenshot = async () => {
    if (!email) return;
    try {
      const updated = await requestScreenshot(email.id).unwrap();
      onUpdated(updated);
      message.success('Скриншот создан');
    } catch {
      message.error('Не удалось сделать скриншот');
    }
  };

  const handleAiProposal = async (type: 'bonus' | 'promo', force: boolean) => {
    if (!email) return;
    try {
      const res = await devTriggerProposal({ emailId: email.id, type, force }).unwrap();
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
  };

  const screenshotSrc = email?.screenshot_url ? resolvePublicUploadUrl(email.screenshot_url) : '';

  return (
    <Drawer
      open={!!email}
      onClose={onClose}
      width={720}
      title={email?.subject || '(Без темы)'}
      destroyOnClose
      extra={
        <Space size={4}>
          <Tooltip title={email?.ai_summary ? 'Пересоздать саммари' : 'Запросить саммари'}>
            <Button
              type="text"
              size="small"
              icon={summaryLoading ? <LoadingOutlined /> : <RobotOutlined />}
              loading={summaryLoading}
              onClick={handleRequestSummary}
            />
          </Tooltip>
          <Tooltip title={email?.screenshot_url ? 'Пересоздать скриншот' : 'Сделать скриншот'}>
            <Button
              type="text"
              size="small"
              icon={screenshotLoading ? <LoadingOutlined /> : <CameraOutlined />}
              loading={screenshotLoading}
              onClick={handleRequestScreenshot}
            />
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
                onClick: ({ key }) => {
                  if (key === 'bonus') void handleAiProposal('bonus', false);
                  else if (key === 'promo') void handleAiProposal('promo', false);
                  else if (key === 'bonus-force') void handleAiProposal('bonus', true);
                  else if (key === 'promo-force') void handleAiProposal('promo', true);
                },
              }}
            >
              <Button
                size="small"
                icon={proposalLoading ? <LoadingOutlined /> : <BulbOutlined />}
                loading={proposalLoading}
              >
                Предложение ИИ <DownOutlined />
              </Button>
            </Dropdown>
          ) : null}
          {email?.screenshot_url && (
            <Tooltip title="Посмотреть скриншот">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setScreenshotVisible(true)} />
            </Tooltip>
          )}
          {email && !email.is_read && (
            <Tooltip title="Прочитано">
              <Button type="text" size="small" icon={<CheckCircleOutlined />} onClick={handleMarkAsRead} />
            </Tooltip>
          )}
        </Space>
      }
    >
      {email && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="От">
              {email.from_name || ''} &lt;{email.from_email}&gt;
            </Descriptions.Item>
            <Descriptions.Item label="Кому">{email.to_email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Дата">
              {email.date_received
                ? dayjs(email.date_received).format('YYYY-MM-DD HH:mm')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Проект">
              <Select
                style={{ width: '100%' }}
                options={casinoOptions}
                allowClear
                value={email.related_casino_id ?? undefined}
                onChange={(v) => v && handleLinkToCasino(v)}
                placeholder="Связать с казино"
              />
            </Descriptions.Item>
            {email.geo && (
              <Descriptions.Item label="GEO">
                <Tag color="orange">{email.geo}</Tag>
              </Descriptions.Item>
            )}
            {email.topic_name && (
              <Descriptions.Item label="Тема письма">
                <Tag color="purple">{email.topic_name}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* AI Summary */}
          {email.ai_summary && (
            <Card
              size="small"
              style={{
                background: themeToken.colorPrimaryBg,
                borderColor: themeToken.colorPrimaryBorder,
              }}
            >
              <Space align="start" size={8}>
                <Tag
                  icon={<RobotOutlined />}
                  color="processing"
                  style={{ margin: 0, flexShrink: 0 }}
                >
                  AI
                </Tag>
                <Typography.Text style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {email.ai_summary}
                </Typography.Text>
              </Space>
            </Card>
          )}

          {/* Hidden Image for fullscreen preview */}
          {screenshotSrc && (
            <Image
              src={screenshotSrc}
              alt="Email screenshot"
              style={{ display: 'none' }}
              preview={{
                visible: screenshotVisible,
                onVisibleChange: (v) => setScreenshotVisible(v),
              }}
            />
          )}

          <Card size="small" title="Текст письма">
            {email.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                style={{ maxHeight: '60vh', overflow: 'auto' }}
              />
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {email.body_text || 'Нет содержимого'}
              </pre>
            )}
          </Card>
        </Space>
      )}
    </Drawer>
  );
}
