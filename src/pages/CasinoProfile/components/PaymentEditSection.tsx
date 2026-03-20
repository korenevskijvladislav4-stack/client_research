import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
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
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  GlobalOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
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
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';

interface PaymentEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

function PaymentGalleryDropZone({ onAddFiles }: { onAddFiles: (files: File[]) => void }) {
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
      data-payment-gallery-drop=""
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
  const [pendingThumbUrls, setPendingThumbUrls] = useState<string[]>([]);
  const [activeDirection, setActiveDirection] = useState<'deposit' | 'withdrawal' | undefined>();
  const [aiDragOver, setAiDragOver] = useState(false);

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
    () =>
      [...(paymentTypes ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((t) => ({ value: t.name, label: t.name })),
    [paymentTypes],
  );
  const paymentMethodOptions = useMemo(
    () =>
      [...(paymentMethods ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((m) => ({ value: m.name, label: m.name })),
    [paymentMethods],
  );

  useEffect(() => {
    const urls = pendingImages.map((f) => URL.createObjectURL(f));
    setPendingThumbUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingImages]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setPendingImages([]);
    setAiDragOver(false);
    form.resetFields();
  };

  const handleAnalyzeImage = async (file: File) => {
    setPendingImages((prev) => [...prev, file]);
    const currentGeo = form.getFieldValue('geo');
    const geoVal = Array.isArray(currentGeo) ? currentGeo[currentGeo.length - 1] || currentGeo[0] : currentGeo;
    const direction = form.getFieldValue('direction') || 'deposit';
    try {
      const suggestions = await analyzePaymentImage({
        casinoId,
        geo: typeof geoVal === 'string' ? geoVal : undefined,
        direction,
        file,
      }).unwrap();

      if (!suggestions || Object.keys(suggestions).length === 0) {
        message.info('Не удалось распознать данные ПС с картинки');
        return;
      }

      const currentValues = form.getFieldsValue();
      const patch: Record<string, unknown> = {};
      const isEmpty = (val: unknown) =>
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0);

      if ((suggestions as any).type && isEmpty(currentValues.type)) {
        patch.type = [(suggestions as any).type];
      }
      if ((suggestions as any).method && isEmpty(currentValues.method)) {
        patch.method = [(suggestions as any).method];
      }

      const notesStr = String((suggestions as any).notes ?? '').trim();
      const noteLines = notesStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const bulletCount = (notesStr.match(/•/g) || []).length;
      const multiRowOrCryptoTable =
        noteLines.length >= 2 ||
        bulletCount >= 2 ||
        /криптовалют|несколько методов|см\. заметки/i.test(
          String((suggestions as any).method ?? '') + String((suggestions as any).type ?? ''),
        );

      const amountKeys: (keyof CasinoPayment)[] = ['min_amount', 'max_amount', 'currency'];
      const simpleKeys: (keyof CasinoPayment)[] = multiRowOrCryptoTable
        ? ['notes']
        : [...amountKeys, 'notes'];

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

  const analyzeImageRef = useRef<(file: File) => Promise<void>>(async () => {});
  analyzeImageRef.current = handleAnalyzeImage;

  useEffect(() => {
    if (!drawerOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (el?.closest?.('[data-payment-gallery-drop]')) return;
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void analyzeImageRef.current(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [drawerOpen]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ direction: 'deposit' });
    if (activeGeo) form.setFieldsValue({ geo: activeGeo });
    setPendingImages([]);
    setDrawerOpen(true);
  };

  const openEdit = (p: CasinoPayment) => {
    setEditing(p);
    form.resetFields();
    form.setFieldsValue({
      ...p,
      direction: p.direction ?? 'deposit',
      geo: [p.geo],
      type: p.type ? [p.type] : [],
      method: p.method ? [p.method] : [],
    });
    setPendingImages([]);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const geoVal = Array.isArray(values.geo) ? values.geo[values.geo.length - 1] || values.geo[0] : values.geo;
      const typeVal = Array.isArray(values.type) ? values.type[values.type.length - 1] || values.type[0] : values.type;
      const methodVal = Array.isArray(values.method)
        ? values.method[values.method.length - 1] || values.method[0]
        : values.method;
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить метод
        </Button>
      </div>

      <CasinoProfileTable<CasinoPayment>
        rowKey="id"
        loading={isLoading}
        dataSource={(payments ?? []).filter((p) => !activeDirection || (p.direction ?? 'deposit') === activeDirection)}
        columns={[
          {
            title: 'Напр.',
            dataIndex: 'direction',
            width: 90,
            render: (v: string) => (v === 'withdrawal' ? 'Выплата' : 'Депозит'),
          },
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Тип', dataIndex: 'type', width: 140 },
          { title: 'Метод', dataIndex: 'method', width: 140 },
          {
            title: 'Мин.',
            dataIndex: 'min_amount',
            width: 100,
            render: (v, r) => (v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—'),
          },
          {
            title: 'Макс.',
            dataIndex: 'max_amount',
            width: 100,
            render: (v, r) => (v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—'),
          },
          {
            title: '',
            width: 140,
            align: 'right',
            render: (_, p) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(p)}>
                  Изменить
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={async () => {
                    try {
                      await deletePayment({ casinoId, id: p.id }).unwrap();
                      message.success('Удалён');
                    } catch (e: any) {
                      message.error(e?.data?.error ?? 'Ошибка');
                    }
                  }}
                >
                  Удалить
                </Button>
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
              icon={editing ? <EditOutlined /> : <CreditCardOutlined />}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
                {editing ? 'Редактировать платёжный метод' : 'Новый платёжный метод'}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                {editing
                  ? 'Обновите поля и сохраните. Новые скриншоты внизу прикрепятся при сохранении.'
                  : 'Укажите направление, GEO, тип и метод. Можно начать со скриншота ПС — ИИ заполнит пустые поля.'}
              </Typography.Text>
            </div>
          </div>
        }
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end', rowGap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 180 }} onClick={() => form.submit()}>
              {editing ? 'Сохранить' : 'Создать метод'}
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
                Повторный анализ картинки дополняет только пустые поля. Лимиты и заметки проверьте перед сохранением.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как добавить платёжное решение"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorTextSecondary }}>
                <p style={{ margin: '0 0 10px' }}>
                  Выберите <strong>направление</strong> (депозит / выплата), <strong>GEO</strong>, затем <strong>тип</strong> и{' '}
                  <strong>метод</strong> из справочников или введите новые — они сохранятся в списках.
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>ИИ по скриншоту</strong> — перетащите изображение, Ctrl+V вне полей ввода или кнопка выбора;
                    картинка попадёт в очередь, поля заполнятся, если пусты.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Лимиты и валюта</strong> — необязательны; сложные таблицы лучше описать в заметках.
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    <strong>Изображения внизу</strong> — drag-and-drop, Ctrl+V в области галереи или кнопка; уходят на
                    сервер при сохранении.
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" form={form} initialValues={{ direction: 'deposit' }} onFinish={handleSubmit} requiredMark={true}>
          {/* ИИ */}
          <Card
            size="small"
            title={
              <Space size={8}>
                <RobotOutlined style={{ color: token.colorPrimary }} />
                <span>Заполнение по скриншоту (AI)</span>
              </Space>
            }
            style={{
              marginBottom: 16,
              borderStyle: 'dashed',
              borderColor: aiDragOver ? token.colorPrimary : token.colorBorderSecondary,
              background: aiDragOver ? token.colorPrimaryBg : undefined,
            }}
            styles={{ body: { paddingBottom: 12 } }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              Перетащите скрин ПС в рамку, вставьте <Typography.Text keyboard>Ctrl+V</Typography.Text> (вне полей ввода) или
              выберите файл. Для выплаты сначала выберите «Выплата» в блоке ниже — ИИ учитывает текущее направление в форме.
            </Typography.Text>
            <div
              role="button"
              tabIndex={0}
              style={{
                textAlign: 'center',
                padding: 16,
                borderRadius: token.borderRadiusLG,
                border: `1px dashed ${aiDragOver ? token.colorPrimary : token.colorBorder}`,
                background: token.colorFillAlter,
                cursor: 'pointer',
                outline: 'none',
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAiDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAiDragOver(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAiDragOver(true);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setAiDragOver(false);
                const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                if (files.length > 0) await handleAnalyzeImage(files[0]);
                else message.warning('Нужен файл изображения');
              }}
              onPaste={async (e) => {
                const items = Array.from(e.clipboardData.items || []);
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                      e.stopPropagation();
                      await handleAnalyzeImage(file);
                      break;
                    }
                  }
                }
              }}
            >
              <RobotOutlined style={{ fontSize: 32, color: token.colorTextQuaternary, marginBottom: 8 }} />
              <div style={{ lineHeight: 1.5 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Скриншот платёжного метода
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                  Отпустите файл здесь или нажмите кнопку
                </Typography.Text>
              </div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  await handleAnalyzeImage(file);
                  return false;
                }}
              >
                <Button type="primary" ghost icon={<RobotOutlined />} loading={analyzingImage} style={{ marginTop: 12 }}>
                  Выбрать картинку
                </Button>
              </Upload>
            </div>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <SwapDirTitle />
                <span>Направление и GEO</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 8 } }}
          >
            <Form.Item
              name="direction"
              label="Направление"
              rules={[{ required: true, message: 'Выберите направление' }]}
              extra="От этого зависит контекст для ИИ и отображение в таблице."
            >
              <Select
                size="large"
                options={[
                  {
                    value: 'deposit',
                    label: (
                      <Space size={8}>
                        <ArrowDownOutlined />
                        Депозит
                      </Space>
                    ),
                  },
                  {
                    value: 'withdrawal',
                    label: (
                      <Space size={8}>
                        <ArrowUpOutlined />
                        Выплата
                      </Space>
                    ),
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="geo"
              label="GEO"
              rules={[{ required: true, message: 'Укажите GEO' }]}
              extra="Новый код можно ввести вручную — он добавится в справочник GEO."
            >
              <Select
                mode="tags"
                placeholder="RU, DE, BR…"
                tokenSeparators={[',', ';', ' ']}
                options={geoOptions}
                suffixIcon={<GlobalOutlined style={{ color: token.colorTextQuaternary }} />}
                onChange={async (values: string[]) => {
                  if (!values?.length) return;
                  const codes = (geos ?? []).map((g) => g.code);
                  for (const v of values.map((x) => x.toUpperCase().trim()).filter((x) => x && !codes.includes(x))) {
                    try {
                      await createGeo({ code: v, name: v }).unwrap();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <CreditCardOutlined style={{ color: token.colorPrimary }} />
                <span>Тип и метод</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 8 } }}
          >
            <Form.Item
              name="type"
              label="Тип"
              rules={[{ required: true, message: 'Укажите тип' }]}
              extra="Например: банковская карта, криптовалюта, кошелёк. Новое значение попадёт в справочник типов."
            >
              <Select
                mode="tags"
                maxCount={1}
                placeholder="Выберите или введите"
                options={paymentTypeOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                onChange={async (values: string[]) => {
                  if (!values?.length) return;
                  const existing = (paymentTypes ?? []).map((t) => t.name);
                  for (const name of values.filter((v) => v && !existing.includes(v))) {
                    try {
                      await createPaymentType({ name }).unwrap();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="method"
              label="Метод"
              rules={[{ required: true, message: 'Укажите метод' }]}
              extra="Конкретная ПС или сеть. Новое имя сохранится в справочнике методов."
            >
              <Select
                mode="tags"
                maxCount={1}
                placeholder="Выберите или введите"
                options={paymentMethodOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                onChange={async (values: string[]) => {
                  if (!values?.length) return;
                  const existing = (paymentMethods ?? []).map((m) => m.name);
                  for (const name of values.filter((v) => v && !existing.includes(v))) {
                    try {
                      await createPaymentMethod({ name }).unwrap();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <DollarOutlined style={{ color: token.colorPrimary }} />
                <span>Лимиты</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 8 } }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Form.Item name="min_amount" label="Мин. сумма" required={false}>
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="max_amount" label="Макс. сумма" required={false}>
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="Без лимита" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="currency" label="Валюта" required={false}>
                  <Input placeholder="RUB, EUR…" allowClear prefix={<DollarOutlined style={{ color: token.colorTextQuaternary }} />} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            size="small"
            title={<Typography.Text strong>Заметки</Typography.Text>}
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
          >
            <Form.Item
              name="notes"
              label="Текст"
              required={false}
              style={{ marginBottom: 0 }}
              extra="Комиссии, сроки, особые условия, ссылки на правила."
            >
              <Input.TextArea rows={3} placeholder="Дополнительные условия…" />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space size={8}>
                <PictureOutlined style={{ color: token.colorPrimary }} />
                <span>Изображения</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 12 } }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              Файлы отправятся при сохранении. Перетащите в рамку, вставьте <Typography.Text keyboard>Ctrl+V</Typography.Text> в
              области ниже (или вне полей — для галереи) или выберите файлы.
            </Typography.Text>
            {editing && paymentImages.length > 0 && (
              <Image.PreviewGroup>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Уже загружено
                </Typography.Text>
                <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                  {paymentImages.map((img: CasinoPaymentImage) => (
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
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        onClick={async () => {
                          try {
                            await deletePaymentImage({ casinoId, paymentId: editing.id, imageId: img.id }).unwrap();
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
            <PaymentGalleryDropZone
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
              </div>
            )}
          </Card>
        </Form>
      </Drawer>
    </>
  );
}

function SwapDirTitle() {
  return (
    <span style={{ display: 'inline-flex', gap: 6, color: 'inherit' }}>
      <ArrowDownOutlined />
      <ArrowUpOutlined />
    </span>
  );
}
