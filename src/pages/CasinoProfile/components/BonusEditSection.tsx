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
  Typography,
  Upload,
  message,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  GiftOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  useGetCasinoBonusesQuery,
  useCreateCasinoBonusMutation,
  useUpdateCasinoBonusMutation,
  useDeleteCasinoBonusMutation,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  useDeleteBonusImageMutation,
  useAnalyzeBonusImageMutation,
  CasinoBonus,
  BonusCategory,
  BonusKind,
  BonusType,
  CasinoBonusImage,
} from '../../../store/api/casinoBonusApi';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';
import { BonusFormProfileCore } from '../../../components/casinoForms/BonusFormProfileCore';

interface BonusEditSectionProps {
  casinoId: number;
  activeGeo?: string;
  geoOptions: { value: string; label: string }[];
}

const fmt = (n: unknown) => {
  const num = Number(n);
  if (isNaN(num)) return n;
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};

const fmtAmount = (value: unknown, currency?: string | null) => {
  if (value == null) return '—';
  const formatted = fmt(value);
  return currency ? `${formatted} ${currency}` : formatted;
};

function GalleryDropZone({ onAddFiles }: { onAddFiles: (files: File[]) => void }) {
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
      data-bonus-gallery-drop=""
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

export default function BonusEditSection({ casinoId, activeGeo, geoOptions }: BonusEditSectionProps) {
  const { token } = theme.useToken();
  const { data: bonuses, isLoading: bonusesLoading } = useGetCasinoBonusesQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId } as any,
  );
  const [createBonus] = useCreateCasinoBonusMutation();
  const [updateBonus] = useUpdateCasinoBonusMutation();
  const [deleteBonus] = useDeleteCasinoBonusMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<CasinoBonus | null>(null);
  const [bonusForm] = Form.useForm();
  const [bonusCategory, setBonusCategory] = useState<BonusCategory>('casino');
  const [selectedBonusKind, setSelectedBonusKind] = useState<BonusKind | undefined>();
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | undefined>();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [analyzeBonusImage, { isLoading: analyzingImage }] = useAnalyzeBonusImageMutation();

  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: editingBonus?.id ?? 0 },
    { skip: !editingBonus?.id || !casinoId },
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();
  const [deleteBonusImage] = useDeleteBonusImageMutation();

  const closeDrawer = () => {
    setDrawerOpen(false);
    setBonusCategory('casino');
    setSelectedBonusKind(undefined);
    setSelectedBonusType(undefined);
    setEditingBonus(null);
    setPendingImages([]);
  };

  const openCreate = () => {
    setEditingBonus(null);
    bonusForm.resetFields();
    if (activeGeo) bonusForm.setFieldsValue({ geo: activeGeo });
    setDrawerOpen(true);
  };

  const openEdit = (b: CasinoBonus) => {
    setEditingBonus(b);
    setBonusCategory(b.bonus_category || 'casino');
    setSelectedBonusKind(b.bonus_kind);
    setSelectedBonusType(b.bonus_type);
    bonusForm.setFieldsValue({
      ...b,
      geo: [b.geo],
      name: b.name ? [b.name] : [],
      bonus_category: b.bonus_category || 'casino',
    });
    setDrawerOpen(true);
  };

  const handleAnalyzeImage = async (file: File) => {
    setPendingImages((prev) => [...prev, file]);
    const currentGeo = bonusForm.getFieldValue('geo');
    const geoVal = Array.isArray(currentGeo) ? currentGeo[currentGeo.length - 1] || currentGeo[0] : currentGeo;
    try {
      const suggestions = await analyzeBonusImage({
        casinoId,
        geo: typeof geoVal === 'string' ? geoVal : undefined,
        file,
      }).unwrap();

      if (!suggestions || Object.keys(suggestions).length === 0) {
        message.info('Не удалось распознать данные бонуса с картинки');
        return;
      }

      const currentValues = bonusForm.getFieldsValue();
      const patch: Record<string, unknown> = {};
      const isEmpty = (val: unknown) =>
        val === undefined || val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0);

      if ((suggestions as any).name && isEmpty(currentValues.name)) {
        patch.name = [(suggestions as any).name];
      }

      const simpleKeys: (keyof CasinoBonus)[] = [
        'bonus_category', 'bonus_kind', 'bonus_type', 'bonus_value', 'bonus_unit',
        'currency', 'freespins_count', 'freespin_value', 'freespin_game',
        'cashback_percent', 'cashback_period', 'min_deposit', 'max_bonus',
        'max_cashout', 'max_win_cash_value', 'max_win_cash_unit',
        'max_win_freespin_value', 'max_win_freespin_unit',
        'max_win_percent_value', 'max_win_percent_unit',
        'wagering_requirement', 'wagering_freespin', 'wagering_games',
        'wagering_time_limit', 'promo_code', 'valid_from', 'valid_to', 'notes',
      ];

      simpleKeys.forEach((key) => {
        const value = (suggestions as any)[key];
        if (value === undefined || value === null) return;
        if (isEmpty((currentValues as any)[key])) patch[key] = value;
      });

      if (Object.keys(patch).length > 0) bonusForm.setFieldsValue(patch);
      if ((suggestions as any).bonus_category) setBonusCategory((suggestions as any).bonus_category);
      if ((suggestions as any).bonus_kind) setSelectedBonusKind((suggestions as any).bonus_kind);
      if ((suggestions as any).bonus_type) setSelectedBonusType((suggestions as any).bonus_type);
      message.success('Поля бонуса заполнены по картинке');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Не удалось распознать бонус по картинке');
    }
  };

  const analyzeImageRef = useRef<(file: File) => Promise<void>>(async () => {});
  analyzeImageRef.current = handleAnalyzeImage;

  /** Ctrl+V с картинкой по всей панели (не перехватываем ввод в полях). */
  useEffect(() => {
    if (!drawerOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (el?.closest?.('[data-bonus-gallery-drop]')) return;
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

  const [pendingThumbUrls, setPendingThumbUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = pendingImages.map((f) => URL.createObjectURL(f));
    setPendingThumbUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingImages]);

  const [aiDragOver, setAiDragOver] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      const geoVal = Array.isArray(values.geo) ? values.geo[values.geo.length - 1] || values.geo[0] : values.geo;
      const nameVal = Array.isArray(values.name) ? values.name[values.name.length - 1] || values.name[0] : values.name;
      const payload = { ...values, geo: geoVal, name: nameVal, bonus_category: bonusCategory };

      let savedBonus: CasinoBonus;
      if (editingBonus) {
        savedBonus = await updateBonus({ casinoId, id: editingBonus.id, patch: payload }).unwrap();
        message.success('Бонус обновлён');
      } else {
        savedBonus = await createBonus({ casinoId, ...payload }).unwrap();
        message.success('Бонус создан');
      }

      if (pendingImages.length > 0 && savedBonus.id) {
        try {
          await uploadBonusImages({ casinoId, bonusId: savedBonus.id, files: pendingImages }).unwrap();
        } catch (e: any) {
          message.error(e?.data?.error ?? 'Ошибка загрузки изображений бонуса');
        } finally {
          setPendingImages([]);
        }
      }
      closeDrawer();
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения бонуса');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить бонус
        </Button>
      </div>

      <CasinoProfileTable<CasinoBonus>
        rowKey="id"
        loading={bonusesLoading}
        dataSource={bonuses ?? []}
        scroll={{ x: 800 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Название', dataIndex: 'name', width: 160, ellipsis: true },
          {
            title: 'Категория', dataIndex: 'bonus_category', width: 80,
            render: (v: string) => ({ casino: 'Казино', sport: 'Спорт' }[v as 'casino' | 'sport'] || v || 'Казино'),
          },
          {
            title: 'Вид', dataIndex: 'bonus_kind', width: 90,
            render: (v: BonusKind) => ({ deposit: 'Депозит', nodeposit: 'Бездеп', cashback: 'Кешбек', rakeback: 'Рейкбек' }[v] || v || '—'),
          },
          {
            title: 'Тип', dataIndex: 'bonus_type', width: 90,
            render: (v: BonusType) => ({
              cash: 'Кэш', freespin: 'FS', combo: 'Комбо', freebet: 'Фрибет',
              wagering: 'Вейджеринг', insurance: 'Страховка', accumulator: 'Аккумулятор', odds_boost: 'Повышение коэф.',
            }[v] || v || '—'),
          },
          {
            title: 'Бонус', width: 120,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.bonus_value != null) {
                parts.push(b.bonus_unit === 'percent' ? `${fmt(b.bonus_value)}%` : (b.currency ? `${fmt(b.bonus_value)} ${b.currency}` : `${fmt(b.bonus_value)}`));
              }
              if (b.freespins_count) parts.push(`${fmt(b.freespins_count)} FS`);
              if (b.cashback_percent_min != null || b.cashback_percent_max != null) {
                const from = b.cashback_percent_min != null ? fmt(b.cashback_percent_min) : null;
                const to = b.cashback_percent_max != null ? fmt(b.cashback_percent_max) : null;
                if (from != null && to != null) parts.push(`${from}–${to}%`);
                else if (from != null) parts.push(`${from}%`);
                else if (to != null) parts.push(`${to}%`);
              } else if (b.cashback_percent != null) {
                parts.push(`${fmt(b.cashback_percent)}%`);
              }
              return parts.length > 0 ? parts.join('+') : '—';
            },
          },
          { title: 'Мин.', width: 80, render: (_, b) => fmtAmount(b.min_deposit, b.currency) as React.ReactNode },
          {
            title: 'Вейджер', width: 100,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.wagering_requirement != null) parts.push(`кэш x${fmt(b.wagering_requirement)}`);
              if (b.wagering_freespin != null) parts.push(`FS x${fmt(b.wagering_freespin)}`);
              return parts.length > 0 ? parts.join(', ') : '—';
            },
          },
          {
            title: '', width: 100, align: 'right',
            render: (_, b) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(b)} />
                <Button type="link" size="small" danger icon={<DeleteOutlined />}
                  onClick={async () => {
                    try { await deleteBonus({ casinoId, id: b.id }).unwrap(); message.success('Бонус удалён'); }
                    catch (e: any) { message.error(e?.data?.error ?? 'Ошибка удаления'); }
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
                background: editingBonus ? token.colorWarning : token.colorPrimary,
                flexShrink: 0,
              }}
              icon={editingBonus ? <EditOutlined /> : <GiftOutlined />}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
                {editingBonus ? 'Редактировать бонус' : 'Новый бонус'}
              </Typography.Title>
              <Typography.Text
                type="secondary"
                style={{ display: 'block', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}
              >
                {editingBonus
                  ? 'Измените условия и сохраните. Картинки внизу — превью галереи и новые файлы к загрузке.'
                  : 'Заполните вручную или начните с картинки промо — AI подставит поля. Сохранение прикрепит выбранные изображения.'}
              </Typography.Text>
            </div>
          </div>
        }
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end', rowGap: 8 }}>
            <Button onClick={closeDrawer}>Отмена</Button>
            <Button type="primary" style={{ minWidth: 160 }} onClick={() => bonusForm.submit()}>
              {editingBonus ? 'Сохранить' : 'Создать бонус'}
            </Button>
          </Space>
        }
      >
        {editingBonus ? (
          <Alert
            type="info"
            showIcon
            icon={<EditOutlined />}
            message="Редактирование"
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
                Поля ниже отражают текущее предложение. Для массового ввода удобнее сначала картинку в блоке AI — тогда пустые поля заполнятся автоматически.
              </Typography.Text>
            }
            style={{ marginBottom: 20 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Как создать бонус"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorTextSecondary }}>
                <p style={{ margin: '0 0 10px' }}>
                  Укажите GEO и название, выберите <strong>казино</strong> или <strong>спорт</strong>, затем вид и тип — от этого зависят поля сумм и вейджера.
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>AI по картинке</strong> — перетащите скрин промо, вставьте Ctrl+V (вне полей ввода) или выберите файл; модель заполнит пустые поля, картинка попадёт в очередь загрузки.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>GEO и валюта</strong> — рынок и валюта отображения сумм.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>Название</strong> — из справочника или новое (создастся в списке названий).
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    <strong>Изображения внизу</strong> — drag-and-drop, Ctrl+V в области или кнопка; файлы прикрепятся при нажатии «Создать бонус».
                  </li>
                </ul>
              </div>
            }
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" form={bonusForm} onFinish={handleSubmit} requiredMark={true}>
          {/* AI Auto-fill */}
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
              borderColor: aiDragOver ? token.colorPrimary : token.colorBorderSecondary,
              background: aiDragOver ? token.colorPrimaryBg : undefined,
            }}
            styles={{ body: { paddingBottom: 12 } }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              Перетащите изображение промо в рамку, вставьте <Typography.Text keyboard>Ctrl+V</Typography.Text> (фокус на рамке или в любой зоне панели вне полей) или выберите файл. Пустые поля формы дополнятся распознанными значениями.
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
                  Картинка бонуса
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                  Отпустите файл здесь или нажмите кнопку ниже
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

          <BonusFormProfileCore
            form={bonusForm}
            bonusCategory={bonusCategory}
            setBonusCategory={setBonusCategory}
            selectedBonusKind={selectedBonusKind}
            setSelectedBonusKind={setSelectedBonusKind}
            selectedBonusType={selectedBonusType}
            setSelectedBonusType={setSelectedBonusType}
            geoOptions={geoOptions}
          />


          {/* Images */}
          <Card
            size="small"
            title={
              <Space size={8}>
                <PictureOutlined style={{ color: token.colorPrimary }} />
                <span>Изображения бонуса</span>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: token.colorBorderSecondary }}
            styles={{ body: { paddingBottom: 12 } }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              Файлы отправятся на сервер при сохранении бонуса. Перетащите в рамку, нажмите на рамку и вставьте <Typography.Text keyboard>Ctrl+V</Typography.Text> или выберите несколько файлов.
            </Typography.Text>
            {editingBonus && bonusImages.length > 0 && (
              <Image.PreviewGroup>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Уже загружено
                </Typography.Text>
                <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                  {bonusImages.map((img: CasinoBonusImage) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <Image src={img.url} alt={img.original_name || ''} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        onClick={async () => {
                          try {
                            await deleteBonusImage({ casinoId, bonusId: editingBonus.id, imageId: img.id }).unwrap();
                            message.success('Удалено');
                          } catch (e: any) {
                            message.error(e?.data?.error ?? 'Ошибка удаления');
                          }
                        }}
                      />
                    </div>
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}
            <GalleryDropZone
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
