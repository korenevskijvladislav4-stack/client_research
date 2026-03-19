import { useState, useMemo } from 'react';
import {
  Button,
  Col,
  DatePicker,
  Drawer,
  Form,
  Image,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import { DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
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
import {
  useGetPromoTypesQuery,
  useCreatePromoTypeMutation,
} from '../../../store/api/referenceApi';
import dayjs from 'dayjs';

interface PromoEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
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
  const [uploading, setUploading] = useState(false);

  const { data: promoImages = [] } = useGetPromoImagesQuery(
    { casinoId, promoId: editing?.id ?? 0 },
    { skip: !editing?.id || !casinoId },
  );
  const [uploadPromoImages] = useUploadPromoImagesMutation();
  const [deletePromoImage] = useDeletePromoImageMutation();

  const { data: promoTypes } = useGetPromoTypesQuery();
  const [createPromoType] = useCreatePromoTypeMutation();

  const promoTypeOptions = useMemo(
    () => (promoTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [promoTypes],
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setPendingImages([]);
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
      const promoTypeValue = Array.isArray(values.promo_type) ? (values.promo_type[0] ?? null) : (values.promo_type ?? null);
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
      form.resetFields();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения промо');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить промо</Button>
      </div>

      <Table<CasinoPromo>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={promos ?? []}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          {
            title: 'Категория', dataIndex: 'promo_category', width: 110,
            render: (v: PromoCategory) => (
              <Tag color={v === 'tournament' ? 'blue' : v === 'promotion' ? 'purple' : 'gold'}>
                {v === 'tournament' ? 'Турнир' : v === 'promotion' ? 'Акция' : 'Лотерея'}
              </Tag>
            ),
          },
          { title: 'Тип', dataIndex: 'promo_type', width: 110, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Название', dataIndex: 'name', width: 180, ellipsis: true },
          {
            title: 'Период', width: 150,
            render: (_: any, r: CasinoPromo) => {
              if (!r.period_start && !r.period_end) return '—';
              return `${r.period_start ? dayjs(r.period_start).format('DD.MM.YY') : '?'} – ${r.period_end ? dayjs(r.period_end).format('DD.MM.YY') : '?'}`;
            },
          },
          { title: 'Провайдер', dataIndex: 'provider', width: 120, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Общий ПФ', dataIndex: 'prize_fund', width: 100, ellipsis: true, render: (v: string) => v || '—' },
          { title: 'Мин. ставка', dataIndex: 'min_bet', width: 100, render: (v: string) => v || '—' },
          {
            title: '', width: 100, align: 'right',
            render: (_: any, r: CasinoPromo) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Button type="link" size="small" danger icon={<DeleteOutlined />}
                  onClick={async () => {
                    try { await deletePromo({ casinoId, id: r.id! }).unwrap(); message.success('Промо удалено'); }
                    catch (e: any) { message.error(e?.data?.error ?? 'Ошибка удаления'); }
                  }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? 'Редактировать промо' : 'Новое промо'}
        width={560}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Сохранить' : 'Создать'}</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Выберите GEO' }]}>
            <Select mode="tags" placeholder="Выберите GEO" options={geoOptions} maxCount={editing ? 1 : undefined} />
          </Form.Item>

          <Form.Item name="promo_category" label="Категория" initialValue="tournament">
            <Select options={[
              { value: 'tournament', label: 'Турнир' },
              { value: 'promotion', label: 'Акция' },
              { value: 'lottery', label: 'Лотерея' },
            ]} />
          </Form.Item>

          <Form.Item name="promo_type" label="Тип турнира">
            <Select mode="tags" maxCount={1} placeholder="Выберите или введите" options={promoTypeOptions}
              onChange={async (values: string[]) => {
                if (!values?.length) return;
                const existing = (promoTypes ?? []).map((t) => t.name);
                for (const name of values.filter((v) => v && !existing.includes(v))) {
                  try { await createPromoType({ name }).unwrap(); } catch {}
                }
              }}
            />
          </Form.Item>

          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="period_type" label="Тип периода" initialValue="fixed">
            <Select options={[
              { value: 'daily', label: 'Ежедневный' },
              { value: 'weekly', label: 'Еженедельный' },
              { value: 'monthly', label: 'Ежемесячный' },
              { value: 'fixed', label: 'Фиксированные даты' },
            ]} />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, next) => prev.period_type !== next.period_type}>
            {({ getFieldValue }) =>
              getFieldValue('period_type') === 'fixed' && (
                <Form.Item name="period" label="Период проведения">
                  <DatePicker.RangePicker style={{ width: '100%' }} />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="provider" label="Провайдер"><Input /></Form.Item>

          <Row gutter={12}>
            <Col span={12}><Form.Item name="prize_fund" label="Общий ПФ"><Input placeholder="100 000 EUR" /></Form.Item></Col>
            <Col span={12}><Form.Item name="min_bet" label="Мин. ставка"><Input placeholder="0.5 EUR" /></Form.Item></Col>
          </Row>

          <Form.Item name="mechanics" label="Механика"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="wagering_prize" label="Вейджер на приз"><Input placeholder="x30" /></Form.Item>

          <Form.Item name="status" label="Статус" initialValue="active">
            <Select options={[
              { value: 'active', label: 'Активен' },
              { value: 'paused', label: 'Пауза' },
              { value: 'expired', label: 'Истёк' },
              { value: 'draft', label: 'Черновик' },
            ]} />
          </Form.Item>

          <Form.Item name="has_participation_button" label="Кнопка для участия" valuePropName="checked">
            <Switch />
          </Form.Item>

          {/* Images */}
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Изображения</Typography.Text>

          {editing && promoImages.length > 0 && (
            <Image.PreviewGroup>
              <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                {promoImages.map((img: CasinoPromoImage) => (
                  <div key={img.id} style={{ position: 'relative' }}>
                    <Image src={img.url} alt={img.original_name || ''} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 2, right: 2 }}
                      onClick={async () => {
                        try { await deletePromoImage({ casinoId, promoId: editing.id!, imageId: img.id }).unwrap(); message.success('Удалено'); }
                        catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
                      }}
                    />
                  </div>
                ))}
              </Space>
            </Image.PreviewGroup>
          )}

          <div
            style={{ border: `2px dashed ${token.colorBorder}`, borderRadius: 6, padding: 12, textAlign: 'center' }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
              if (files.length > 0) setPendingImages((prev) => [...prev, ...files]);
            }}
            onPaste={(e) => {
              const files: File[] = [];
              for (const item of Array.from(e.clipboardData.items || [])) {
                if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) files.push(f); }
              }
              if (files.length > 0) setPendingImages((prev) => [...prev, ...files]);
            }}
          >
            <PictureOutlined style={{ fontSize: 20, color: token.colorTextTertiary }} />
            <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Drag & Drop / Ctrl+V / кнопка</Typography.Text></div>
            <Upload multiple accept="image/*" showUploadList={false}
              beforeUpload={(file) => { setPendingImages((prev) => [...prev, file]); return false; }}
            >
              <Button size="small" icon={<PictureOutlined />} style={{ marginTop: 6 }}>Выбрать</Button>
            </Upload>
          </div>

          {pendingImages.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong style={{ fontSize: 12 }}>К загрузке ({pendingImages.length}):</Typography.Text>
              <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
                {pendingImages.map((file, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={URL.createObjectURL(file)} alt={file.name} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 0, right: 0 }}
                      onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  </div>
                ))}
              </Space>
              {editing?.id && (
                <Button style={{ marginTop: 8 }} loading={uploading}
                  onClick={async () => {
                    if (!editing?.id || !pendingImages.length) return;
                    setUploading(true);
                    try {
                      await uploadPromoImages({ casinoId, promoId: editing.id, files: pendingImages }).unwrap();
                      setPendingImages([]);
                      message.success('Изображения загружены');
                    } catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
                    finally { setUploading(false); }
                  }}
                >Загрузить сейчас</Button>
              )}
            </div>
          )}
        </Form>
      </Drawer>
    </>
  );
}
