import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Image,
  Input,
  Pagination,
  Popconfirm,
  Space,
  Tag,
  Timeline,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PictureOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../../store/api/casinoCommentApi';
import {
  useGetCasinoHistoryQuery,
  type HistoryEntry,
} from '../../../store/api/casinoHistoryApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityTab = 'all' | 'comments' | 'history';

interface CasinoActivityProps {
  casinoId: number;
}

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  set_value:     { label: 'изменил(а)', color: 'blue',    icon: <EditOutlined /> },
  clear_value:   { label: 'очистил(а)', color: 'default', icon: <DeleteOutlined /> },
  create_field:  { label: 'создал(а) поле', color: 'green', icon: <PlusOutlined /> },
  update_field:  { label: 'обновил(а) поле', color: 'orange', icon: <EditOutlined /> },
  delete_field:  { label: 'удалил(а) поле', color: 'red',  icon: <DeleteOutlined /> },
};

function formatValue(val: any): string {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      return str.length > 80 ? str.slice(0, 80) + '…' : str;
    } catch {
      return String(val);
    }
  }
  const str = String(val);
  return str.length > 80 ? str.slice(0, 80) + '…' : str;
}

// ---------------------------------------------------------------------------
// Merged timeline item
// ---------------------------------------------------------------------------

interface TimelineItem {
  id: string;
  type: 'comment' | 'history';
  date: string;
  // comment fields
  commentId?: number;
  userId?: number;
  username?: string;
  text?: string;
  images?: CasinoCommentImage[];
  // history fields
  entry?: HistoryEntry;
}

