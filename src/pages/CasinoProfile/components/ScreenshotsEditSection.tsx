import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Image,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
  theme,
} from 'antd';
import {
  AimOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  useGetSelectorsByCasinoQuery,
  useCreateSelectorMutation,
  useUpdateSelectorMutation,
  useDeleteSelectorMutation,
  useGetScreenshotsByCasinoQuery,
  useTakeScreenshotMutation,
  useUploadManualScreenshotMutation,
  useDeleteManualScreenshotMutation,
  SlotSelector,
  SlotScreenshot,
} from '../../../store/api/slotSelectorApi';
import dayjs from 'dayjs';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';

interface ScreenshotsEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
  defaultUrl?: string;
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

export default function ScreenshotsEditSection({ casinoId, activeGeo, geoOptions, defaultUrl }: ScreenshotsEditSectionProps) {
  const { token } = theme.useToken();
  const { data: selectors = [] } = useGetSelectorsByCasinoQuery(casinoId, { skip: !casinoId });
  const { data: screenshots = [], isLoading, refetch } = useGetScreenshotsByCasinoQuery(casinoId, { skip: !casinoId });
  const [createSelector] = useCreateSelectorMutation();
  const [updateSelector] = useUpdateSelectorMutation();
  const [deleteSelector] = useDeleteSelectorMutation();
  const [takeScreenshot, { isLoading: taking }] = useTakeScreenshotMutation();
  const [uploadManual, { isLoading: uploading }] = useUploadManualScreenshotMutation();
  const [deleteManual, { isLoading: deleting }] = useDeleteManualScreenshotMutation();

  const [selectorDrawer, setSelectorDrawer] = useState(false);
  const [editingSelector, setEditingSelector] = useState<SlotSelector | null>(null);
  const [selectorForm] = Form.useForm();

  const [manualDrawer, setManualDrawer] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualDragOver, setManualDragOver] = useState(false);
  const [manualPreviewUrl, setManualPreviewUrl] = useState<string | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const [manualForm] = Form.useForm();

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!manualFile) {
      setManualPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(manualFile);
    setManualPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [manualFile]);

  /** Ctrl+V по странице, пока открыта ручная загрузка (не мешаем вводу в полях формы). */
  useEffect(() => {
    if (!manualDrawer) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return;

      const items = e.clipboardData?.items;
      if (!items?.length) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setManualFile(file);
            message.success('Изображение вставлено из буфера (Ctrl+V)');
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [manualDrawer]);

  const closeSelectorDrawer = () => {
    setSelectorDrawer(false);
    setEditingSelector(null);
    selectorForm.resetFields();
  };

  const closeManualDrawer = () => {
    setManualDrawer(false);
    setManualFile(null);
    setManualDragOver(false);
    manualForm.resetFields();
  };

  const pickManualFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter(isImageFile);
    if (list.length === 0) {
      message.warning('Нужен файл изображения (PNG, JPG, WebP и т.д.)');
      return;
    }
    if (list.length > 1) {
      message.info('Загружается одно изображение — взято первое из выбранных');
    }
    setManualFile(list[0]);
  };

  const openSelectorCreate = () => {
    setEditingSelector(null);
    selectorForm.resetFields();
    if (activeGeo) selectorForm.setFieldsValue({ geo: activeGeo });
    if (defaultUrl) selectorForm.setFieldsValue({ url: defaultUrl });
    setSelectorDrawer(true);
  };

  const openSelectorEdit = (record: SlotScreenshot) => {
    const selector = selectors.find((s) => s.id === record.selector_id);
    if (!selector) return;
    setEditingSelector(selector);
    selectorForm.resetFields();
    selectorForm.setFieldsValue({
      geo: selector.geo,
      section: selector.section,
      category: selector.category || undefined,
      selector: selector.selector,
      url: selector.url || undefined,
    });
    setSelectorDrawer(true);
  };

  const openManualDrawer = (record?: SlotScreenshot) => {
    setManualDrawer(true);
    setManualFile(null);
    manualForm.resetFields();
    manualForm.setFieldsValue({
      geo: record?.geo ?? activeGeo,
      section: record?.section ?? '',
      category: record?.category ?? undefined,
      url: record?.url ?? defaultUrl ?? undefined,
    });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSelectorCreate}>
          Добавить селектор
        </Button>
        <Button icon={<PictureOutlined />} onClick={() => openManualDrawer()}>
          Загрузить вручную
        </Button>
      </div>

      <CasinoProfileTable<SlotScreenshot>
        rowKey="selector_id"
        loading={isLoading}
        dataSource={screenshots.filter((s) => (activeGeo ? s.geo === activeGeo : true))}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 80 },
          { title: 'Раздел', dataIndex: 'section', width: 150, render: (v) => v || '—' },
          { title: 'Категория', dataIndex: 'category', width: 150, render: (v) => v || '—' },
          {
            title: 'Скриншот',
            width: 120,
            render: (_, r) =>
              r.screenshot_url ? (
                <Button type="link" size="small" onClick={() => setPreviewImage(r.screenshot_url || null)}>
                  Раскрыть
                </Button>
              ) : (
                <Typography.Text type="secondary">Нет</Typography.Text>
              ),
          },
          {
            title: 'Обновлён',
            width: 160,
            render: (_, r) => (r.screenshot_created_at ? dayjs(r.screenshot_created_at).format('DD.MM.YYYY HH:mm') : '—'),
          },
          {
            title: '',
            width: 150,
            align: 'right',
            render: (_, record) => {
              if (record.selector) {
                return (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      loading={taking}
                      onClick={async () => {
                        try {
                          await takeScreenshot(record.selector_id).unwrap();
                          message.success('Обновлён');
                        } catch {
                          message.error('Ошибка');
                        }
                      }}
                    >
                      Обновить
                    </Button>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openSelectorEdit(record)} />
                    <Popconfirm
                      title="Удалить селектор?"
                      onConfirm={async () => {
                        try {
                          await deleteSelector(record.selector_id).unwrap();
                          message.success('Удалён');
                        } catch {
                          message.error('Ошибка');
                        }
                      }}
                    >
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                );
              }
              return (
                <Space>
                  <Button type="link" size="small" loading={uploading} onClick={() => openManualDrawer(record)}>
                    {record.screenshot_id ? 'Обновить' : 'Загрузить'}
                  </Button>
                  {record.screenshot_id && (
                    <Popconfirm
                      title="Удалить скриншот?"
                      onConfirm={async () => {
                        try {
                          await deleteManual({ casinoId, screenshotId: record.screenshot_id! }).unwrap();
                          message.success('Удалён');
                          refetch();
                        } catch {
                          message.error('Ошибка');
                        }
                      }}
                    >
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} loading={deleting} />
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      />

      {/* Селектор для авто-скриншота */}
      <Drawer
        open={selectorDrawer}
        onClose={closeSelectorDrawer}
        width={640}
        destroyOnClose
        styles={{
          body: { paddingTop: 16 },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
        }}
        title={
          <Space align="start" size={14} style={{ paddingRight: 32 }}>
            <Avatar
              size={48}
              style={{
                background: editingSelector ? token.colorWarning : token.colorPrimary,
                flexShrink: 0,
              }}
              icon={editingSelector ? <EditOutlined /> : <PlusOutlined />}
            />
            <div style={{ minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>
                {editingSelector ? 'Редактировать селектор' : 'Новый селектор'}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13, marginBottom: 0 }}>
                {editingSelector
                  ? 'Измените URL, область страницы или CSS — затем снова нажмите «Обновить» у строки в таблице.'
                  : 'Задайте страницу и CSS-селектор: сервис сделает скриншот элемента на сайте казино.'}
              </Typography.Paragraph>
            </div>
          </Space>
        }
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeSelectorDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 160 }} onClick={() => selectorForm.submit()}>
              {editingSelector ? 'Сохранить' : 'Создать селектор'}
            </Button>
          </Space>
        }
      >
        {editingSelector ? (
          <Alert
            type="info"
            showIcon
            icon={<EditOutlined />}
            message="Редактирование"
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                После сохранения нажмите «Обновить» в таблице скриншотов, чтобы переснять картинку с новыми настройками.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как настроить автоскриншот"
            description={
              <div style={{ fontSize: 13 }}>
                <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
                  Селектор привязывается к GEO и открываемой странице. Бэкенд откроет{' '}
                  <Typography.Text code>website</Typography.Text> казино + ваш <Typography.Text code>URL</Typography.Text>{' '}
                  (путь) и сфотографирует DOM-элемент по CSS.
                </Typography.Paragraph>
                <ul style={{ margin: 0, paddingLeft: 20, color: token.colorTextSecondary }}>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>GEO</Typography.Text> — рынок, как в профиле казино.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>Раздел / категория</Typography.Text> — подписи в таблице (например, «Слоты»,
                    «Бонусы»).
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <Typography.Text strong>URL</Typography.Text> — путь на сайте: <Typography.Text code>/promo</Typography.Text>,{' '}
                    <Typography.Text code>/games</Typography.Text> (без домена).
                  </li>
                  <li>
                    <Typography.Text strong>CSS-селектор</Typography.Text> — один узел на странице (класс, id, вложенность).
                    Проверьте в DevTools → «Copy → Copy selector».
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={selectorForm}
          layout="vertical"
          requiredMark="optional"
          onFinish={async (values) => {
            try {
              if (editingSelector) {
                await updateSelector({ id: editingSelector.id, data: values }).unwrap();
                message.success('Обновлён');
              } else {
                await createSelector({ casinoId, data: values }).unwrap();
                message.success('Создан');
              }
              closeSelectorDrawer();
            } catch (e: any) {
              message.error(e?.data?.error || 'Ошибка');
            }
          }}
        >
          <Card
            size="small"
            title={
              <Space size={8}>
                <GlobalOutlined style={{ color: token.colorPrimary }} />
                <span>Регион и страница</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 8 } }}
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Выберите GEO' }]}
              extra="Должен совпадать с вкладкой GEO в профиле, если ведёте скриншоты по рынкам."
            >
              <Select
                size="large"
                placeholder="Выберите GEO"
                options={geoOptions}
                showSearch
                suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <Form.Item
              name="url"
              label="URL (путь на сайте)"
              tooltip="Открывается относительно основного website казино"
              extra="Например /bonuses или /live — без https и домена."
            >
              <Input placeholder="/bonuses" prefix={<LinkOutlined style={{ color: token.colorTextQuaternary }} />} allowClear />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <AimOutlined style={{ color: token.colorPrimary }} />
                <span>Область и селектор</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 4 } }}
            style={{ marginBottom: 8, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item
              name="section"
              label="Раздел"
              rules={[{ required: true, message: 'Укажите раздел' }]}
              tooltip="Подпись в таблице скриншотов"
              extra="Короткое имя блока: «Главная», «Промо», «Игры»."
            >
              <Input placeholder="Например: Популярные игры" allowClear />
            </Form.Item>

            <Form.Item
              name="category"
              label="Категория"
              tooltip="Необязательная уточняющая метка"
              extra="Опционально: Слоты, Live, Спорт."
            >
              <Input placeholder="Опционально" allowClear />
            </Form.Item>

            <Form.Item
              name="selector"
              label="CSS-селектор"
              rules={[{ required: true, message: 'Укажите CSS-селектор' }]}
              tooltip="Элемент, который нужно снять в скриншот"
              extra="Один селектор → один прямоугольник на странице. Проверьте в инструментах разработчика браузера."
            >
              <Input.TextArea
                rows={4}
                placeholder=".hero-banner, #main-content, section.promo …"
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            </Form.Item>
          </Card>
        </Form>
      </Drawer>

      {/* Ручная загрузка скриншота */}
      <Drawer
        open={manualDrawer}
        onClose={closeManualDrawer}
        width={640}
        destroyOnClose
        styles={{
          body: { paddingTop: 16 },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
        }}
        title={
          <Space align="start" size={14} style={{ paddingRight: 32 }}>
            <Avatar size={48} style={{ background: token.colorPrimary, flexShrink: 0 }} icon={<CloudUploadOutlined />} />
            <div style={{ minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>
                Загрузка скриншота вручную
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13, marginBottom: 0 }}>
                Прикрепите готовый снимок экрана: перетащите в область, вставьте Ctrl+V или выберите файл. Метаданные
                совпадают со строками таблицы (GEO, раздел).
              </Typography.Paragraph>
            </div>
          </Space>
        }
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeManualDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 160 }} loading={uploading} onClick={() => manualForm.submit()}>
              Загрузить
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Как прикрепить файл"
          description={
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: token.colorTextSecondary }}>
              <li style={{ marginBottom: 6 }}>
                <Typography.Text strong>Перетащите</Typography.Text> картинку в рамку ниже (drag &amp; drop).
              </li>
              <li style={{ marginBottom: 6 }}>
                <Typography.Text strong>Ctrl+V</Typography.Text> — вставка из буфера, когда фокус не в поле ввода
                (или кликните по рамке и вставьте).
              </li>
              <li>
                <Typography.Text strong>Кнопка</Typography.Text> «Выбрать файл» — обычный диалог проводника.
              </li>
            </ul>
          }
          style={{ marginBottom: 20 }}
        />

        <Form
          form={manualForm}
          layout="vertical"
          requiredMark="optional"
          onFinish={async (values) => {
            if (!manualFile) {
              message.error('Прикрепите изображение');
              return;
            }
            try {
              await uploadManual({
                casinoId,
                geo: values.geo,
                section: values.section,
                category: values.category || null,
                url: values.url || null,
                file: manualFile,
              }).unwrap();
              message.success('Загружен');
              closeManualDrawer();
              refetch();
            } catch (e: any) {
              message.error(e?.data?.error ?? 'Ошибка загрузки');
            }
          }}
        >
          <Card
            size="small"
            title={
              <Space size={8}>
                <GlobalOutlined style={{ color: token.colorPrimary }} />
                <span>Метаданные</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 8 } }}
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Выберите GEO' }]} extra="К какому рынку относится этот снимок.">
              <Select
                size="large"
                placeholder="Выберите GEO"
                options={geoOptions}
                showSearch
                suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
                filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <Form.Item name="section" label="Раздел" rules={[{ required: true, message: 'Укажите раздел' }]} extra="Как в таблице скриншотов — для поиска и группировки.">
              <Input placeholder="Например: Главная" allowClear />
            </Form.Item>

            <Form.Item name="category" label="Категория" extra="Необязательно.">
              <Input allowClear />
            </Form.Item>

            <Form.Item name="url" label="URL (справочно)" extra="Путь на сайте для подписи; на файл не влияет.">
              <Input placeholder="/promo" allowClear prefix={<LinkOutlined style={{ color: token.colorTextQuaternary }} />} />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <PictureOutlined style={{ color: token.colorPrimary }} />
                <span>Изображение</span>
              </Space>
            }
            styles={{ body: { paddingBottom: 12 } }}
            style={{ marginBottom: 8, borderColor: token.colorBorderSecondary }}
          >
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
              Одно изображение на загрузку. Форматы: PNG, JPG, WebP и другие, которые поддерживает браузер.
            </Typography.Paragraph>

            <input
              ref={manualFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && isImageFile(f)) setManualFile(f);
                else if (f) message.warning('Выберите файл изображения');
                e.target.value = '';
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  manualFileInputRef.current?.click();
                }
              }}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                      e.preventDefault();
                      setManualFile(file);
                      message.success('Вставлено в область загрузки');
                      return;
                    }
                  }
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setManualDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setManualDragOver(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setManualDragOver(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setManualDragOver(false);
                pickManualFiles(e.dataTransfer.files);
              }}
              onClick={() => manualFileInputRef.current?.click()}
              style={{
                border: `2px dashed ${manualDragOver ? token.colorPrimary : token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                padding: manualPreviewUrl ? 12 : 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: manualDragOver ? token.colorPrimaryBg : token.colorFillAlter,
                transition: 'border-color 0.2s, background 0.2s',
                outline: 'none',
              }}
            >
              {manualPreviewUrl ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                  <img
                    src={manualPreviewUrl}
                    alt="Предпросмотр"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 280,
                      objectFit: 'contain',
                      borderRadius: token.borderRadius,
                    }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {manualFile ? `${manualFile.name} · ${(manualFile.size / 1024).toFixed(1)} КБ` : ''}
                  </Typography.Text>
                  <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
                    <Button size="small" icon={<PictureOutlined />} onClick={() => manualFileInputRef.current?.click()}>
                      Другой файл
                    </Button>
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => setManualFile(null)}
                    >
                      Убрать
                    </Button>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <CloudUploadOutlined style={{ fontSize: 40, color: token.colorTextTertiary }} />
                  <div>
                    <Typography.Text strong style={{ display: 'block' }}>
                      Перетащите файл сюда
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      или нажмите, чтобы выбрать · вставка Ctrl+V работает в этой области и по всей панели
                    </Typography.Text>
                  </div>
                  <Button type="primary" ghost icon={<PictureOutlined />} onClick={(e) => { e.stopPropagation(); manualFileInputRef.current?.click(); }}>
                    Выбрать файл
                  </Button>
                </Space>
              )}
            </div>
          </Card>
        </Form>
      </Drawer>

      {previewImage && (
        <Image
          style={{ display: 'none' }}
          src={previewImage}
          preview={{ visible: true, onVisibleChange: (v) => { if (!v) setPreviewImage(null); } }}
        />
      )}
    </>
  );
}
