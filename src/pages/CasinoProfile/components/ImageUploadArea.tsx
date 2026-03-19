import { useState } from 'react';
import { Button, Space, Typography, Upload, message, theme } from 'antd';
import { PictureOutlined, DeleteOutlined } from '@ant-design/icons';

interface ImageUploadAreaProps {
  onUpload: (files: File[]) => Promise<void>;
}

export default function ImageUploadArea({ onUpload }: ImageUploadAreaProps) {
  const { token } = theme.useToken();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...imageFiles]);
      message.info('Изображения добавлены, нажмите «Загрузить»');
    }
  };

  return (
    <>
      <div
        style={{
          border: `2px dashed ${token.colorBorder}`,
          borderRadius: 6,
          padding: 12,
          textAlign: 'center',
          cursor: 'pointer',
          marginTop: 4,
        }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(Array.from(e.dataTransfer.files));
        }}
        onPaste={(e) => {
          const files: File[] = [];
          for (const item of Array.from(e.clipboardData.items || [])) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
          handleFiles(files);
        }}
      >
        <PictureOutlined style={{ fontSize: 22, color: token.colorTextTertiary, marginBottom: 6 }} />
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Перетащите изображения, вставьте (Ctrl+V) или выберите файлы
          </Typography.Text>
        </div>
        <Upload
          multiple
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            setPendingFiles((prev) => [...prev, file]);
            return false;
          }}
        >
          <Button size="small" icon={<PictureOutlined />}>
            Выбрать файлы
          </Button>
        </Upload>
      </div>

      {pendingFiles.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong style={{ fontSize: 12 }}>
            К загрузке ({pendingFiles.length}):
          </Typography.Text>
          <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
            {pendingFiles.map((file, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  width={70}
                  height={70}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ position: 'absolute', top: 0, right: 0 }}
                  onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                />
              </div>
            ))}
          </Space>
          <Button
            type="primary"
            size="small"
            style={{ marginTop: 8 }}
            onClick={async () => {
              if (pendingFiles.length === 0) return;
              try {
                await onUpload(pendingFiles);
                message.success('Изображения загружены');
                setPendingFiles([]);
              } catch (e: unknown) {
                const err = e as { data?: { error?: string } };
                message.error(err?.data?.error ?? 'Ошибка загрузки изображений');
              }
            }}
          >
            Загрузить
          </Button>
        </div>
      )}
    </>
  );
}
