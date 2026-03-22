import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type MouseEvent,
  type ComponentProps,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
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
  BulbOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import {
  useGetChatConfigQuery,
  useGetChatSessionsQuery,
  useCreateChatSessionMutation,
  useGetChatSessionQuery,
  useDeleteChatSessionMutation,
  type ChatSession,
  type ChatMessage,
  type ChatModelOption,
} from '../../store/api/chatApi';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { chatApi, type ChatSessionWithMessages } from '../../store/api/chatApi';
import { getApiBaseUrl } from '../../config/api';
import { readChatNdjsonStream } from './chatStream';

const SIDEBAR_WIDTH = 280;
const CHAT_MODEL_STORAGE_KEY = 'crm-chat-model-id';

function formatUsdPerMillion(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const s = n < 0.01 ? n.toFixed(6) : n.toFixed(4);
  return `$${s.replace(/\.?0+$/, '') || '0'}`;
}

type ModelSelectOption = {
  value: string;
  label: string;
  searchText: string;
  model: ChatModelOption;
};

function buildModelSearchText(m: ChatModelOption): string {
  return [
    m.label,
    m.id,
    formatUsdPerMillion(m.input_price_per_million),
    formatUsdPerMillion(m.output_price_per_million),
  ]
    .filter(Boolean)
    .join(' ');
}

function modelHasPrices(m: ChatModelOption): boolean {
  return (
    m.input_price_per_million != null || m.output_price_per_million != null
  );
}

