import { useState, useRef, useEffect, type MouseEvent } from 'react';
import {
  Button,
  Empty,
  Input,
  Skeleton,
  Typography,
  theme,
  message as antMessage,
} from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  useGetChatSessionsQuery,
  useCreateChatSessionMutation,
  useGetChatSessionQuery,
  useDeleteChatSessionMutation,
  useSendChatMessageMutation,
  type ChatSession,
  type ChatMessage,
} from '../../store/api/chatApi';
import dayjs from 'dayjs';

const SIDEBAR_WIDTH = 280;

export default function Chat() {
  const { token } = theme.useToken();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useGetChatSessionsQuery();
  const [createSession, { isLoading: creating }] = useCreateChatSessionMutation();
  const { data: currentSession, isLoading: sessionLoading } = useGetChatSessionQuery(selectedId!, {
    skip: selectedId == null,
  });
  const [deleteSession] = useDeleteChatSessionMutation();
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation();

  const messages = currentSession?.chat_messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleNewChat = async () => {
    try {
      const session = await createSession().unwrap();
      setSelectedId(session.id);
      setInputValue('');
    } catch (e: any) {
      antMessage.error(e?.data?.error ?? 'Не удалось создать чат');
    }
  };

  const handleDelete = async (e: MouseEvent<HTMLElement>, id: number) => {
    e.stopPropagation();
    try {
      // Сразу переключаемся на соседний чат, чтобы не держать выделенным удалённый.
      if (selectedId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setSelectedId(remaining[0]?.id ?? null);
      }

      await deleteSession(id).unwrap();
    } catch (e: any) {
      antMessage.error(e?.data?.error ?? 'Не удалось удалить чат');
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || selectedId == null) return;
    setInputValue('');
    try {
      await sendMessage({ sessionId: selectedId, content }).unwrap();
    } catch (e: any) {
      antMessage.error(e?.data?.error ?? 'Не удалось отправить сообщение');
      setInputValue(content);
    }
  };

  const titleDisplay = (s: ChatSession) =>
    s.title || `Чат ${s.created_at ? dayjs(s.created_at).format('DD.MM.YY HH:mm') : s.id}`;

  const canSend = !!inputValue.trim() && selectedId != null && !sending;

  return (
    <div
      style={{
        height: '100vh',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: 20,
        background: `
          radial-gradient(circle at 0 0, ${token.colorPrimary}22, transparent 55%),
          radial-gradient(circle at 100% 100%, ${token.colorSuccess}22, transparent 55%)
        `,
      }}
    >
      {/* Сайдбар с чатами */}
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          overflow: 'hidden',
          boxShadow: token.boxShadowSecondary,
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${token.colorBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, fontSize: 18 }}>
            <MessageOutlined style={{ marginRight: 8 }} />
            Чат с ИИ
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Вопросы по данным CRM: казино, бонусы, платежи, провайдеры, письма, комментарии и т.д.
          </Typography.Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="middle"
            onClick={handleNewChat}
            loading={creating}
            style={{ marginTop: 4 }}
          >
            Новый чат
          </Button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px 12px' }}>
          {sessionsLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : sessions.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Чаты появятся здесь.
            </Typography.Text>
          ) : (
            sessions.map((s) => {
              const isSelected = selectedId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    padding: '8px 10px',
                    marginBottom: 6,
                    borderRadius: token.borderRadius,
                    cursor: 'pointer',
                    background: isSelected ? token.colorPrimaryBg : 'transparent',
                    border: isSelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: token.colorPrimary,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 16,
                    }}
                  >
                    <MessageOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <Typography.Text strong ellipsis style={{ fontSize: 13, maxWidth: '100%' }}>
                        {titleDisplay(s)}
                      </Typography.Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={(e) => handleDelete(e, s.id)}
                      />
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {s.updated_at
                        ? dayjs(s.updated_at).format('DD.MM.YY HH:mm')
                        : dayjs(s.created_at).format('DD.MM.YY HH:mm')}
                    </Typography.Text>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Окно сообщений */}
      <section
        style={{
          flex: 1,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: `linear-gradient(135deg, ${token.colorBgContainer}, ${token.colorBgLayout})`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          padding: 20,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        {selectedId == null ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Создайте чат и задайте вопрос по данным CRM"
            />
          </div>
        ) : (
          <>
            {/* Шапка текущего чата (фиксирована вверху секции) */}
            <div
              style={{
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <Typography.Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  {currentSession ? titleDisplay(currentSession as ChatSession) : 'Чат с ИИ'}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Ответы строятся только на данных CRM (казино, бонусы, платежи, промо и т.д.)
                </Typography.Text>
              </div>
            </div>

            {/* Лента сообщений */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '4px 4px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {sessionLoading ? (
                <Skeleton active avatar paragraph={{ rows: 4 }} />
              ) : (
                <>
                  {messages.map((m: ChatMessage) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: isUser ? token.colorPrimary : token.colorSuccess,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 18,
                          }}
                        >
                          {isUser ? <UserOutlined /> : <RobotOutlined />}
                        </div>
                        <div
                          style={{
                            maxWidth: '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            gap: 4,
                          }}
                        >
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {isUser ? 'Вы' : 'ИИ'} ·{' '}
                            {m.created_at
                              ? dayjs(m.created_at).format('DD.MM.YYYY HH:mm')
                              : ''}
                          </Typography.Text>
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: 16,
                              background: isUser ? token.colorPrimary : token.colorBgLayout,
                              color: isUser ? '#fff' : token.colorText,
                              wordBreak: 'break-word',
                              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            {isUser ? (
                              m.content
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <Typography.Title
                                      level={3}
                                      style={{ marginTop: 0, marginBottom: 8 }}
                                      {...props}
                                    />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <Typography.Title
                                      level={4}
                                      style={{ marginTop: 16, marginBottom: 6 }}
                                      {...props}
                                    />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <Typography.Title
                                      level={5}
                                      style={{ marginTop: 12, marginBottom: 4 }}
                                      {...props}
                                    />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <Typography.Paragraph
                                      style={{ marginBottom: 8 }}
                                      {...props}
                                    />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      style={{
                                        paddingLeft: 20,
                                        marginBottom: 8,
                                        marginTop: 0,
                                      }}
                                      {...props}
                                    />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol
                                      style={{
                                        paddingLeft: 20,
                                        marginBottom: 8,
                                        marginTop: 0,
                                      }}
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => <li {...props} />,
                                  strong: ({ node, ...props }) => (
                                    <Typography.Text strong {...props} />
                                  ),
                                }}
                              >
                                {m.content}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Футер с полем ввода */}
            <div
              style={{
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-end',
                }}
              >
                <Input.TextArea
                  placeholder="Задайте вопрос по данным CRM..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  disabled={sending || selectedId == null}
                  style={{ resize: 'none', borderRadius: 12 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{ alignSelf: 'stretch', borderRadius: 999 }}
                />
              </div>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, marginTop: 6, display: 'block' }}
              >
                Enter — отправить, Shift + Enter — перенос строки
              </Typography.Text>
            </div>
          </>
        )}
      </section>
    </div>
  );
}