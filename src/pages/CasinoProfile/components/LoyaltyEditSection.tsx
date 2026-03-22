import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Image,
  Input,
  Select,
  Space,
  Tabs,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import type { FormListFieldData } from 'antd/es/form';
import {
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  useGetCasinoLoyaltyProgramsQuery,
  useCreateCasinoLoyaltyProgramMutation,
  useUpdateCasinoLoyaltyProgramMutation,
  useDeleteCasinoLoyaltyProgramMutation,
  useAnalyzeLoyaltyImageMutation,
  useAnalyzeLoyaltyStatusImageMutation,
  useUploadLoyaltyStatusImagesMutation,
  useDeleteLoyaltyStatusImageMutation,
  useFormatLoyaltyMarkdownMutation,
  type CasinoLoyaltyProgram,
  type CasinoLoyaltyStatusImage,
  type LoyaltyOrientation,
  type LoyaltyStatusPayload,
} from '../../../store/api/casinoLoyaltyApi';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';

interface LoyaltyEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

/** Галерея скринов статуса: несколько файлов в очередь без ИИ (как у бонуса). */
function LoyaltyStatusGalleryDropZone({ onAddFiles }: { onAddFiles: (files: File[]) => void }) {
  const { token } = theme.useToken();
  const [over, setOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFromList = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      message.warning('Нужны файлы изображений');
      return;
    }
    onAddFiles(images);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      style={{
        border: `2px dashed ${over ? token.colorPrimary : token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        padding: 16,
        textAlign: 'center',
        background: over ? token.colorPrimaryBg : token.colorFillAlter,
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        addFromList(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const files: File[] = [];
        for (const item of Array.from(e.clipboardData.items || [])) {
          if (item.type.startsWith('image/')) {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length > 0) {
          e.stopPropagation();
          addFromList(files);
        }
      }}
      data-loyalty-status-gallery-drop=""
    >
      <PictureOutlined style={{ fontSize: 24, color: token.colorTextQuaternary, marginBottom: 6 }} />
      <Typography.Text strong style={{ display: 'block', lineHeight: 1.4, fontSize: 13 }}>
        Перетащите скрины сюда
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.5 }}>
        Клик — выбор файлов; можно вставить Ctrl+V. Файлы только в очередь загрузки (без ИИ).
      </Typography.Text>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) addFromList(Array.from(list));
          e.target.value = '';
        }}
      />
      <Button
        type="primary"
        ghost
        size="small"
        icon={<PictureOutlined />}
        style={{ marginTop: 10 }}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        Выбрать файлы
      </Button>
    </div>
  );
}

export default function LoyaltyEditSection({ casinoId, activeGeo, geoOptions }: LoyaltyEditSectionProps) {
  const { token } = theme.useToken();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CasinoLoyaltyProgram | null>(null);
  const [pendingByIndex, setPendingByIndex] = useState<Map<number, File[]>>(new Map());
  const [aiProgramDragOver, setAiProgramDragOver] = useState(false);

  const [form] = Form.useForm<{
    geo: string;
    orientation: LoyaltyOrientation;
    conditions_md: string;
    statuses: Array<{ id?: number; name: string; description_md: string }>;
  }>();

  const { data: programs = [], isLoading, refetch } = useGetCasinoLoyaltyProgramsQuery(
    { casinoId },
    { skip: !casinoId },
  );

  const [createProgram, { isLoading: creating }] = useCreateCasinoLoyaltyProgramMutation();
  const [updateProgram, { isLoading: updating }] = useUpdateCasinoLoyaltyProgramMutation();
  const [deleteProgram] = useDeleteCasinoLoyaltyProgramMutation();
  const [analyzeImage, { isLoading: analyzing }] = useAnalyzeLoyaltyImageMutation();
  const [analyzeStatusImage, { isLoading: analyzingStatus }] = useAnalyzeLoyaltyStatusImageMutation();
  const [uploadStatusImages] = useUploadLoyaltyStatusImagesMutation();
  const [deleteStatusImage] = useDeleteLoyaltyStatusImageMutation();
  const [formatMd, { isLoading: formatting }] = useFormatLoyaltyMarkdownMutation();

  const visiblePrograms = activeGeo ? programs.filter((p) => p.geo === activeGeo) : programs;

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setPendingByIndex(new Map());
    setAiProgramDragOver(false);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    if (editing) {
      form.setFieldsValue({
        geo: editing.geo,
        orientation: editing.orientation,
        conditions_md: editing.conditions_md,
        statuses: editing.statuses.map((s) => ({
          id: s.id,
          name: s.name,
          description_md: s.description_md,
        })),
      });
    } else {
      form.setFieldsValue({
        geo: activeGeo || geoOptions[0]?.value || '',
        orientation: 'casino',
        conditions_md: '',
        statuses: [{ name: '', description_md: '' }],
      });
    }
    setPendingByIndex(new Map());
  }, [drawerOpen, editing, form, activeGeo, geoOptions]);

  const handleStatusImageFile = useCallback(
    async (file: File, listIndex: number) => {
      const nameHint = form.getFieldValue(['statuses', listIndex, 'name']) as string | undefined;
      try {
        const res = await analyzeStatusImage({
          casinoId,
          file,
          statusName: typeof nameHint === 'string' ? nameHint : undefined,
        }).unwrap();
        const s = res.suggestions;
        if (!s) {
          message.warning('ИИ не распознал скрин статуса');
          return;
        }
        const cur = form.getFieldValue('statuses') || [];
        const next = [...cur];
        if (!next[listIndex]) next[listIndex] = { name: '', description_md: '' };
        next[listIndex] = {
          ...next[listIndex],
          description_md: s.description_md,
          ...(s.name && !String(next[listIndex].name || '').trim() ? { name: s.name } : {}),
        };
        form.setFieldValue('statuses', next);
        setPendingByIndex((prev) => {
          const m = new Map(prev);
          const arr = [...(m.get(listIndex) ?? []), file];
          m.set(listIndex, arr);
          return m;
        });
        message.success('Описание статуса заполнено по скрину; после сохранения файл будет прикреплён');
      } catch (e: any) {
        message.error(e?.data?.error ?? 'Не удалось разобрать скрин');
      }
    },
    [analyzeStatusImage, casinoId, form],
  );

  const appendPendingOnly = (listIndex: number, files: File[]) => {
    if (!files.length) return;
    setPendingByIndex((prev) => {
      const m = new Map(prev);
      m.set(listIndex, [...(m.get(listIndex) ?? []), ...files]);
      return m;
    });
    message.success(`Добавлено файлов: ${files.length}`);
  };

  const removePendingFile = (listIndex: number, fileIndex: number) => {
    setPendingByIndex((prev) => {
      const m = new Map(prev);
      const arr = [...(m.get(listIndex) ?? [])];
      arr.splice(fileIndex, 1);
      if (arr.length) m.set(listIndex, arr);
      else m.delete(listIndex);
      return m;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (p: CasinoLoyaltyProgram) => {
    setEditing(p);
    setDrawerOpen(true);
  };

  const handleAiImage = async (file: File) => {
    try {
      const geo = form.getFieldValue('geo') || activeGeo;
      const res = await analyzeImage({ casinoId, file, geo }).unwrap();
      const s = res.suggestions;
      if (!s) {
        message.warning('ИИ не вернул данные');
        return;
      }
      if (s.orientation) form.setFieldValue('orientation', s.orientation);
      form.setFieldValue('conditions_md', s.conditions_md);
      form.setFieldValue(
        'statuses',
        s.statuses.map((x) => ({ name: x.name, description_md: x.description_md })),
      );
      setPendingByIndex(new Map());
      message.success('Поля заполнены по скрину — проверьте и сохраните');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось разобрать скрин');
    }
  };

  const handleAiImageRef = useRef<(file: File) => Promise<void>>(async () => {});
  handleAiImageRef.current = handleAiImage;

  /** Ctrl+V с картинкой по панели — разбор всей программы (как у бонуса). */
  useEffect(() => {
    if (!drawerOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (el?.closest?.('[data-loyalty-status-gallery-drop]')) return;
      if (el?.closest?.('[data-loyalty-status-ai-zone]')) return;
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleAiImageRef.current(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [drawerOpen]);

  const formatConditions = async () => {
    const t = form.getFieldValue('conditions_md') || '';
    if (!t.trim()) {
      message.warning('Сначала введите текст');
      return;
    }
    try {
      const r = await formatMd({ casinoId, text: t }).unwrap();
      if (r.markdown) {
        form.setFieldValue('conditions_md', r.markdown);
        message.success('Текст оформлен');
      } else message.warning('ИИ не вернул результат');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка ИИ');
    }
  };

  const formatStatusDescription = async (index: number) => {
    const statuses = form.getFieldValue('statuses') || [];
    const t = statuses[index]?.description_md || '';
    if (!t.trim()) {
      message.warning('Сначала введите описание');
      return;
    }
    try {
      const r = await formatMd({ casinoId, text: t }).unwrap();
      if (r.markdown) {
        const next = [...statuses];
        next[index] = { ...next[index], description_md: r.markdown };
        form.setFieldValue('statuses', next);
        message.success('Описание оформлено');
      } else message.warning('ИИ не вернул результат');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка ИИ');
    }
  };

  const flushPendingUploads = async (saved: CasinoLoyaltyProgram) => {
    const pid = saved.id;
    for (let i = 0; i < saved.statuses.length; i++) {
      const files = pendingByIndex.get(i);
      const sid = saved.statuses[i]?.id;
      if (files?.length && sid) {
        try {
          await uploadStatusImages({ casinoId, programId: pid, statusId: sid, files }).unwrap();
        } catch (e: any) {
          message.error(e?.data?.error ?? `Не удалось загрузить скрины статуса ${i + 1}`);
        }
      }
    }
    setPendingByIndex(new Map());
  };

  const onSave = async (v: {
    geo: string;
    orientation: LoyaltyOrientation;
    conditions_md: string;
    statuses: Array<{ id?: number; name: string; description_md: string }>;
  }) => {
    try {
      const statusesPayload: LoyaltyStatusPayload[] = (v.statuses || []).map((s) => ({
        ...(s.id != null && s.id > 0 ? { id: s.id } : {}),
        name: s.name || 'Статус',
        description_md: s.description_md || '—',
      }));
      const base = {
        geo: v.geo,
        orientation: v.orientation,
        conditions_md: v.conditions_md,
        statuses: statusesPayload,
      };

      let saved: CasinoLoyaltyProgram;
      if (editing) {
        saved = await updateProgram({ casinoId, programId: editing.id, ...base }).unwrap();
        message.success('Сохранено');
      } else {
        saved = await createProgram({
          casinoId,
          geo: base.geo,
          orientation: base.orientation,
          conditions_md: base.conditions_md,
          statuses: statusesPayload.map(({ name, description_md }) => ({ name, description_md })),
        }).unwrap();
        message.success('Создано');
      }

      await flushPendingUploads(saved);

      closeDrawer();
      refetch();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.data?.error ?? 'Не удалось сохранить');
    }
  };

  const onDelete = async (p: CasinoLoyaltyProgram) => {
    try {
      await deleteProgram({ casinoId, programId: p.id }).unwrap();
      message.success('Удалено');
      refetch();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка удаления');
    }
  };

  const onDeleteServerImage = async (imageId: number) => {
    try {
      await deleteStatusImage({ casinoId, imageId }).unwrap();
      message.success('Скрин удалён');
      const r = await refetch();
      if (editing && r.data) {
        const fresh = r.data.find((x) => x.id === editing.id);
        if (fresh) setEditing(fresh);
      }
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось удалить');
    }
  };

  const orientationLabel = (o: LoyaltyOrientation) => (o === 'sport' ? 'Спорт' : 'Казино');

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить программу
        </Button>
        {activeGeo && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Фильтр списка: GEO {activeGeo}
          </Typography.Text>
        )}
      </Space>

      <CasinoProfileTable<CasinoLoyaltyProgram>
        rowKey="id"
        loading={isLoading}
        dataSource={visiblePrograms}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 72 },
          {
            title: 'Направление',
            dataIndex: 'orientation',
            width: 100,
            render: (o: LoyaltyOrientation) => orientationLabel(o),
          },
          {
            title: 'Условия (фрагмент)',
            render: (_, r) => (
              <Typography.Text ellipsis style={{ maxWidth: 280 }} type="secondary">
                {r.conditions_md.replace(/\s+/g, ' ').slice(0, 120)}
              </Typography.Text>
            ),
          },
          {
            title: 'Статусов',
            width: 88,
            render: (_, r) => r.statuses.length,
          },
          {
            title: '',
            width: 100,
            align: 'right' as const,
            render: (_, p) => (
              <Space>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(p)} />
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        width={640}
        destroyOnClose
        styles={{
          header: { alignItems: 'flex-start' },
          body: { paddingTop: 16 },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
        }}
        title={
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              paddingRight: 28,
              maxWidth: '100%',
            }}
          >
            <Avatar
              size={48}
              style={{
                background: editing ? token.colorWarning : token.colorPrimary,
                flexShrink: 0,
              }}
              icon={editing ? <EditOutlined /> : <CrownOutlined />}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
                {editing ? 'Редактировать программу лояльности' : 'Новая программа лояльности'}
              </Typography.Title>
              <Typography.Text
                type="secondary"
                style={{ display: 'block', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}
              >
                {editing
                  ? 'Измените условия и статусы, сохраните. Скрины статусов — в карточке каждого уровня.'
                  : 'Заполните вручную или начните со скрина страницы лояльности — ИИ подставит условия и статусы. Скрины уровней прикрепляйте отдельно.'}
              </Typography.Text>
            </div>
          </div>
        }
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end', rowGap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button
              type="primary"
              style={{ minWidth: 160 }}
              loading={creating || updating}
              onClick={() => form.submit()}
            >
              {editing ? 'Сохранить' : 'Создать программу'}
            </Button>
          </Space>
        }
      >
        {editing ? (
          <Alert
            type="info"
            showIcon
            icon={<EditOutlined />}
            message="Редактирование"
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
                Блок <strong>AI по картинке</strong> сверху заполняет условия программы и список статусов по скрину всей страницы. У каждого статуса отдельно: AI — только описание этого уровня;{' '}
                <strong>Изображения</strong> — несколько файлов в очередь без ИИ (как у бонуса). Ctrl+V вне полей ввода и вне зон статуса — разбор всей программы.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как заполнить программу"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorTextSecondary }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>AI по картинке (программа)</strong> — перетащите скрин страницы лояльности, вставьте{' '}
                    <Typography.Text keyboard>Ctrl+V</Typography.Text> вне полей ввода или выберите файл; пустые поля условий и статусов дополнятся.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Статусы</strong> — в каждом блоке: AI по одному скрину уровня заполняет описание; зона «Изображения» — drag, Ctrl+V или несколько файлов только в очередь загрузки.
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    После сохранения файлы из очереди прикрепятся к соответствующим статусам.
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Card
          size="small"
          title={
            <Space size={8}>
              <RobotOutlined style={{ color: token.colorPrimary }} />
              <span>Заполнение по картинке (AI)</span>
            </Space>
          }
          style={{
            marginBottom: 16,
            borderStyle: 'dashed',
            borderColor: aiProgramDragOver ? token.colorPrimary : token.colorBorderSecondary,
            background: aiProgramDragOver ? token.colorPrimaryBg : undefined,
          }}
          styles={{ body: { paddingBottom: 12 } }}
        >
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
            Скрин <strong>всей</strong> страницы программы лояльности: перетащите в рамку, вставьте{' '}
            <Typography.Text keyboard>Ctrl+V</Typography.Text> (фокус на рамке или в любой зоне панели вне полей и вне зон статуса) или выберите файл.
          </Typography.Text>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null)?.click();
              }
            }}
            style={{
              textAlign: 'center',
              padding: 16,
              borderRadius: token.borderRadiusLG,
              border: `1px dashed ${aiProgramDragOver ? token.colorPrimary : token.colorBorder}`,
              background: token.colorFillAlter,
              cursor: 'pointer',
              outline: 'none',
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAiProgramDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAiProgramDragOver(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAiProgramDragOver(true);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setAiProgramDragOver(false);
              const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
              if (files.length > 0) await handleAiImage(files[0]);
              else message.warning('Нужен файл изображения');
            }}
            onPaste={async (e) => {
              const items = Array.from(e.clipboardData.items || []);
              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (file) {
                    e.stopPropagation();
                    await handleAiImage(file);
                    break;
                  }
                }
              }
            }}
          >
            <RobotOutlined style={{ fontSize: 32, color: token.colorTextQuaternary, marginBottom: 8 }} />
            <div style={{ lineHeight: 1.5 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                Страница лояльности
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                Отпустите файл здесь или нажмите кнопку ниже
              </Typography.Text>
            </div>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                await handleAiImage(file);
                return false;
              }}
            >
              <Button type="primary" ghost icon={<RobotOutlined />} loading={analyzing} style={{ marginTop: 12 }}>
                Выбрать картинку
              </Button>
            </Upload>
          </div>
        </Card>

        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Выберите GEO' }]}>
            <Select options={geoOptions} showSearch optionFilterProp="label" placeholder="GEO" />
          </Form.Item>
          <Form.Item name="orientation" label="Направленность" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'casino', label: 'Казино' },
                { value: 'sport', label: 'Спорт' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Условия программы (как достигаются статусы)">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button size="small" icon={<RobotOutlined />} loading={formatting} onClick={formatConditions}>
                ИИ оформит текст
              </Button>
              <Tabs
                size="small"
                items={[
                  {
                    key: 'edit',
                    label: 'Редактор',
                    children: (
                      <Form.Item name="conditions_md" noStyle>
                        <Input.TextArea rows={8} placeholder="Вставьте или отредактируйте условия…" />
                      </Form.Item>
                    ),
                  },
                  {
                    key: 'preview',
                    label: 'Просмотр',
                    children: (
                      <Form.Item noStyle shouldUpdate>
                        {() => {
                          const md = form.getFieldValue('conditions_md') || '';
                          return (
                            <div
                              style={{
                                border: `1px solid ${token.colorBorder}`,
                                borderRadius: token.borderRadius,
                                padding: 12,
                                minHeight: 160,
                                background: token.colorFillAlter,
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{md || '—'}</ReactMarkdown>
                            </div>
                          );
                        }}
                      </Form.Item>
                    ),
                  },
                ]}
              />
            </Space>
          </Form.Item>

          <Typography.Text strong>Статусы</Typography.Text>
          <Form.List name="statuses">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={12}>
                {fields.map((field, index) => {
                  const serverImages: CasinoLoyaltyStatusImage[] =
                    editing?.statuses[index]?.images ?? [];
                  return (
                    <CardMini
                      key={field.key}
                      token={token}
                      field={field}
                      index={index}
                      serverImages={serverImages}
                      pendingFiles={pendingByIndex.get(index) ?? []}
                      analyzingStatus={analyzingStatus}
                      onRemove={() => remove(field.name)}
                      onFormatAi={() => formatStatusDescription(field.name)}
                      formatting={formatting}
                      onStatusAiFile={(file) => handleStatusImageFile(file, field.name)}
                      onAddPendingFiles={(files) => appendPendingOnly(field.name, files)}
                      onRemovePendingFile={(fileIndex) => removePendingFile(field.name, fileIndex)}
                      onDeleteServerImage={onDeleteServerImage}
                    />
                  );
                })}
                <Button type="dashed" onClick={() => add({ name: '', description_md: '' })} block icon={<PlusOutlined />}>
                  Добавить статус
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </>
  );
}

function CardMini({
  token,
  field,
  index,
  serverImages,
  pendingFiles,
  analyzingStatus,
  onRemove,
  onFormatAi,
  formatting,
  onStatusAiFile,
  onAddPendingFiles,
  onRemovePendingFile,
  onDeleteServerImage,
}: {
  token: ReturnType<typeof theme.useToken>['token'];
  field: FormListFieldData;
  index: number;
  serverImages: CasinoLoyaltyStatusImage[];
  pendingFiles: File[];
  analyzingStatus: boolean;
  onRemove: () => void;
  onFormatAi: () => void;
  formatting: boolean;
  onStatusAiFile: (file: File) => void | Promise<void>;
  onAddPendingFiles: (files: File[]) => void;
  onRemovePendingFile: (fileIndex: number) => void;
  onDeleteServerImage: (imageId: number) => void;
}) {
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [aiStatusDragOver, setAiStatusDragOver] = useState(false);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const runStatusAi = async (file: File) => {
    await onStatusAiFile(file);
  };

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 12,
        background: token.colorBgContainer,
      }}
    >
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text type="secondary">Статус {index + 1}</Typography.Text>
        <Space>
          <Button size="small" icon={<RobotOutlined />} loading={formatting} onClick={onFormatAi}>
            ИИ оформит
          </Button>
          <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={onRemove} />
        </Space>
      </Space>

      <Form.Item name={[field.name, 'id']} hidden>
        <Input type="hidden" />
      </Form.Item>

      <Form.Item
        name={[field.name, 'name']}
        label="Название"
        rules={[{ required: true, message: 'Название статуса' }]}
        style={{ marginBottom: 8 }}
      >
        <Input placeholder="Bronze, Silver…" />
      </Form.Item>

      <Card
        size="small"
        title={
          <Space size={6}>
            <RobotOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
            <span style={{ fontSize: 13 }}>Заполнение по картинке (AI)</span>
          </Space>
        }
        style={{
          marginBottom: 10,
          borderStyle: 'dashed',
          borderColor: aiStatusDragOver ? token.colorPrimary : token.colorBorderSecondary,
          background: aiStatusDragOver ? token.colorPrimaryBg : undefined,
        }}
        styles={{ body: { paddingBottom: 10 } }}
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12, lineHeight: 1.55 }}>
          Один скрин <strong>этого</strong> уровня: ИИ заполнит описание и добавит файл в очередь загрузки.{' '}
          <Typography.Text keyboard>Ctrl+V</Typography.Text> в этой рамке не трогает программу целиком.
        </Typography.Text>
        <div
          role="button"
          tabIndex={0}
          data-loyalty-status-ai-zone=""
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null)?.click();
            }
          }}
          style={{
            textAlign: 'center',
            padding: 12,
            borderRadius: token.borderRadiusLG,
            border: `1px dashed ${aiStatusDragOver ? token.colorPrimary : token.colorBorder}`,
            background: token.colorFillAlter,
            cursor: 'pointer',
            outline: 'none',
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAiStatusDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAiStatusDragOver(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAiStatusDragOver(true);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setAiStatusDragOver(false);
            const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
            if (files.length > 0) await runStatusAi(files[0]);
            else message.warning('Нужен файл изображения');
          }}
          onPaste={async (e) => {
            const items = Array.from(e.clipboardData.items || []);
            for (const item of items) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                  e.stopPropagation();
                  await runStatusAi(file);
                  break;
                }
              }
            }
          }}
        >
          <RobotOutlined style={{ fontSize: 26, color: token.colorTextQuaternary, marginBottom: 6 }} />
          <Typography.Text strong style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>
            Скрин статуса
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Перетащите, вставьте или выберите файл
          </Typography.Text>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={async (file) => {
              await runStatusAi(file);
              return false;
            }}
          >
            <Button type="primary" ghost size="small" icon={<RobotOutlined />} loading={analyzingStatus} style={{ marginTop: 8 }}>
              Выбрать картинку
            </Button>
          </Upload>
        </div>
      </Card>

      <Tabs
        size="small"
        style={{ marginBottom: 10 }}
        items={[
          {
            key: 'e',
            label: 'Описание',
            children: (
              <Form.Item name={[field.name, 'description_md']} noStyle>
                <Input.TextArea rows={5} placeholder="Привилегии, лимиты, требования…" />
              </Form.Item>
            ),
          },
          {
            key: 'p',
            label: 'Просмотр',
            children: (
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.statuses !== cur.statuses}>
                {({ getFieldValue }) => {
                  const st = getFieldValue('statuses') || [];
                  const md = st[field.name]?.description_md || '';
                  return (
                    <div
                      style={{
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: token.borderRadius,
                        padding: 10,
                        minHeight: 120,
                        background: token.colorFillAlter,
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md || '—'}</ReactMarkdown>
                    </div>
                  );
                }}
              </Form.Item>
            ),
          },
        ]}
      />

      <Card
        size="small"
        title={
          <Space size={6}>
            <PictureOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
            <span style={{ fontSize: 13 }}>Изображения статуса</span>
          </Space>
        }
        style={{ borderColor: token.colorBorderSecondary }}
        styles={{ body: { paddingBottom: 10 } }}
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12, lineHeight: 1.55 }}>
          Несколько файлов только в очередь загрузки (без ИИ). Перетащите, вставьте{' '}
          <Typography.Text keyboard>Ctrl+V</Typography.Text> в рамку или выберите файлы.
        </Typography.Text>
        {serverImages.length > 0 && (
          <Image.PreviewGroup>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              Уже загружено
            </Typography.Text>
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
              {serverImages.map((img) => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <Image src={img.url} alt="" width={72} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 0, right: 0 }}
                    onClick={() => onDeleteServerImage(img.id)}
                  />
                </div>
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
        <LoyaltyStatusGalleryDropZone onAddFiles={onAddPendingFiles} />
        {pendingFiles.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong style={{ fontSize: 11 }}>
              К загрузке ({pendingFiles.length}):
            </Typography.Text>
            <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
              {pendingFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} style={{ position: 'relative' }}>
                  <img
                    src={pendingUrls[idx] ?? ''}
                    alt={file.name}
                    width={56}
                    height={56}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 0, right: 0 }}
                    onClick={() => onRemovePendingFile(idx)}
                  />
                </div>
              ))}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
