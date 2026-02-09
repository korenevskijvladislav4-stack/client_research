import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Image,
  Upload,
  message,
} from 'antd';
import { SearchOutlined, FilterOutlined, EyeOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useGetAllBonusesQuery,
  CasinoBonus,
  BonusCategory,
  BonusKind,
  BonusType,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  useDeleteBonusImageMutation,
} from '../../store/api/casinoBonusApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { ColumnSelector } from '../../components/ColumnSelector';
import { useServerTable } from '../../hooks/useServerTable';

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'casino_name', title: 'Казино' },
  { key: 'geo', title: 'GEO' },
  { key: 'name', title: 'Название' },
  { key: 'bonus_category', title: 'Категория' },
  { key: 'bonus_kind', title: 'Вид' },
  { key: 'bonus_type', title: 'Тип' },
  { key: 'bonus', title: 'Бонус' },
  { key: 'min_deposit', title: 'Мин. депозит' },
  { key: 'wagering', title: 'Вейджер' },
  { key: 'actions', title: 'Действия' },
];

// Виды бонусов — общие для казино и спорта
const bonusKindLabels: Record<BonusKind, string> = {
  deposit: 'Депозитный',
  nodeposit: 'Бездепозитный',
  cashback: 'Кешбек',
  rakeback: 'Рейкбек',
};

// Типы бонусов — механика, включая спортивные варианты
const bonusTypeLabels: Record<BonusType, string> = {
  cash: 'Кэш-бонус',
  freespin: 'Фриспин',
  combo: 'Комбо',
  freebet: 'Фрибет',
  wagering: 'Вейджеринг',
  insurance: 'Страховка',
  accumulator: 'Аккумулятор',
  odds_boost: 'Повышение коэффициентов',
};


// Форматирование числа
const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return n;
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};

// Форматирование суммы с валютой
const fmtAmount = (value: any, currency?: string | null) => {
  if (value == null) return '—';
  const formatted = fmt(value);
  return currency ? `${formatted} ${currency}` : formatted;
};