const HISTORY_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CasinoActivity({ casinoId }: CasinoActivityProps) {
  const { token: themeToken } = theme.useToken();
  const [tab, setTab] = useState<ActivityTab>('comments');
  const [historyPage, setHistoryPage] = useState(1);

  // ---- Data fetching ----
  const { data: comments, isLoading: commentsLoading } = useGetCasinoCommentsQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const { data: allImages = [] } = useGetCasinoImagesQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const { data: historyResp, isLoading: historyLoading } = useGetCasinoHistoryQuery(
    { casinoId, limit: HISTORY_PAGE_SIZE, offset: (historyPage - 1) * HISTORY_PAGE_SIZE },
    { skip: !casinoId },
  );

  // ---- Mutations ----
  const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadCommentImageMutation();

  // ---- Local state ----
  const [newComment, setNewComment] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const currentUser = useSelector((state: any) => state.auth.user);

  // ---- Derived ----
  const entries = historyResp?.data ?? [];
  const historyTotal = historyResp?.total ?? 0;

  const imagesByCommentId = useMemo(() => {
    const map = new Map<number, CasinoCommentImage[]>();
    for (const img of allImages) {
      if (!img.comment_id) continue;
      const arr = map.get(img.comment_id) ?? [];
      arr.push(img);
      map.set(img.comment_id, arr);
    }
    return map;
  }, [allImages]);

  // Build merged timeline (for "all" tab)
  const mergedItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const c of comments ?? []) {
      items.push({
        id: `c-${c.id}`,
        type: 'comment',
        date: c.created_at,
        commentId: c.id,
        userId: c.user_id,
        username: c.username,
        text: c.text,
        images: imagesByCommentId.get(c.id),
      });
    }

    for (const h of entries) {
      items.push({
        id: `h-${h.id}`,
        type: 'history',
        date: h.created_at,
        entry: h,
      });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [comments, entries, imagesByCommentId]);

  // ---- Handlers ----
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const created = await createComment({ casinoId, data: { text: newComment } }).unwrap();
      setNewComment('');
      message.success('Комментарий добавлен');
      if (pendingImageFile) {
        try {
          await uploadImage({ casinoId, commentId: created.id, file: pendingImageFile }).unwrap();
          setPendingImageFile(null);
          message.success('Изображение прикреплено');
        } catch {
          message.error('Не удалось прикрепить изображение');
        }
      }
    } catch {
      message.error('Не удалось добавить комментарий');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment({ id: commentId, casinoId }).unwrap();
      message.success('Комментарий удалён');
    } catch {
      message.error('Не удалось удалить комментарий');
    }
  };

  const handleUploadImage = async (commentId: number, file: File) => {
    try {
      await uploadImage({ casinoId, commentId, file }).unwrap();
      message.success('Изображение загружено');
    } catch (e: any) {
      message.error(e?.data?.error || 'Не удалось загрузить изображение');
      throw e;
    }
  };

  // ---- Tab buttons (Jira-style) ----
  const tabs: { key: ActivityTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Все', icon: <UnorderedListOutlined /> },
    { key: 'comments', label: `Комментарии${comments?.length ? ` (${comments.length})` : ''}`, icon: <CommentOutlined /> },
    { key: 'history', label: `История${historyTotal ? ` (${historyTotal})` : ''}`, icon: <HistoryOutlined /> },
  ];

  // ---- Renderers ----

  const renderCommentForm = () => (
    <div style={{ marginBottom: 16 }}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith('image/'));
          if (!file) return;
          setPendingImageFile(file);
          message.info('Изображение добавлено. Отправьте комментарий.');
        }}
      >
        <Input.TextArea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Написать комментарий... (drag & drop / Ctrl+V для картинки)"
          rows={2}
          onPaste={(e) => {
            const items = Array.from(e.clipboardData?.items || []);
            const imgItem = items.find((it) => it.kind === 'file' && (it.type || '').startsWith('image/'));
            const file = imgItem?.getAsFile();
            if (!file) return;
            setPendingImageFile(file);
            message.info('Изображение добавлено (Ctrl+V).');
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <Space size={8}>
          <Upload
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => {
              setPendingImageFile(file);
              message.info('Изображение выбрано. Нажмите «Отправить».');
              return false;
            }}
          >
            <Button
              type="default"
              shape="circle"
              size="small"
              icon={<PictureOutlined />}
              title="Прикрепить изображение"
            />
          </Upload>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {pendingImageFile ? `${pendingImageFile.name}` : 'Фото: drag & drop / Ctrl+V / кнопка'}
          </Typography.Text>
          {pendingImageFile && (
            <Button type="link" size="small" onClick={() => setPendingImageFile(null)} style={{ padding: 0, fontSize: 12 }}>
              Убрать
            </Button>
          )}
        </Space>
        <Button
          type="primary"
          size="small"
          onClick={handleAddComment}
          loading={creatingComment || uploadingImage}
          disabled={!newComment.trim()}
        >
          Отправить
        </Button>
      </div>
    </div>
  );

  const renderCommentItem = (item: TimelineItem) => (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Avatar size={28} icon={<UserOutlined />} />
        <Typography.Text strong style={{ fontSize: 13 }}>
          {item.username || 'Пользователь'}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {dayjs(item.date).format('DD.MM.YYYY HH:mm')}
        </Typography.Text>
        {currentUser?.id === item.userId && (
          <Space size={4} style={{ marginLeft: 'auto' }}>
            <Upload
              showUploadList={false}
              accept="image/*"
              customRequest={async (options) => {
                const { file, onSuccess, onError } = options as any;
                try {
                  await handleUploadImage(item.commentId!, file as File);
                  onSuccess && onSuccess({}, file);
                } catch (e) {
                  onError && onError(e);
                }
              }}
            >
              <Button type="text" size="small" icon={<PlusOutlined />}>Фото</Button>
            </Upload>
            <Popconfirm
              title="Удалить комментарий?"
              onConfirm={() => handleDeleteComment(item.commentId!)}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )}
      </div>
      <div style={{ paddingLeft: 36 }}>
        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
          {item.text}
        </Typography.Paragraph>
        {item.images && item.images.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <Image.PreviewGroup>
              <Space wrap size={[6, 6]}>
                {item.images.map((img, i) => (
                  <Image
                    key={`${(img as any).entity_type || 'comment'}-${img.id}-${i}`}
                    src={img.url}
                    alt={img.original_name || ''}
                    style={{ width: 100, height: 66, objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryItem = (h: HistoryEntry) => {
    const cfg = ACTION_CONFIG[h.action] || { label: h.action, color: 'default', icon: <EditOutlined /> };
    const fieldName = h.field_label || h.field_key || '';

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Avatar size={28} icon={<UserOutlined />} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {h.actor_username || 'Система'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {cfg.label}
            </Typography.Text>
            {fieldName && (
              <Tag color={cfg.color} style={{ margin: 0, fontSize: 11 }}>
                {fieldName}
              </Tag>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto', flexShrink: 0 }}>
              {dayjs(h.created_at).format('DD.MM.YYYY HH:mm')}
            </Typography.Text>
          </div>
          {(h.old_value_json != null || h.new_value_json != null) && (
            <div
              style={{
                marginTop: 4,
                padding: '4px 8px',
                borderRadius: 4,
                background: themeToken.colorFillQuaternary,
                fontSize: 12,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {h.old_value_json != null && (
                <span>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>Было: </Typography.Text>
                  <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>
                    {formatValue(h.old_value_json)}
                  </Typography.Text>
                </span>
              )}
              {h.new_value_json != null && (
                <span>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>Стало: </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    {formatValue(h.new_value_json)}
                  </Typography.Text>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Which items to show ----
  const visibleItems = useMemo(() => {
    if (tab === 'comments') return mergedItems.filter((i) => i.type === 'comment');
    if (tab === 'history') return mergedItems.filter((i) => i.type === 'history');
    return mergedItems;
  }, [tab, mergedItems]);

  return (
    <Card
      title={
        <Typography.Title level={5} style={{ margin: 0 }}>
          Активность
        </Typography.Title>
      }
      loading={commentsLoading || historyLoading}
    >
      {/* Tab switcher (Jira-style pill buttons) */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map((t) => (
          <Button
            key={t.key}
            type={tab === t.key ? 'primary' : 'text'}
            size="small"
            icon={t.icon}
            onClick={() => setTab(t.key)}
            style={{
              borderRadius: 16,
              fontWeight: tab === t.key ? 600 : 400,
              fontSize: 13,
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Comment form — show on "all" and "comments" tabs */}
      {tab !== 'history' && renderCommentForm()}

      {/* Activity feed */}
      {visibleItems.length === 0 ? (
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>
          {tab === 'comments' ? 'Нет комментариев' : tab === 'history' ? 'Нет записей в истории' : 'Нет активности'}
        </Typography.Text>
      ) : (
        <Timeline
          items={visibleItems.map((item) => ({
            key: item.id,
            color: item.type === 'comment' ? themeToken.colorPrimary : themeToken.colorTextQuaternary,
            dot: item.type === 'comment'
              ? <CommentOutlined style={{ fontSize: 14 }} />
              : <HistoryOutlined style={{ fontSize: 14 }} />,
            children: item.type === 'comment'
              ? renderCommentItem(item)
              : renderHistoryItem(item.entry!),
          }))}
        />
      )}

      {/* History pagination (only when enough entries) */}
      {tab !== 'comments' && historyTotal > HISTORY_PAGE_SIZE && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Pagination
            size="small"
            current={historyPage}
            total={historyTotal}
            pageSize={HISTORY_PAGE_SIZE}
            showSizeChanger={false}
            showTotal={(t, r) => `${r[0]}-${r[1]} из ${t}`}
            onChange={setHistoryPage}
          />
        </div>
      )}
    </Card>
  );
}
