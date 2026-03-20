import { useState, useMemo } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import { DeleteOutlined, PictureOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import {
  useGetCasinoPaymentsQuery,
  useCreateCasinoPaymentMutation,
  useUpdateCasinoPaymentMutation,
  useDeleteCasinoPaymentMutation,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  useDeletePaymentImageMutation,
  useAnalyzePaymentImageMutation,
  CasinoPayment,
  CasinoPaymentImage,
} from '../../../store/api/casinoPaymentApi';
import {
  useGetPaymentTypesQuery,
  useCreatePaymentTypeMutation,
  useGetPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
} from '../../../store/api/referenceApi';
import { useGetGeosQuery, useCreateGeoMutation } from '../../../store/api/geoApi';

interface PaymentEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

export default function PaymentEditSection({ casinoId, activeGeo, geoOptions }: PaymentEditSectionProps) {
  const { token } = theme.useToken();
  const { data: payments, isLoading } = useGetCasinoPaymentsQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as any,
  );
  const [createPayment] = useCreateCasinoPaymentMutation();
  const [updatePayment] = useUpdateCasinoPaymentMutation();
  const [deletePayment] = useDeleteCasinoPaymentMutation();

  const [analyzePaymentImage, { isLoading: analyzingImage }] = useAnalyzePaymentImageMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CasinoPayment | null>(null);
  const [form] = Form.useForm();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [activeDirection, setActiveDirection] = useState<'deposit' | 'withdrawal' | undefined>();

  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId, paymentId: editing?.id ?? 0 },
    { skip: !editing?.id || !casinoId },
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();
  const [deletePaymentImage] = useDeletePaymentImageMutation();

  const { data: paymentTypes } = useGetPaymentTypesQuery();
  const [createPaymentType] = useCreatePaymentTypeMutation();
  const { data: paymentMethods } = useGetPaymentMethodsQuery();
  const [createPaymentMethod] = useCreatePaymentMethodMutation();
  const { data: geos } = useGetGeosQuery();
  const [createGeo] = useCreateGeoMutation();

  const paymentTypeOptions = useMemo(
    () => (paymentTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [paymentTypes],
  );
  const paymentMethodOptions = useMemo(
    () => (paymentMethods ?? []).map((m) => ({ value: m.name, label: m.name })),
    [paymentMethods],
  );

  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); setPendingImages([]); };

  const handleAnalyzeImage = async (file: File) => {
    setPendingImages((prev) => [...prev, file]);
    const currentGeo = form.getFieldValue('geo');
    const geoVal = Array.isArray(currentGeo) ? currentGeo[currentGeo.length - 1] || currentGeo[0] : currentGeo;
    const direction = form.getFieldValue('direction') || 'deposit';
    try {
      const raw = await analyzePaymentImage({
        casinoId,
        geo: typeof geoVal === 'string' ? geoVal : undefined,
        direction,
        file,
      }).unwrap();

      const suggestions = Array.isArray(raw) ? raw[0] : raw;
      if (!suggestions || Object.keys(suggestions).length === 0) {
        message.info('Не удалось распознать данные ПС с картинки');
        return;
      }

      const currentValues = form.getFieldsValue();
      const patch: Record<string, unknown> = {};
      const isEmpty = (val: unknown) =>
        val === undefined || val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0);

      if ((suggestions as any).type && isEmpty(currentValues.type)) {
        patch.type = [(suggestions as any).type];
      }
      if ((suggestions as any).method && isEmpty(currentValues.method)) {
        patch.method = [(suggestions as any).method];
      }

      const simpleKeys: (keyof CasinoPayment)[] = [
        'min_amount', 'max_amount', 'currency', 'notes',
      ];
      simpleKeys.forEach((key) => {
        const value = (suggestions as any)[key];
        if (value === undefined || value === null) return;
        if (isEmpty((currentValues as any)[key])) patch[key] = value;
      });

      if (Object.keys(patch).length > 0) form.setFieldsValue(patch);
      message.success('Поля ПС заполнены по картинке');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось распознать ПС по картинке');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (activeGeo) form.setFieldsValue({ geo: activeGeo });
    setDrawerOpen(true);
  };

  const openEdit = (p: CasinoPayment) => {
    setEditing(p);
    form.setFieldsValue({
      ...p,
      direction: p.direction ?? 'deposit',
      geo: [p.geo],
      type: p.type ? [p.type] : [],
      method: p.method ? [p.method] : [],
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const geoVal = Array.isArray(values.geo) ? values.geo[values.geo.length - 1] || values.geo[0] : values.geo;
      const typeVal = Array.isArray(values.type) ? values.type[values.type.length - 1] || values.type[0] : values.type;
      const methodVal = Array.isArray(values.method) ? values.method[values.method.length - 1] || values.method[0] : values.method;
      const payload = {
        ...values,
        geo: geoVal,
        direction: values.direction === 'withdrawal' ? 'withdrawal' : 'deposit',
        type: typeVal,
        method: methodVal,
      };

      let saved: CasinoPayment;
      if (editing) {
        saved = await updatePayment({ casinoId, id: editing.id, patch: payload }).unwrap();
        message.success('Метод обновлён');
      } else {
        saved = await createPayment({ casinoId, ...payload }).unwrap();
        message.success('Метод создан');
      }

      if (pendingImages.length > 0 && saved.id) {
        try {
          await uploadPaymentImages({ casinoId, paymentId: saved.id, files: pendingImages }).unwrap();
        } catch (e: any) {
          message.error(e?.data?.error ?? 'Ошибка загрузки изображений');
        } finally {
          setPendingImages([]);
        }
      }
      closeDrawer();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения метода');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Select
          style={{ minWidth: 160 }}
          allowClear
          placeholder="Все направления"
          value={activeDirection}
          options={[
            { value: 'deposit', label: 'Депозит' },
            { value: 'withdrawal', label: 'Выплата' },
          ]}
          onChange={(val) => setActiveDirection(val)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить метод</Button>
      </div>

      <Table<CasinoPayment>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={(payments ?? []).filter((p) => !activeDirection || (p.direction ?? 'deposit') === activeDirection)}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Напр.', dataIndex: 'direction', width: 90, render: (v: string) => v === 'withdrawal' ? 'Выплата' : 'Депозит' },
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Тип', dataIndex: 'type', width: 140 },
          { title: 'Метод', dataIndex: 'method', width: 140 },
          {
            title: 'Мин.', dataIndex: 'min_amount', width: 100,
            render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
          },
          {
            title: 'Макс.', dataIndex: 'max_amount', width: 100,
            render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
          },
          {
            title: '', width: 140, align: 'right',
            render: (_, p) => (
              <Space>
                <Button size="small" onClick={() => openEdit(p)}>Редактировать</Button>
                <Button size="small" danger
                  onClick={async () => {
                    try { await deletePayment({ casinoId, id: p.id }).unwrap(); message.success('Удалён'); }
                    catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
                  }}
                >Удалить</Button>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? 'Редактировать платёжный метод' : 'Новый платёжный метод'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={540}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Сохранить' : 'Создать'}</Button>
          </div>
        }
      >
        <Form layout="vertical" form={form} initialValues={{ direction: 'deposit' }} onFinish={handleSubmit}>
          {/* AI Auto-fill */}
          <Card size="small" style={{ marginBottom: 16, borderStyle: 'dashed' }}>
            <div
              style={{ textAlign: 'center', padding: 8 }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault(); e.stopPropagation();
                const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                if (files.length > 0) await handleAnalyzeImage(files[0]);
              }}
              onPaste={async (e) => {
                const items = Array.from(e.clipboardData.items || []);
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) { await handleAnalyzeImage(file); break; }
                  }
                }
              }}
            >
              <RobotOutlined style={{ fontSize: 20, color: token.colorPrimary, marginBottom: 4 }} />
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Перетащите скриншот ПС — AI заполнит форму автоматически.
                  <br />
                  Сначала выберите направление (депозит / выплата) ниже, если нужно не «Депозит».
                </Typography.Text>
              </div>
              <Upload accept="image/*" showUploadList={false}
                beforeUpload={async (file) => { await handleAnalyzeImage(file); return false; }}
              >
                <Button size="small" icon={<RobotOutlined />} loading={analyzingImage} style={{ marginTop: 8 }}>
                  Выбрать картинку
                </Button>
              </Upload>
            </div>
          </Card>

          <Form.Item name="direction" label="Направление" rules={[{ required: true }]}>
            <Select options={[
              { value: 'deposit', label: 'Депозит' },
              { value: 'withdrawal', label: 'Выплата' },
            ]} />
          </Form.Item>

          <Form.Item name="geo" label="GEO" rules={[{ required: true, message: 'Укажите GEO' }]}>
            <Select mode="tags" placeholder="RU, DE, BR..." tokenSeparators={[',', ';', ' ']} options={geoOptions}
              onChange={async (values: string[]) => {
                if (!values?.length) return;
                const codes = (geos ?? []).map((g) => g.code);
                for (const v of values.map((v) => v.toUpperCase().trim()).filter((v) => v && !codes.includes(v))) {
                  try { await createGeo({ code: v, name: v }).unwrap(); } catch {}
                }
              }}
            />
          </Form.Item>

          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Select mode="tags" maxCount={1} placeholder="Выберите или введите" options={paymentTypeOptions}
              onChange={async (values: string[]) => {
                if (!values?.length) return;
                const existing = (paymentTypes ?? []).map((t) => t.name);
                for (const name of values.filter((v) => v && !existing.includes(v))) {
                  try { await createPaymentType({ name }).unwrap(); } catch {}
                }
              }}
            />
          </Form.Item>

          <Form.Item name="method" label="Метод" rules={[{ required: true }]}>
            <Select mode="tags" maxCount={1} placeholder="Выберите или введите" options={paymentMethodOptions}
              onChange={async (values: string[]) => {
                if (!values?.length) return;
                const existing = (paymentMethods ?? []).map((m) => m.name);
                for (const name of values.filter((v) => v && !existing.includes(v))) {
                  try { await createPaymentMethod({ name }).unwrap(); } catch {}
                }
              }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}><Form.Item name="min_amount" label="Мин. сумма"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="max_amount" label="Макс. сумма"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="currency" label="Валюта"><Input placeholder="RUB" /></Form.Item></Col>
          </Row>

          <Form.Item name="notes" label="Заметки"><Input.TextArea rows={3} /></Form.Item>

          {/* Images */}
          <Card size="small" title="Изображения" style={{ marginBottom: 16 }}>
            {editing && paymentImages.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                  {paymentImages.map((img: CasinoPaymentImage) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <Image src={img.url} alt={img.original_name || ''} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        onClick={async () => {
                          try { await deletePaymentImage({ casinoId, paymentId: editing.id, imageId: img.id }).unwrap(); message.success('Удалено'); }
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
              </div>
            )}
          </Card>
        </Form>
      </Drawer>
    </>
  );
}
