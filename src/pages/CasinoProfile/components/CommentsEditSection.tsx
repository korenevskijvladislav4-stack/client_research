import { useState, useMemo } from 'react';
import {
  Avatar,
  Button,
  Image,
  Input,
  List,
  Popconfirm,
  Space,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import { DeleteOutlined, PictureOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
  CasinoCommentImage,
} from '../../../store/api/casinoCommentApi';
import { useAppSelector } from '../../../hooks/redux';
import dayjs from 'dayjs';

interface CommentsEditSectionProps {
  casinoId: number;
}

export default function CommentsEditSection({ casinoId }: CommentsEditSectionProps) {
  const { token } = theme.useToken();
  const { data: comments, isLoading } = useGetCasinoCommentsQuery(casinoId, { skip: !casinoId } as any);
  const { data: images = [] } = useGetCasinoImagesQuery(casinoId, { skip: !casinoId } as any);
  const [createComment, { isLoading: creating }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadCommentImageMutation();

  const [newComment, setNewComment] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const currentUser = useAppSelector((state) => state.auth.user);

  const imagesByCommentId = useMemo(() => {
    const map = new Map<number, CasinoCommentImage[]>();
    for (const img of images) {
      if (!img.comment_id) continue;
      const arr = map.get(img.comment_id) ?? [];
      arr.push(img);
      map.set(img.comment_id, arr);
    }
    return map;
  }, [images]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const created = await createComment({ casinoId, data: { text: newComment } }).unwrap();
      setNewComment('');
      message.success('Комментарий добавлен');
      if (pendingFile) {
        try {
          await uploadImage({ casinoId, commentId: created.id, file: pendingFile }).unwrap();
          setPendingFile(null);
        } catch { message.error('Не удалось прикрепить изображение'); }
      }
    } catch { message.error('Ошибка добавления'); }
  };

  const handleDelete = async (commentId: number) => {
    try { await deleteComment({ id: commentId, casinoId }).unwrap(); message.success('Удалён'); }
    catch { message.error('Ошибка удаления'); }
  };

  const handleUploadToComment = async (commentId: number, file: File) => {
    try { await uploadImage({ casinoId, commentId, file }).unwrap(); message.success('Загружено'); }
    catch (e: any) { message.error(e?.data?.error || 'Ошибка загрузки'); throw e; }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {/* New comment */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith('image/'));
          if (file) { setPendingFile(file); message.info('Изображение добавлено'); }
        }}
      >
        <Input.TextArea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Написать комментарий..."
          rows={2}
          onPaste={(e) => {
            const imgItem = Array.from(e.clipboardData?.items || []).find(
              (it) => it.kind === 'file' && (it.type || '').startsWith('image/'),
            );
            const file = imgItem?.getAsFile();
            if (file) { setPendingFile(file); message.info('Изображение добавлено (Ctrl+V)'); }
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space size={10}>
          <Upload showUploadList={false} accept="image/*"
            beforeUpload={(file) => { setPendingFile(file); return false; }}
          >
            <Button shape="circle" icon={<PictureOutlined />} title="Прикрепить изображение" />
          </Upload>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {pendingFile ? 'Фото выбрано — нажмите «Отправить»' : 'Фото: drag & drop / Ctrl+V / кнопка'}
          </Typography.Text>
        </Space>
        <Button type="primary" onClick={handleSubmit} loading={creating || uploadingImage} disabled={!newComment.trim()}>
          Отправить
        </Button>
      </div>

      {pendingFile && (
        <div style={{ padding: 8, borderRadius: 6, border: `1px dashed ${token.colorBorder}`, background: token.colorFillQuaternary, maxWidth: 420 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <PictureOutlined style={{ color: token.colorTextTertiary }} />
              <Typography.Text style={{ fontSize: 12 }}>{pendingFile.name}</Typography.Text>
            </Space>
            <Button type="text" size="small" onClick={() => setPendingFile(null)}>Убрать</Button>
          </Space>
        </div>
      )}

      <List
        loading={isLoading}
        dataSource={comments ?? []}
        locale={{ emptyText: 'Нет комментариев' }}
        renderItem={(comment) => (
          <List.Item
            actions={
              currentUser?.id === comment.user_id ? [
                <Upload key="upload" showUploadList={false} accept="image/*"
                  customRequest={async (options) => {
                    const { file, onSuccess, onError } = options as any;
                    try { await handleUploadToComment(comment.id, file as File); onSuccess?.({}, file); }
                    catch (e) { onError?.(e); }
                  }}
                >
                  <Button type="text" size="small" icon={<PlusOutlined />} loading={uploadingImage}>Картинка</Button>
                </Upload>,
                <Popconfirm key="delete" title="Удалить?" onConfirm={() => handleDelete(comment.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ] : undefined
            }
          >
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space>
                  <Typography.Text strong>{comment.username || 'Пользователь'}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dayjs(comment.created_at).format('DD.MM.YYYY HH:mm')}</Typography.Text>
                </Space>
              }
              description={
                <div>
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{comment.text}</Typography.Paragraph>
                  {(() => {
                    const imgs = imagesByCommentId.get(comment.id) ?? [];
                    if (!imgs.length) return null;
                    return (
                      <div style={{ marginTop: 8 }}>
                        <Image.PreviewGroup>
                          <Space wrap size={[8, 8]}>
                            {imgs.map((img) => (
                              <Image key={img.id} src={img.url} alt={img.original_name || ''} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    );
                  })()}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Space>
  );
}
