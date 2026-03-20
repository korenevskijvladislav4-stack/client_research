import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Image,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {
  useGetCasinoPromosQuery,
  useCreateCasinoPromoMutation,
  useUpdateCasinoPromoMutation,
  useDeleteCasinoPromoMutation,
  useGetPromoImagesQuery,
  useUploadPromoImagesMutation,
  useDeletePromoImageMutation,
  CasinoPromo,
  CasinoPromoImage,
  PromoCategory,
} from '../../../store/api/casinoPromoApi';
import dayjs from 'dayjs';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';
import { PromoFormProfileCore } from '../../../components/casinoForms/PromoFormProfileCore';

interface PromoEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

function PromoGalleryDropZone({ onAddFiles }: { onAddFiles: (files: File[]) => void }) {
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
        padding: 20,
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
      data-promo-gallery-drop=""
    >
      <PictureOutlined style={{ fontSize: 28, color: token.colorTextQuaternary, marginBottom: 8 }} />
      <Typography.Text strong style={{ display: 'block', lineHeight: 1.4 }}>
        Перетащите файлы сюда
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
        Клик по области — выбор файлов; можно вставить изображение Ctrl+V
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
        icon={<PictureOutlined />}
        style={{ marginTop: 12 }}
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

export default function PromoEditSection({ casinoId, activeGeo, geoOptions }: PromoEditSectionProps) {
  const { token } = theme.useToken();
  const { data: promos, isLoading } = useGetCasinoPromosQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as any,
  );
  const [createPromo] = useCreateCasinoPromoMutation();
  const [updatePromo] = useUpdateCasinoPromoMutation();
  const [deletePromo] = useDeleteCasinoPromoMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CasinoPromo | null>(null);
  const [form] = Form.useForm();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingThumbUrls, setPendingThumbUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: promoImages = [] } = useGetPromoImagesQuery(
    { casinoId, promoId: editing?.id ?? 0 },
    { skip: !editing?.id || !casinoId },
  );
  const [uploadPromoImages] = useUploadPromoImagesMutation();
  const [deletePromoImage] = useDeletePromoImageMutation();

  useEffect(() => {
    const urls = pendingImages.map((f) => URL.createObjectURL(f));
    setPendingThumbUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingImages]);

  const addPendingRef = useRef<(files: File[]) => void>(() => {});
  addPendingRef.current = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;
    setPendingImages((prev) => [...prev, ...images]);
    message.success(`Добавлено файлов: ${images.length}`);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (el?.closest?.('[data-promo-gallery-drop]')) return;
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            addPendingRef.current([file]);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setPendingImages([]);
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (activeGeo) form.setFieldsValue({ geo: [activeGeo] });
    setPendingImages([]);
    setDrawerOpen(true);
  };

  const openEdit = (r: CasinoPromo) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({
      ...r,
      geo: [r.geo],
      promo_type: r.promo_type ? [r.promo_type] : undefined,
      period: r.period_start && r.period_end ? [dayjs(r.period_start), dayjs(r.period_end)] : undefined,
    });
    setPendingImages([]);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const geoArr: string[] = values.geo ?? [];
      const [periodStart, periodEnd] = values.period ?? [null, null];
      const promoTypeValue = Array.isArray(values.promo_type)
        ? (values.promo_type[0] ?? null)
        : (values.promo_type ?? null);
      const periodType = values.period_type ?? 'fixed';
      const base = {
        promo_category: values.promo_category ?? 'tournament',
        name: values.name,
        promo_type: promoTypeValue,
        period_type: periodType,
        period_start: periodType === 'fixed' && periodStart ? dayjs(periodStart).format('YYYY-MM-DD') : null,
        period_end: periodType === 'fixed' && periodEnd ? dayjs(periodEnd).format('YYYY-MM-DD') : null,
        has_participation_button: Boolean(values.has_participation_button),
        provider: values.provider ?? null,
        prize_fund: values.prize_fund ?? null,
        mechanics: values.mechanics ?? null,
        min_bet: values.min_bet ?? null,
        wagering_prize: values.wagering_prize ?? null,
        status: values.status ?? 'active',
      };

      const savedPromos: CasinoPromo[] = [];
      if (editing) {
        const updated = await updatePromo({ casinoId, id: editing.id!, patch: { ...base, geo: geoArr[0] } }).unwrap();
        savedPromos.push(updated);
        message.success('Промо обновлено');
      } else {
        for (const g of geoArr) {
          const created = await createPromo({ casinoId, ...base, geo: g }).unwrap();
          savedPromos.push(created);
        }
        message.success('Промо добавлено');
      }

      if (pendingImages.length > 0) {
        for (const promo of savedPromos) {
          if (!promo.id) continue;
          try {
            await uploadPromoImages({ casinoId, promoId: promo.id, files: pendingImages }).unwrap();
          } catch (e: any) {
            message.error(e?.data?.error ?? 'Ошибка загрузки изображений');
          }
        }
        setPendingImages([]);
      }
      closeDrawer();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения промо');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить промо
        </Button>
      </div>

      <CasinoProfileTable<CasinoPromo>
        rowKey="id"
        loading={isLoading}
        dataSource={promos ?? []}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          {
            title: 'Категория',
            dataIndex: 'promo_category',
            width: 110,
            render: (v: PromoCategory) => (
              <Tag color={v === 'tournament' ? 'blue' : v === 'promotion' ? 'purple' : 'gold'}>
                {v === 'tournament' ? 'Турнир' : v === 'promotion' ? 'Акция' : 'Лотерея'}
              </Tag>
            ),
          },
          { title: 'Тип', dataIndex: 'promo_type', width: 110, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Название', dataIndex: 'name', width: 180, ellipsis: true },
          {
            title: 'Период',
            width: 150,
            render: (_: any, r: CasinoPromo) => {
              if (!r.period_start && !r.period_end) return '—';
              return `${r.period_start ? dayjs(r.period_start).format('DD.MM.YY') : '?'} – ${r.period_end ? dayjs(r.period_end).format('DD.MM.YY') : '?'}`;
            },
          },
          { title: 'Провайдер', dataIndex: 'provider', width: 120, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Общий ПФ', dataIndex: 'prize_fund', width: 100, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Мин. ставка', dataIndex: 'min_bet', width: 100, render: (v: string) => v || '—' },
          {
            title: '',
            width: 100,
            align: 'right',
            render: (_: any, r: CasinoPromo) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={async () => {
                    try {
                      await deletePromo({ casinoId, id: r.id! }).unwrap();
                      message.success('Промо удалено');
                    } catch (e: any) {
                      message.error(e?.data?.error ?? 'Ошибка удаления');
                    }
                  }}
                />
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
              icon={editing ? <EditOutlined /> : <RocketOutlined />}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
                {editing ? 'Редактировать промо' : 'Новое промо'}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                {editing
                  ? 'Измените поля и сохраните. Новые картинки внизу прикрепятся при сохранении или кнопкой «Загрузить сейчас».'
                  : 'При нескольких GEO в одной форме создаётся отдельная запись на каждый рынок. Изображения — после сохранения.'}
              </Typography.Text>
            </div>
          </div>
        }
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end', rowGap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 160 }} onClick={() => form.submit()}>
              {editing ? 'Сохранить' : 'Создать промо'}
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
                GEO в режиме редактирования один. Чтобы продублировать промо на другой рынок, создайте новую запись с нужным GEO.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как создать промо"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorTextSecondary }}>
                <p style={{ margin: '0 0 10px' }}>
                  Укажите <strong>GEO</strong> (можно несколько — для каждого кода будет своя карточка), <strong>категорию</strong> и <strong>название</strong>. Тип и период помогут отличать турниры, акции и лотереи в таблице.
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Период</strong> — для «Фиксированные даты» выберите диапазон; для цикличных типов даты не обязательны.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Изображения</strong> — перетащите в рамку, Ctrl+V вне полей ввода или выберите файлы; они уйдут на сервер при сохранении.
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    <strong>Тип турнира</strong> — из справочника или новая строка (сохранится в списке типов).
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={true}>
          <PromoFormProfileCore geoOptions={geoOptions} editing={!!editing} />

          <Card
            size="small"
            title={
              <Space size={8}>
                <PictureOutlined style={{ color: token.colorPrimary }} />
                <span>Изображения промо</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 12 } }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              Файлы отправятся при нажатии «Создать промо» / «Сохранить». Перетащите в рамку, вставьте <Typography.Text keyboard>Ctrl+V</Typography.Text> (вне полей ввода или в области ниже) или выберите файлы.
            </Typography.Text>

            {editing && promoImages.length > 0 && (
              <Image.PreviewGroup>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Уже загружено
                </Typography.Text>
                <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                  {promoImages.map((img: CasinoPromoImage) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <Image
                        src={img.url}
                        alt={img.original_name || ''}
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        onClick={async () => {
                          try {
                            await deletePromoImage({ casinoId, promoId: editing.id!, imageId: img.id }).unwrap();
                            message.success('Удалено');
                          } catch (e: any) {
                            message.error(e?.data?.error ?? 'Ошибка');
                          }
                        }}
                      />
                    </div>
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}

            <PromoGalleryDropZone
              onAddFiles={(files) => {
                setPendingImages((prev) => [...prev, ...files]);
                if (files.length) message.success(`Добавлено файлов: ${files.length}`);
              }}
            />

            {pendingImages.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  К загрузке ({pendingImages.length}):
                </Typography.Text>
                <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
                  {pendingImages.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} style={{ position: 'relative' }}>
                      <img
                        src={pendingThumbUrls[idx] ?? ''}
                        alt={file.name}
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 0, right: 0 }}
                        onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                      />
                    </div>
                  ))}
                </Space>
                {editing?.id && (
                  <Button
                    style={{ marginTop: 8 }}
                    loading={uploading}
                    onClick={async () => {
                      if (!editing?.id || !pendingImages.length) return;
                      setUploading(true);
                      try {
                        await uploadPromoImages({ casinoId, promoId: editing.id, files: pendingImages }).unwrap();
                        setPendingImages([]);
                        message.success('Изображения загружены');
                      } catch (e: any) {
                        message.error(e?.data?.error ?? 'Ошибка');
                      } finally {
                        setUploading(false);
                      }
                    }}
                  >
                    Загрузить сейчас
                  </Button>
                )}
              </div>
            )}
          </Card>
        </Form>
      </Drawer>
    </>
  );
}
