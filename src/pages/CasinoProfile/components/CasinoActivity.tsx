import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Image,
  Input,
  Popconfirm,
  Space,
  Timeline,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import {
  CommentOutlined,
  DeleteOutlined,
  PictureOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../hooks/redux';
import {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../../store/api/casinoCommentApi';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityTab = 'all' | 'comments';

interface CasinoActivityProps {
  casinoId: number;
}

// ---------------------------------------------------------------------------
// Merged timeline item
// ---------------------------------------------------------------------------

interface TimelineItem {
  id: string;
  type: 'comment';
  date: string;
  // comment fields
  commentId?: number;
  userId?: number;
  username?: string;
  text?: string;
  images?: CasinoCommentImage[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CasinoActivity({ casinoId }: CasinoActivityProps) {
  const { token: themeToken } = theme.useToken();
  const [tab, setTab] = useState<ActivityTab>('comments');

  // ---- Data fetching ----
  const { data: comments, isLoading: commentsLoading } = useGetCasinoCommentsQuery(casinoId, {
    skip: !casinoId,
  } as any);
  const { data: allImages = [] } = useGetCasinoImagesQuery(casinoId, {
    skip: !casinoId,
  } as any);

  // ---- Mutations ----
  const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadCommentImageMutation();

  // ---- Local state ----
  const [newComment, setNewComment] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const currentUser = useAppSelector((state) => state.auth.user);

  // ---- Derived ----
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

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [comments, imagesByCommentId]);

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

  // ---- Which items to show ----
  const visibleItems = useMemo(() => {
    return mergedItems;
  }, [tab, mergedItems]);

  return (
    <Card
      size="small"
      title={<Space><CommentOutlined /><span>Активность</span></Space>}
      loading={commentsLoading}
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

      {/* Comment form */}
      {renderCommentForm()}

      {/* Activity feed */}
      {visibleItems.length === 0 ? (
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>
          {tab === 'comments' ? 'Нет комментариев' : 'Нет активности'}
        </Typography.Text>
      ) : (
        <Timeline
          items={visibleItems.map((item) => ({
            key: item.id,
            color: themeToken.colorPrimary,
            dot: <CommentOutlined style={{ fontSize: 14 }} />,
            children: renderCommentItem(item),
          }))}
        />
      )}
    </Card>
  );
}
