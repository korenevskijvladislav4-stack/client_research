import { useState, useMemo, useRef } from 'react';
import {
  Button,
  Card,
  Drawer,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  useGetCasinoProvidersQuery,
  useAddProviderToCasinoMutation,
  useRemoveProviderFromCasinoMutation,
  usePreviewExtractProvidersMutation,
  useApplyProviderNamesMutation,
} from '../../../store/api/casinoProviderApi';
import { useGetProvidersQuery, useCreateProviderMutation } from '../../../store/api/referenceApi';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';

interface ProvidersEditSectionProps {
  casinoId: number;
  activeGeo?: string;
}

type ReviewRow = { key: string; name: string };

export default function ProvidersEditSection({ casinoId, activeGeo }: ProvidersEditSectionProps) {
  const { token } = theme.useToken();
  const { data: providers } = useGetProvidersQuery();
  const [createProvider] = useCreateProviderMutation();
  const { data: casinoProviders = [], isLoading } = useGetCasinoProvidersQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId },
  );
  const [addProvider] = useAddProviderToCasinoMutation();
  const [removeProvider] = useRemoveProviderFromCasinoMutation();
  const [previewExtract, { isLoading: previewLoading }] = usePreviewExtractProvidersMutation();
  const [applyNames, { isLoading: applyLoading }] = useApplyProviderNamesMutation();

  /** Выбранное или введённое имя провайдера (как GEO: тег из справочника или новая строка). */
  const [pickedProviderName, setPickedProviderName] = useState<string | null>(null);
  const [aiText, setAiText] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const rowIdRef = useRef(0);

  const makeRow = (name = ''): ReviewRow => {
    rowIdRef.current += 1;
    return { key: `row-${rowIdRef.current}`, name };
  };

  const openReview = (rows: ReviewRow[]) => {
    setReviewRows(rows.length > 0 ? rows : [makeRow()]);
    setReviewOpen(true);
  };

  const providerOptions = useMemo(
    () =>
      [...(providers ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((p) => ({ value: p.name, label: p.name })),
    [providers],
  );

  const updateRowName = (key: string, name: string) => {
    setReviewRows((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
  };

  const removeRow = (key: string) => {
    setReviewRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const handleRecognizeAi = async () => {
    if (!aiText.trim()) {
      message.warning('Вставьте текст со списком провайдеров');
      return;
    }
    try {
      const result = await previewExtract({ casinoId, text: aiText }).unwrap();
      if (!result.names?.length) {
        message.info('ИИ не нашёл названий провайдеров — попробуйте другой фрагмент или добавьте строки вручную');
        openReview([]);
        return;
      }
      openReview(result.names.map((n) => makeRow(n)));
      message.success(`Распознано названий: ${result.names.length}. Проверьте список перед сохранением.`);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка распознавания');
    }
  };

  const handleApplyList = async () => {
    if (!activeGeo) return;
    const names = reviewRows.map((r) => r.name.trim()).filter(Boolean);
    if (names.length === 0) {
      message.warning('Добавьте хотя бы одно непустое название');
      return;
    }
    try {
      const result = await applyNames({ casinoId, geo: activeGeo, names }).unwrap();
      message.success(`Сохранено. Новых привязок к казино: ${result.added}`);
      setReviewOpen(false);
      setReviewRows([]);
      setAiText('');
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка сохранения');
    }
  };

  if (!activeGeo) {
    return <Typography.Text type="secondary">Выберите GEO, чтобы управлять списком провайдеров.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* Ручное добавление — как GEO: селект из справочника + новое имя тегом */}
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
          Добавить провайдера
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
          Выберите из справочника или введите название и нажмите Enter — новый провайдер попадёт в общий список, затем
          привяжется к казино для GEO «{activeGeo}».
        </Typography.Text>
        <Space wrap style={{ width: '100%', alignItems: 'flex-start' }}>
          <Select
            style={{ minWidth: 280, maxWidth: '100%' }}
            placeholder="Справочник или новое название…"
            options={providerOptions}
            mode="tags"
            maxCount={1}
            value={pickedProviderName != null ? [pickedProviderName] : undefined}
            onChange={(val) => {
              const v = Array.isArray(val) && val.length > 0 ? String(val[0]).trim() : '';
              setPickedProviderName(v || null);
            }}
            showSearch
            suffixIcon={<AppstoreOutlined style={{ color: token.colorTextQuaternary }} />}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp="label"
          />
          <Button
            type="primary"
            onClick={async () => {
              const name = pickedProviderName?.trim();
              if (!name) {
                message.warning('Выберите провайдера из списка или введите новое название');
                return;
              }
              try {
                const refItem = await createProvider({ name }).unwrap();
                await addProvider({ casinoId, provider_id: refItem.id, geo: activeGeo }).unwrap();
                message.success('Провайдер привязан к казино');
                setPickedProviderName(null);
              } catch (e: any) {
                message.error(e?.data?.error ?? 'Ошибка');
              }
            }}
          >
            Добавить
          </Button>
        </Space>
      </div>

      {/* ИИ: текст → предпросмотр → сохранение */}
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: token.colorPrimary }} />
            <span>Загрузка списка через ИИ</span>
          </Space>
        }
        style={{ borderColor: token.colorBorderSecondary }}
      >
        <Input.TextArea
          rows={4}
          placeholder="Вставьте фрагмент страницы, экспорт или перечень провайдеров…"
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <Space wrap>
          <Button type="primary" icon={<RobotOutlined />} loading={previewLoading} onClick={handleRecognizeAi}>
            Распознать ИИ
          </Button>
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={() => {
              openReview([]);
              message.info('Добавьте названия вручную в таблице');
            }}
          >
            Список вручную
          </Button>
        </Space>
      </Card>

      {/* Текущий список */}
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Уже привязано к GEO «{activeGeo}»:
        </Typography.Text>
        {isLoading ? (
          <Typography.Text type="secondary">Загрузка...</Typography.Text>
        ) : casinoProviders.length === 0 ? (
          <Typography.Text type="secondary">Пока нет провайдеров.</Typography.Text>
        ) : (
          <Space wrap size={[8, 8]}>
            {casinoProviders.map((cp) => (
              <Tag
                key={cp.id}
                closable
                onClose={async () => {
                  try {
                    await removeProvider({ casinoId, providerId: cp.provider_id, geo: activeGeo }).unwrap();
                    message.success('Провайдер отвязан');
                  } catch (e: any) {
                    message.error(e?.data?.error ?? 'Ошибка');
                  }
                }}
              >
                {cp.provider_name}
              </Tag>
            ))}
          </Space>
        )}
      </div>

      <Drawer
        title="Проверка списка перед сохранением"
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        width={640}
        destroyOnClose={false}
        styles={{
          body: { paddingTop: 12 },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
        }}
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">
              Строк с данными: {reviewRows.filter((r) => r.name.trim()).length}
            </Typography.Text>
            <Space wrap>
              <Button onClick={() => setReviewOpen(false)}>Отмена</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={applyLoading} onClick={handleApplyList}>
                Сохранить в казино
              </Button>
            </Space>
          </Space>
        }
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
          В каждой строке можно выбрать провайдера из справочника или ввести новое название (Enter) — как при одиночном
          добавлении. Удалите лишние строки или добавьте новые кнопкой ниже. Пустые строки при сохранении игнорируются.
        </Typography.Text>
        <div style={{ marginBottom: 12 }}>
          <Button type="dashed" icon={<PlusOutlined />} block onClick={() => setReviewRows((prev) => [...prev, makeRow()])}>
            Добавить строку
          </Button>
        </div>
        <CasinoProfileTable<ReviewRow>
          pagination={false}
          rowKey="key"
          dataSource={reviewRows}
          columns={[
            {
              title: '№',
              width: 48,
              render: (_: unknown, __: ReviewRow, index: number) => index + 1,
            },
            {
              title: 'Название провайдера',
              render: (_, r) => (
                <Select
                  mode="tags"
                  maxCount={1}
                  style={{ width: '100%', minWidth: 220 }}
                  placeholder="Справочник или новое название…"
                  options={providerOptions}
                  value={r.name.trim() !== '' ? [r.name] : []}
                  onChange={(vals) => {
                    const v = Array.isArray(vals) && vals.length > 0 ? String(vals[0]).trim() : '';
                    updateRowName(r.key, v);
                  }}
                  showSearch
                  allowClear
                  suffixIcon={<AppstoreOutlined style={{ color: token.colorTextQuaternary }} />}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="label"
                />
              ),
            },
            {
              title: '',
              width: 52,
              align: 'center',
              render: (_, r) => (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={reviewRows.length <= 1}
                  onClick={() => removeRow(r.key)}
                  aria-label="Удалить строку"
                />
              ),
            },
          ]}
        />
      </Drawer>
    </Space>
  );
}
