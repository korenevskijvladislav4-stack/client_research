import { useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Image,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
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

interface ScreenshotsEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
  defaultUrl?: string;
}

export default function ScreenshotsEditSection({ casinoId, activeGeo, geoOptions, defaultUrl }: ScreenshotsEditSectionProps) {
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
  const [manualForm] = Form.useForm();

  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
        <Button type="primary" icon={<PlusOutlined />} onClick={openSelectorCreate}>Добавить селектор</Button>
        <Button icon={<PictureOutlined />} onClick={() => openManualDrawer()}>Загрузить вручную</Button>
      </div>

      <Table<SlotScreenshot>
        rowKey="selector_id"
        size="small"
        loading={isLoading}
        dataSource={screenshots.filter((s) => (activeGeo ? s.geo === activeGeo : true))}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 80 },
          { title: 'Раздел', dataIndex: 'section', width: 150, render: (v) => v || '—' },
          { title: 'Категория', dataIndex: 'category', width: 150, render: (v) => v || '—' },
          {
            title: 'Скриншот', width: 120,
            render: (_, r) => r.screenshot_url ? (
              <Button type="link" size="small" onClick={() => setPreviewImage(r.screenshot_url || null)}>Раскрыть</Button>
            ) : <Typography.Text type="secondary">Нет</Typography.Text>,
          },
          {
            title: 'Обновлён', width: 160,
            render: (_, r) => r.screenshot_created_at ? dayjs(r.screenshot_created_at).format('DD.MM.YYYY HH:mm') : '—',
          },
          {
            title: '', width: 150, align: 'right',
            render: (_, record) => {
              if (record.selector) {
                return (
                  <Space>
                    <Button type="link" size="small" loading={taking}
                      onClick={async () => {
                        try { await takeScreenshot(record.selector_id).unwrap(); message.success('Обновлён'); }
                        catch { message.error('Ошибка'); }
                      }}
                    >Обновить</Button>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openSelectorEdit(record)} />
                    <Popconfirm title="Удалить селектор?" onConfirm={async () => {
                      try { await deleteSelector(record.selector_id).unwrap(); message.success('Удалён'); }
                      catch { message.error('Ошибка'); }
                    }}>
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
                    <Popconfirm title="Удалить скриншот?" onConfirm={async () => {
                      try { await deleteManual({ casinoId, screenshotId: record.screenshot_id! }).unwrap(); message.success('Удалён'); refetch(); }
                      catch { message.error('Ошибка'); }
                    }}>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} loading={deleting} />
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      />

      {/* Selector drawer */}
      <Drawer
        title={editingSelector ? 'Редактировать селектор' : 'Новый селектор'}
        open={selectorDrawer}
        onClose={() => { setSelectorDrawer(false); setEditingSelector(null); selectorForm.resetFields(); }}
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setSelectorDrawer(false); setEditingSelector(null); }}>Отмена</Button>
            <Button type="primary" onClick={() => selectorForm.submit()}>{editingSelector ? 'Сохранить' : 'Создать'}</Button>
          </div>
        }
      >
        <Form form={selectorForm} layout="vertical"
          onFinish={async (values) => {
            try {
              if (editingSelector) {
                await updateSelector({ id: editingSelector.id, data: values }).unwrap();
                message.success('Обновлён');
              } else {
                await createSelector({ casinoId, data: values }).unwrap();
                message.success('Создан');
              }
              setSelectorDrawer(false);
              setEditingSelector(null);
              selectorForm.resetFields();
            } catch (e: any) { message.error(e?.data?.error || 'Ошибка'); }
          }}
        >
          <Form.Item name="geo" label="GEO" rules={[{ required: true }]}>
            <Select placeholder="GEO" options={geoOptions} showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="section" label="Раздел" rules={[{ required: true }]} tooltip="Напр.: Популярные игры, Слоты">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Категория" tooltip="Опционально: Слоты, Настольные, Живые">
            <Input />
          </Form.Item>
          <Form.Item name="url" label="URL" tooltip="Относительный путь: /bonuses, /slots">
            <Input placeholder="/bonuses" />
          </Form.Item>
          <Form.Item name="selector" label="CSS Селектор" rules={[{ required: true }]} tooltip="CSS селектор элемента для скриншота">
            <Input.TextArea rows={3} placeholder=".games-list" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Manual screenshot drawer */}
      <Drawer
        title="Загрузка скриншота вручную"
        open={manualDrawer}
        onClose={() => { setManualDrawer(false); setManualFile(null); manualForm.resetFields(); }}
        width={480}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setManualDrawer(false); setManualFile(null); }}>Отмена</Button>
            <Button type="primary" loading={uploading} onClick={() => manualForm.submit()}>Загрузить</Button>
          </div>
        }
      >
        <Form form={manualForm} layout="vertical"
          onFinish={async (values) => {
            if (!manualFile) { message.error('Выберите файл'); return; }
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
              setManualDrawer(false);
              setManualFile(null);
              manualForm.resetFields();
              refetch();
            } catch (e: any) { message.error(e?.data?.error ?? 'Ошибка загрузки'); }
          }}
        >
          <Form.Item name="geo" label="GEO" rules={[{ required: true }]}>
            <Select placeholder="GEO" options={geoOptions} showSearch
              filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="section" label="Раздел" rules={[{ required: true }]}>
            <Input placeholder="Основной" />
          </Form.Item>
          <Form.Item name="category" label="Категория"><Input /></Form.Item>
          <Form.Item name="url" label="URL"><Input /></Form.Item>
          <Form.Item label="Файл" required>
            <Upload accept="image/*" multiple={false} showUploadList={!!manualFile}
              beforeUpload={(file) => { setManualFile(file); return false; }}
              onRemove={() => setManualFile(null)}
            >
              <Button icon={<PictureOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      {previewImage && (
        <Image style={{ display: 'none' }} src={previewImage}
          preview={{ visible: true, onVisibleChange: (v) => { if (!v) setPreviewImage(null); } }}
        />
      )}
    </>
  );
}