/** Строка в выпадающем списке моделей */
function ChatModelDropdownRow({ model }: { model: ChatModelOption }) {
  const { token } = theme.useToken();
  const hasPrice = modelHasPrices(model);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '2px 0',
        maxWidth: 440,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(145deg, ${token.colorPrimaryBg}, ${token.colorInfoBg})`,
          border: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorPrimary,
          fontSize: 16,
        }}
      >
        <RobotOutlined />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text strong style={{ fontSize: 14, display: 'block' }} ellipsis>
          {model.label}
        </Typography.Text>
        <Typography.Text
          type="secondary"
          ellipsis
          style={{
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            display: 'block',
            marginTop: 2,
          }}
        >
          {model.id}
        </Typography.Text>
        {hasPrice ? (
          <Space size={[6, 6]} wrap style={{ marginTop: 8 }}>
            <Tag
              icon={<ImportOutlined />}
              color="processing"
              style={{ margin: 0, borderRadius: 6, fontSize: 11, lineHeight: '18px' }}
            >
              Вход · {formatUsdPerMillion(model.input_price_per_million)}/1M
            </Tag>
            <Tag
              icon={<ExportOutlined />}
              color="purple"
              style={{ margin: 0, borderRadius: 6, fontSize: 11, lineHeight: '18px' }}
            >
              Выход · {formatUsdPerMillion(model.output_price_per_million)}/1M
            </Tag>
          </Space>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
            Стоимость не указана
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

/** Компактная подпись выбранной модели в поле Select */
function ChatModelSelectedLabel({ model }: { model: ChatModelOption }) {
  const { token } = theme.useToken();
  const hasPrice = modelHasPrices(model);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}
      >
        {model.label}
      </span>
      {hasPrice ? (
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            color: token.colorTextSecondary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: token.colorInfoBg,
              color: token.colorInfo,
              fontWeight: 500,
            }}
          >
            вх {formatUsdPerMillion(model.input_price_per_million)}
          </span>
          <span style={{ color: token.colorTextQuaternary }}>/</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: token.colorWarningBg,
              color: token.colorWarning,
              fontWeight: 500,
            }}
          >
            вых {formatUsdPerMillion(model.output_price_per_million)}
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 10 }}>
            /1M
          </Typography.Text>
        </span>
      ) : null}
    </span>
  );
}

function chatStreamUrl(sessionId: number): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  return `${base}/chat/sessions/${sessionId}/messages/stream`;
}

export default function Chat() {
  const { token } = theme.useToken();
  const dispatch = useAppDispatch();
  const authToken = useAppSelector((s) => s.auth.token);
  const [, setSearchParams] = useSearchParams();

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    ).get('session');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [streamedReasoning, setStreamedReasoning] = useState('');
  const [streamModelId, setStreamModelId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatConfig, isLoading: chatConfigLoading } = useGetChatConfigQuery();
  const { data: sessions = [], isLoading: sessionsLoading } = useGetChatSessionsQuery();

  useEffect(() => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);
        if (selectedId != null && selectedId > 0) next.set('session', String(selectedId));
        else next.delete('session');
        return next;
      },
      { replace: true },
    );
  }, [selectedId, setSearchParams]);
  const [createSession, { isLoading: creating }] = useCreateChatSessionMutation();
  const {
    data: currentSession,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useGetChatSessionQuery(selectedId!, {
    skip: selectedId == null,
  });
  const [deleteSession] = useDeleteChatSessionMutation();

  const messages = currentSession?.chat_messages ?? [];

  useEffect(() => {
    if (!chatConfig?.models?.length) return;
    const saved = localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
    const valid = saved && chatConfig.models.some((m) => m.id === saved);
    if (valid) {
      setSelectedModelId(saved);
    } else {
      setSelectedModelId(chatConfig.defaultModel);
    }
  }, [chatConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamedContent, streamedReasoning]);

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
    if (!content || selectedId == null || isStreaming) return;
    if (!selectedModelId) {
      antMessage.warning('Выберите модель в шапке страницы');
      return;
    }
    setInputValue('');
    setStreamedContent('');
    setStreamedReasoning('');
    setStreamModelId(null);
    setIsStreaming(true);

    // Оптимистично добавляем пользовательское сообщение в локальный кэш чата,
    // чтобы оно сразу появилось в интерфейсе.
    if (selectedId != null) {
      const tempId = Date.now();
      dispatch(
        chatApi.util.updateQueryData(
          'getChatSession',
          selectedId,
          (draft: ChatSessionWithMessages | undefined) => {
            if (!draft) return;
            draft.chat_messages.push({
              id: tempId,
              role: 'user',
              content,
              created_at: new Date().toISOString(),
            });
          },
        ),
      );
    }

    try {
      const response = await fetch(chatStreamUrl(selectedId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ content, model: selectedModelId || undefined }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming request failed');
      }

      await readChatNdjsonStream(response.body, (evt) => {
        if (evt.type === 'meta') {
          setStreamModelId(evt.model);
        } else if (evt.type === 'reasoning_delta') {
          setStreamedReasoning((prev) => prev + evt.text);
        } else if (evt.type === 'content_delta') {
          setStreamedContent((prev) => prev + evt.text);
        } else if (evt.type === 'error') {
          antMessage.error(evt.message);
        }
      });

      if (selectedId != null) {
        await refetchSession();
      }
    } catch (e: any) {
      console.error(e);
      antMessage.error(e?.message ?? 'Не удалось отправить сообщение');
      setInputValue(content);
    } finally {
      setIsStreaming(false);
      setStreamedContent('');
      setStreamedReasoning('');
      setStreamModelId(null);
    }
  };

  const titleDisplay = (s: ChatSession) =>
    s.title || `Чат ${s.created_at ? dayjs(s.created_at).format('DD.MM.YY HH:mm') : s.id}`;

  const canSend =
    !!inputValue.trim() &&
    selectedId != null &&
    !isStreaming &&
    !!selectedModelId &&
    !chatConfigLoading;

  const modelOptions: ModelSelectOption[] = useMemo(
    () =>
      (chatConfig?.models ?? []).map((m) => ({
        value: m.id,
        label: m.label,
        searchText: buildModelSearchText(m),
        model: m,
      })),
    [chatConfig?.models],
  );

  const modelById = useMemo(() => {
    const map = new Map<string, ChatModelOption>();
    for (const m of chatConfig?.models ?? []) map.set(m.id, m);
    return map;
  }, [chatConfig?.models]);

  const mdComponents = {
    h1: ({ ...props }: ComponentProps<'h1'>) => (
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }} {...props} />
    ),
    h2: ({ ...props }: ComponentProps<'h2'>) => (
      <Typography.Title level={4} style={{ marginTop: 16, marginBottom: 6 }} {...props} />
    ),
    h3: ({ ...props }: ComponentProps<'h3'>) => (
      <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 4 }} {...props} />
    ),
    p: ({ ...props }: ComponentProps<'p'>) => (
      <Typography.Paragraph style={{ marginBottom: 8 }} {...props} />
    ),
    ul: ({ ...props }: ComponentProps<'ul'>) => (
      <ul style={{ paddingLeft: 20, marginBottom: 8, marginTop: 0 }} {...props} />
    ),
    ol: ({ ...props }: ComponentProps<'ol'>) => (
      <ol style={{ paddingLeft: 20, marginBottom: 8, marginTop: 0 }} {...props} />
    ),
    li: ({ ...props }: ComponentProps<'li'>) => <li {...props} />,
    strong: ({ ...props }: ComponentProps<'strong'>) => <Typography.Text strong {...props} />,
  };

  const reasoningPanel = (text: string, key: string, defaultOpen = false) => (
    <Collapse
      bordered={false}
      style={{ marginBottom: 8, background: token.colorFillAlter, maxWidth: '100%' }}
      defaultActiveKey={defaultOpen ? [`reasoning-${key}`] : undefined}
      items={[
        {
          key: `reasoning-${key}`,
          label: (
            <Space size={6}>
              <BulbOutlined style={{ color: token.colorWarning }} />
              <span>Размышление модели</span>
            </Space>
          ),
          children: (
            <Typography.Paragraph
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: token.colorTextSecondary,
              }}
            >
              {text}
            </Typography.Paragraph>
          ),
        },
      ]}
    />
  );

  return (
    <div
      style={{
        flex: '1 1 0%',
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        padding: '0 4px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: '1 1 0%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          gap: 16,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
      {/* Сайдбар с чатами */}
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          overflow: 'hidden',
          boxShadow: token.boxShadowSecondary,
        }}
      >
        <div
          style={{
            flexShrink: 0,
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
          <div style={{ marginTop: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              Модель
            </Typography.Text>
            <Select<string, ModelSelectOption>
              prefix={<RobotOutlined style={{ color: token.colorTextSecondary }} />}
              showSearch={{
                filterOption: (input, option) => {
                  const hay = (option?.searchText ?? '').toLowerCase();
                  return hay.includes(input.trim().toLowerCase());
                },
              }}
              loading={chatConfigLoading}
              placeholder="Выберите модель"
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
              listItemHeight={88}
              virtual
              popupRender={(menu) => (
                <div>
                  <div
                    style={{
                      padding: '8px 12px 6px',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      fontSize: 12,
                      color: token.colorTextSecondary,
                    }}
                  >
                    Модель · идентификатор · стоимость за 1M токенов (USD)
                  </div>
                  {menu}
                </div>
              )}
              styles={{
                popup: {
                  root: { minWidth: 440, padding: 4 },
                  list: { padding: '4px 0' },
                  listItem: { padding: '6px 10px', borderRadius: 8 },
                },
              }}
              value={selectedModelId || undefined}
              options={modelOptions}
              optionRender={(oriOption) => (
                <ChatModelDropdownRow model={oriOption.data.model} />
              )}
              labelRender={({ value }) => {
                const m = modelById.get(String(value));
                if (!m) return <span>{String(value)}</span>;
                return <ChatModelSelectedLabel model={m} />;
              }}
              onChange={(v) => {
                setSelectedModelId(v);
                localStorage.setItem(CHAT_MODEL_STORAGE_KEY, v);
              }}
              disabled={chatConfigLoading || modelOptions.length === 0}
            />
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="middle"
            onClick={handleNewChat}
            loading={creating}
            style={{ marginTop: 10 }}
          >
            Новый чат
          </Button>
        </div>

        <div
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: '8px 8px 12px',
          }}
        >
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
                      color: token.colorTextLightSolid,
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
          flex: '1 1 0%',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          padding: 20,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        {selectedId == null ? (
          <div
            style={{
              flex: '1 1 0%',
              minHeight: 0,
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
          <div
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Шапка текущего чата (фиксирована вверху секции) */}
            <div
              style={{
                flexShrink: 0,
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
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
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
                            color: token.colorTextLightSolid,
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
                          <Space size={6} wrap style={{ fontSize: 11 }}>
                            <Typography.Text type="secondary">
                              {isUser ? 'Вы' : 'ИИ'} ·{' '}
                              {m.created_at
                                ? dayjs(m.created_at).format('DD.MM.YYYY HH:mm')
                                : ''}
                            </Typography.Text>
                            {!isUser && m.model_id ? (
                              <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: '18px' }}>
                                {modelOptions.find((o) => o.value === m.model_id)?.label ?? m.model_id}
                              </Tag>
                            ) : null}
                          </Space>
                          {!isUser && m.reasoning?.trim()
                            ? reasoningPanel(m.reasoning.trim(), `msg-${m.id}`, false)
                            : null}
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: 16,
                              background: isUser ? token.colorPrimary : token.colorBgLayout,
                              color: isUser ? token.colorTextLightSolid : token.colorText,
                              wordBreak: 'break-word',
                              boxShadow: token.boxShadowTertiary,
                              border: isUser ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            {isUser ? (
                              m.content
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                {m.content}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isStreaming && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${token.colorSuccess}, ${token.colorPrimary})`,
                          color: token.colorTextLightSolid,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        <RobotOutlined />
                      </div>
                      <div
                        style={{
                          maxWidth: '82%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <Space size={6} wrap align="center">
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            ИИ · формирует ответ
                          </Typography.Text>
                          {streamModelId ? (
                            <Tag color="processing" style={{ margin: 0, fontSize: 10 }}>
                              {modelOptions.find((o) => o.value === streamModelId)?.label ??
                                streamModelId}
                            </Tag>
                          ) : null}
                        </Space>
                        {streamedReasoning.trim()
                          ? reasoningPanel(streamedReasoning, 'stream-live', true)
                          : null}
                        {!streamedContent && !streamedReasoning ? (
                          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                            <Space align="center">
                              <Spin size="small" />
                              <Typography.Text type="secondary">
                                Собираю контекст из CRM и запрашиваю модель…
                              </Typography.Text>
                            </Space>
                          </Card>
                        ) : null}
                        {streamedContent ? (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: 16,
                              background: token.colorBgLayout,
                              color: token.colorText,
                              wordBreak: 'break-word',
                              boxShadow: token.boxShadowTertiary,
                              border: `1px solid ${token.colorBorderSecondary}`,
                              fontSize: 13,
                              lineHeight: 1.6,
                              width: '100%',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                              {streamedContent}
                            </ReactMarkdown>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Футер с полем ввода */}
            <div
              style={{
                flexShrink: 0,
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
                  disabled={isStreaming || selectedId == null}
                  style={{ resize: 'none', borderRadius: 12 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={isStreaming}
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
          </div>
        )}
      </section>
      </div>
    </div>
  );
}