export default function Bonuses() {
  const nav = useNavigate();
  const columnSettings = useColumnSettings('bonuses', COLUMN_CONFIG);
  const table = useServerTable<{
    casino_id?: number;
    geo?: string;
    bonus_category?: string;
    bonus_kind?: string;
    bonus_type?: string;
  }>({
    defaultPageSize: 20,
    defaultSortField: 'created_at',
    defaultSortOrder: 'desc',
  });

  const [selectedBonus, setSelectedBonus] = useState<CasinoBonus | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Data
  const { data: casinos } = useGetAllCasinosQuery();
  const { data: geos } = useGetGeosQuery();
  
  // Bonus images
  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId: selectedBonus?.casino_id ?? 0, bonusId: selectedBonus?.id ?? 0 },
    { skip: !selectedBonus?.casino_id || !selectedBonus?.id }
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();
  const [deleteBonusImage] = useDeleteBonusImageMutation();
  const { data: bonusesResp, isLoading } = useGetAllBonusesQuery(table.params);

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );

  const bonusKindOptions = useMemo(
    () =>
      Object.entries(bonusKindLabels).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const bonusTypeOptions = useMemo(
    () =>
      Object.entries(bonusTypeLabels).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const clearFilters = () => {
    table.reset();
  };

  const hasFilters =
    Boolean(table.search) ||
    Boolean(table.filters.casino_id) ||
    Boolean(table.filters.geo) ||
    Boolean(table.filters.bonus_category) ||
    Boolean(table.filters.bonus_kind) ||
    Boolean(table.filters.bonus_type);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <Space direction="vertical" size={0} style={{ flex: 1, minWidth: 200 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Все бонусы
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Список всех бонусов по всем казино с фильтрами
          </Typography.Text>
        </Space>
        <ColumnSelector {...columnSettings} />
      </div>

      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap size={[12, 12]} style={{ width: '100%' }}>
            <Input
              placeholder="Поиск по названию, промокоду, казино..."
              prefix={<SearchOutlined />}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 300, minWidth: 200 }}
              allowClear
            />
            <Select
              placeholder="Казино"
              value={table.filters.casino_id}
              onChange={(v) => table.updateFilter('casino_id', v)}
              options={casinoOptions}
              style={{ width: '100%', maxWidth: 180, minWidth: 150 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              placeholder="GEO"
              value={table.filters.geo}
              onChange={(v) => table.updateFilter('geo', v)}
              options={geoOptions}
              style={{ width: '100%', maxWidth: 120, minWidth: 100 }}
              allowClear
              showSearch
            />
            <Select
              placeholder="Категория"
              value={table.filters.bonus_category}
              onChange={(v) => table.updateFilter('bonus_category', v)}
              options={[
                { value: 'casino', label: 'Казино' },
                { value: 'sport', label: 'Спорт' },
              ]}
              style={{ width: '100%', maxWidth: 120, minWidth: 100 }}
              allowClear
            />
            <Select
              placeholder="Вид бонуса"
              value={table.filters.bonus_kind}
              onChange={(v) => table.updateFilter('bonus_kind', v)}
              options={bonusKindOptions}
              style={{ width: '100%', maxWidth: 150, minWidth: 130 }}
              allowClear
            />
            <Select
              placeholder="Тип бонуса"
              value={table.filters.bonus_type}
              onChange={(v) => table.updateFilter('bonus_type', v)}
              options={bonusTypeOptions}
              style={{ width: '100%', maxWidth: 130, minWidth: 120 }}
              allowClear
            />
            {hasFilters && (
              <Button icon={<FilterOutlined />} onClick={clearFilters}>
                Сбросить
              </Button>
            )}
          </Space>

          {/* Table */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table<CasinoBonus>
              rowKey="id"
              size="small"
              loading={isLoading}
              dataSource={bonusesResp?.data ?? []}
              pagination={{
                ...table.paginationConfig(bonusesResp?.pagination?.total ?? bonusesResp?.total ?? 0),
                responsive: true,
              }}
              onChange={table.handleTableChange}
              scroll={{ x: 'max-content' }}
              onRow={(record) => ({
                onClick: () => nav(`/casinos/${record.casino_id}`),
                style: { cursor: 'pointer' },
              })}
              columns={[
              columnSettings.isVisible('casino_name') && {
                title: 'Казино',
                dataIndex: 'casino_name',
                width: 140,
                ellipsis: true,
                render: (v: string) => <Typography.Text strong>{v || '—'}</Typography.Text>,
              },
              columnSettings.isVisible('geo') && {
                title: 'GEO',
                dataIndex: 'geo',
                width: 60,
                render: (v: string) => <Tag>{v}</Tag>,
              },
              columnSettings.isVisible('name') && {
                title: 'Название',
                dataIndex: 'name',
                width: 150,
                ellipsis: true,
              },
              columnSettings.isVisible('bonus_category') && {
                title: 'Категория',
                dataIndex: 'bonus_category',
                width: 80,
                render: (v: BonusCategory) => {
                  const labels: Record<string, string> = { casino: 'Казино', sport: 'Спорт' };
                  return <Tag color={v === 'sport' ? 'green' : 'blue'}>{labels[v] || v || 'Казино'}</Tag>;
                },
              },
              columnSettings.isVisible('bonus_kind') && {
                title: 'Вид',
                dataIndex: 'bonus_kind',
                width: 100,
                render: (v: BonusKind) => (
                  <Tag
                    color={
                      v === 'nodeposit'
                        ? 'gold'
                        : v === 'cashback'
                        ? 'cyan'
                        : v === 'rakeback'
                        ? 'purple'
                        : 'blue'
                    }
                  >
                    {bonusKindLabels[v] || v || '—'}
                  </Tag>
                ),
              },
              columnSettings.isVisible('bonus_type') && {
                title: 'Тип',
                dataIndex: 'bonus_type',
                width: 120,
                render: (v: BonusType) => {
                  const label = bonusTypeLabels[v] || v;
                  return label ? <Tag>{label}</Tag> : '—';
                },
              },
              columnSettings.isVisible('bonus') && {
                title: 'Бонус',
                width: 120,
                render: (_: any, b: CasinoBonus) => {
                  const parts: string[] = [];
                  if (b.bonus_value != null) {
                    if (b.bonus_unit === 'percent') {
                      parts.push(`${fmt(b.bonus_value)}%`);
                    } else {
                      parts.push(b.currency ? `${fmt(b.bonus_value)} ${b.currency}` : `${fmt(b.bonus_value)}`);
                    }
                  }
                  if (b.freespins_count) {
                    parts.push(`${fmt(b.freespins_count)} FS`);
                  }
                  if (b.cashback_percent) {
                    parts.push(`${fmt(b.cashback_percent)}%`);
                  }
                  return parts.length > 0 ? parts.join('+') : '—';
                },
              },
              columnSettings.isVisible('min_deposit') && {
                title: 'Мин.',
                width: 80,
                render: (_: any, b: CasinoBonus) => fmtAmount(b.min_deposit, b.currency),
              },
              columnSettings.isVisible('wagering') && {
                title: 'x',
                dataIndex: 'wagering_requirement',
                width: 50,
                render: (v: number) => {
                  if (v == null) return '—';
                  return `x${fmt(v)}`;
                },
              },
              columnSettings.isVisible('actions') && {
                title: '',
                width: 40,
                align: 'right',
                render: (_: any, b: CasinoBonus) => (
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBonus(b);
                    }}
                  />
                ),
              },
            ].filter(Boolean) as any}
            />
          </div>

          {/* Модальное окно с подробностями бонуса */}
          <Modal
            title={selectedBonus?.name || 'Информация о бонусе'}
            open={!!selectedBonus}
            onCancel={() => {
              setSelectedBonus(null);
              setPendingImages([]);
            }}
            footer={null}
            width={700}
          >
            {selectedBonus && (
              <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Казино">
                  {selectedBonus.casino_name || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="GEO">
                  <Tag>{selectedBonus.geo}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Категория">
                  {(() => {
                    const labels: Record<string, string> = {
                      casino: 'Казино',
                      sport: 'Спорт',
                    };
                    return labels[selectedBonus.bonus_category || 'casino'] || selectedBonus.bonus_category || 'Казино';
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Вид бонуса">
                  {(() => {
                    const casinoLabels: Record<string, string> = {
                      deposit: 'Депозитный',
                      nodeposit: 'Бездепозитный',
                      cashback: 'Кешбек',
                      rakeback: 'Рейкбек',
                    };
                    const sportLabels: Record<string, string> = {
                      welcome: 'Приветственный',
                      reload: 'Перезагрузка',
                      freebet: 'Фрибет',
                      accumulator: 'Аккумулятор',
                      odds_boost: 'Повышение коэффициентов',
                    };
                    const labels = selectedBonus.bonus_category === 'sport' ? sportLabels : casinoLabels;
                    return labels[selectedBonus.bonus_kind || ''] || selectedBonus.bonus_kind || '—';
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Тип бонуса">
                  {(() => {
                    const casinoLabels: Record<string, string> = {
                      cash: 'Кэш-бонус',
                      freespin: 'Фриспин-бонус',
                      combo: 'Комбинированный',
                    };
                    const sportLabels: Record<string, string> = {
                      freebet: 'Фрибет',
                      accumulator: 'Аккумулятор',
                      odds_boost: 'Повышение коэффициентов',
                      cash: 'Кэш-бонус',
                    };
                    const labels = selectedBonus.bonus_category === 'sport' ? sportLabels : casinoLabels;
                    return labels[selectedBonus.bonus_type || ''] || selectedBonus.bonus_type || '—';
                  })()}
                </Descriptions.Item>
                
                {/* Валюта */}
                {selectedBonus.currency && (
                  <Descriptions.Item label="Валюта">
                    {selectedBonus.currency}
                  </Descriptions.Item>
                )}

                {/* Кэш-бонус */}
                {selectedBonus.bonus_value != null && (
                  <Descriptions.Item label="Размер кэш-бонуса">
                    {selectedBonus.bonus_unit === 'percent' 
                      ? `${fmt(selectedBonus.bonus_value)}%` 
                      : fmtAmount(selectedBonus.bonus_value, selectedBonus.currency)}
                  </Descriptions.Item>
                )}
                {selectedBonus.max_bonus != null && (
                  <Descriptions.Item label="Макс. бонус">
                    {fmtAmount(selectedBonus.max_bonus, selectedBonus.currency)}
                  </Descriptions.Item>
                )}
                {/* Максвин по кэш-части / % части — рядом с кэш-бонусом */}
                {selectedBonus.bonus_type === 'cash' &&
                  (selectedBonus.max_win_cash_value != null || selectedBonus.max_cashout != null) && (
                    <Descriptions.Item label="Максвин кэш-бонуса">
                      {selectedBonus.max_win_cash_value != null ? (
                        <>
                          {selectedBonus.max_win_cash_unit === 'coefficient'
                            ? `x${fmt(selectedBonus.max_win_cash_value)}`
                            : fmtAmount(selectedBonus.max_win_cash_value, selectedBonus.currency)}
                          {' '}
                          ({selectedBonus.max_win_cash_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
                        </>
                      ) : (
                        `x${fmt(selectedBonus.max_cashout)} (коэффициент)`
                      )}
                    </Descriptions.Item>
                  )}
                {selectedBonus.bonus_type === 'combo' &&
                  selectedBonus.max_win_percent_value != null && (
                    <Descriptions.Item label="Максвин % части">
                      {selectedBonus.max_win_percent_unit === 'coefficient'
                        ? `x${fmt(selectedBonus.max_win_percent_value)}`
                        : fmtAmount(selectedBonus.max_win_percent_value, selectedBonus.currency)}
                      {' '}
                      ({selectedBonus.max_win_percent_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
                    </Descriptions.Item>
                  )}

                {/* Фриспины */}
                {selectedBonus.freespins_count != null && (
                  <Descriptions.Item label="Количество фриспинов">
                    {selectedBonus.freespins_count} FS
                  </Descriptions.Item>
                )}
                {selectedBonus.freespin_value != null && (
                  <Descriptions.Item label="Стоимость спина">
                    {fmtAmount(selectedBonus.freespin_value, selectedBonus.currency)}
                  </Descriptions.Item>
                )}
                {selectedBonus.freespin_game && (
                  <Descriptions.Item label="Игра для фриспинов">
                    {selectedBonus.freespin_game}
                  </Descriptions.Item>
                )}
                {/* Максвин фриспинов — рядом с информацией по спинам */}
                {(selectedBonus.bonus_type === 'freespin' || selectedBonus.bonus_type === 'combo') &&
                  selectedBonus.max_win_freespin_value != null && (
                    <Descriptions.Item label="Максвин фриспинов">
                      {selectedBonus.max_win_freespin_unit === 'coefficient'
                        ? `x${fmt(selectedBonus.max_win_freespin_value)}`
                        : fmtAmount(selectedBonus.max_win_freespin_value, selectedBonus.currency)}
                      {' '}
                      ({selectedBonus.max_win_freespin_unit === 'coefficient' ? 'коэффициент' : 'фикс. сумма'})
                    </Descriptions.Item>
                  )}

                {/* Кешбек/Рейкбек */}
                {selectedBonus.cashback_percent != null && (
                  <Descriptions.Item label="Процент возврата">
                    {fmt(selectedBonus.cashback_percent)}%
                  </Descriptions.Item>
                )}
                {selectedBonus.cashback_period && (
                  <Descriptions.Item label="Период возврата">
                    {(() => {
                      const labels: Record<string, string> = {
                        daily: 'Ежедневно',
                        weekly: 'Еженедельно',
                        monthly: 'Ежемесячно',
                      };
                      return labels[selectedBonus.cashback_period] || selectedBonus.cashback_period;
                    })()}
                  </Descriptions.Item>
                )}

                {/* Общие поля */}
                {selectedBonus.min_deposit != null && (
                  <Descriptions.Item label="Мин. депозит">
                    {fmtAmount(selectedBonus.min_deposit, selectedBonus.currency)}
                  </Descriptions.Item>
                )}
                {selectedBonus.wagering_requirement != null && (
                  <Descriptions.Item label="Вейджер">
                    x{fmt(selectedBonus.wagering_requirement)}
                  </Descriptions.Item>
                )}
                {selectedBonus.wagering_games && (
                  <Descriptions.Item label="Игры для отыгрыша">
                    {selectedBonus.wagering_games}
                  </Descriptions.Item>
                )}
                {selectedBonus.notes && (
                  <Descriptions.Item label="Заметки">
                    {selectedBonus.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Images Section */}
              <div style={{ marginTop: 24 }}>
                <Typography.Title level={5}>Изображения</Typography.Title>
                
                {/* Existing Images */}
                {bonusImages && bonusImages.length > 0 && (
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {bonusImages.map((img) => (
                        <div key={img.id} style={{ position: 'relative' }}>
                          <Image
                            src={img.url}
                            alt={img.original_name || 'Bonus image'}
                            width={100}
                            height={100}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ position: 'absolute', top: 4, right: 4 }}
                            onClick={async () => {
                              if (!selectedBonus?.casino_id || !selectedBonus?.id) return;
                              try {
                                await deleteBonusImage({
                                  casinoId: selectedBonus.casino_id,
                                  bonusId: selectedBonus.id,
                                  imageId: img.id,
                                }).unwrap();
                                message.success('Изображение удалено');
                              } catch (e: any) {
                                message.error(e?.data?.error ?? 'Ошибка удаления');
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </Image.PreviewGroup>
                )}
                
                {/* Upload Area */}
                <div
                  style={{
                    border: '2px dashed #d9d9d9',
                    borderRadius: 4,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files).filter((f) =>
                      f.type.startsWith('image/')
                    );
                    if (files.length > 0) {
                      setPendingImages((prev) => [...prev, ...files]);
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData.items;
                    const files: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                      }
                    }
                    if (files.length > 0) {
                      setPendingImages((prev) => [...prev, ...files]);
                    }
                  }}
                >
                  <PictureOutlined style={{ fontSize: 24, color: '#8c8c8c', marginBottom: 8 }} />
                  <div style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary">
                      Перетащите изображения сюда или вставьте (Ctrl+V)
                    </Typography.Text>
                  </div>
                  <Upload
                    multiple
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      setPendingImages((prev) => [...prev, file]);
                      return false;
                    }}
                  >
                    <Button icon={<PictureOutlined />}>Выбрать файлы</Button>
                  </Upload>
                </div>
                
                {/* Pending Images */}
                {pendingImages.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text strong>Готово к загрузке ({pendingImages.length}):</Typography.Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {pendingImages.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            width={80}
                            height={80}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => {
                              setPendingImages((prev) => prev.filter((_, i) => i !== idx));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      type="primary"
                      loading={uploading}
                      onClick={async () => {
                        if (!selectedBonus?.casino_id || !selectedBonus?.id || pendingImages.length === 0) return;
                        setUploading(true);
                        try {
                          await uploadBonusImages({
                            casinoId: selectedBonus.casino_id,
                            bonusId: selectedBonus.id,
                            files: pendingImages,
                          }).unwrap();
                          message.success('Изображения загружены');
                          setPendingImages([]);
                        } catch (e: any) {
                          message.error(e?.data?.error ?? 'Ошибка загрузки');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      style={{ marginTop: 8 }}
                    >
                      Загрузить
                    </Button>
                  </div>
                )}
              </div>
              </>
            )}
          </Modal>
        </Space>
      </Card>
    </Space>
  );
}

