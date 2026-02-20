import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Flex,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useGetAllPromosQuery,
  useGetPromoImagesQuery,
  useUploadPromoImagesMutation,
  useDeletePromoImageMutation,
  CasinoPromo,
  CasinoPromoImage,
  PromoCategory,
  PromoStatus,
} from '../../store/api/casinoPromoApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetPromoTypesQuery } from '../../store/api/referenceApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { ColumnSelector } from '../../components/ColumnSelector';
import { useServerTable } from '../../hooks/useServerTable';
import { getApiBaseUrl } from '../../config/api';
import { useAppSelector } from '../../hooks/redux';

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'geo', title: 'GEO' },
  { key: 'casino_name', title: 'Конкурент' },
  { key: 'promo_category', title: 'Турнир / Акция' },
  { key: 'promo_type', title: 'Тип турнира' },
  { key: 'name', title: 'Название турнира' },
  { key: 'period', title: 'Период проведения' },
  { key: 'provider', title: 'Провайдер' },
  { key: 'prize_fund', title: 'Общий ПФ' },
  { key: 'mechanics', title: 'Механика' },
  { key: 'min_bet', title: 'Мин. ставка для участия' },
  { key: 'wagering_prize', title: 'Вейджер на приз' },
  { key: 'actions', title: 'Действия' },
];

const categoryLabels: Record<PromoCategory, string> = {
  tournament: 'Турнир',
  promotion: 'Акция',
};

const statusLabels: Record<PromoStatus, string> = {
  active: 'Активен',
  paused: 'Пауза',
  expired: 'Истёк',
  draft: 'Черновик',
};

const statusColors: Record<PromoStatus, string> = {
  active: 'green',
  paused: 'orange',
  expired: 'red',
  draft: 'default',
};

const fmtDate = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

export default function Promos() {
  const nav = useNavigate();
  const columnSettings = useColumnSettings('promos', COLUMN_CONFIG);
  const token = useAppSelector((s) => s.auth.token);
  const [selectedPromo, setSelectedPromo] = useState<CasinoPromo | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const table = useServerTable<{
    casino_id?: number;
    geo?: string;
    promo_category?: string;
    promo_type?: string;
    status?: string;
  }>({
    defaultPageSize: 20,
    defaultSortField: 'created_at',
    defaultSortOrder: 'desc',
  });

  const { data: casinos } = useGetAllCasinosQuery();
  const { data: geos } = useGetGeosQuery();
  const { data: promoTypes } = useGetPromoTypesQuery();
  const { data: promosResp, isLoading } = useGetAllPromosQuery(table.params);
  const { data: promoImages = [] } = useGetPromoImagesQuery(
    { casinoId: selectedPromo?.casino_id ?? 0, promoId: selectedPromo?.id ?? 0 },
    { skip: !selectedPromo?.casino_id || !selectedPromo?.id }
  );
  const [uploadPromoImages] = useUploadPromoImagesMutation();
  const [deletePromoImage] = useDeletePromoImageMutation();

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );
  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );
  const promoTypeOptions = useMemo(
    () => (promoTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [promoTypes]
  );

  const hasFilters =
    Boolean(table.search) ||
    Boolean(table.filters.casino_id) ||
    Boolean(table.filters.geo) ||
    Boolean(table.filters.promo_category) ||
    Boolean(table.filters.promo_type) ||
    Boolean(table.filters.status);

  const handleExport = () => {
    try {
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      const urlParams = new URLSearchParams();
      if (table.search) urlParams.set('search', table.search);
      const f = table.filters;
      if (f.casino_id != null) urlParams.set('casino_id', String(f.casino_id));
      if (f.geo) urlParams.set('geo', f.geo);
      if (f.promo_category) urlParams.set('promo_category', f.promo_category);
      if (f.promo_type) urlParams.set('promo_type', f.promo_type);
      if (f.status) urlParams.set('status', f.status);
      if (token) urlParams.set('token', token);
      const qs = urlParams.toString();
      window.open(`${baseUrl}/promos/export${qs ? `?${qs}` : ''}`, '_blank');
    } catch {
      message.error('Не удалось выгрузить промо');
    }
  };

  const allColumns: ColumnsType<any> = [
    {
      key: 'geo',
      title: 'GEO',
      dataIndex: 'geo',
      width: 64,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      key: 'casino_name',
      title: 'Конкурент',
      dataIndex: 'casino_name',
      width: 140,
      ellipsis: true,
      render: (v: string) => <Typography.Text strong>{v || '—'}</Typography.Text>,
    },
    {
      key: 'promo_category',
      title: 'Турнир / Акция',
      dataIndex: 'promo_category',
      width: 120,
      render: (v: PromoCategory) => (
        <Tag color={v === 'tournament' ? 'blue' : 'purple'}>
          {categoryLabels[v] || v}
        </Tag>
      ),
    },
    {
      key: 'promo_type',
      title: 'Тип турнира',
      dataIndex: 'promo_type',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      key: 'name',
      title: 'Название турнира',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      key: 'period',
      title: 'Период проведения',
      width: 160,
      render: (_: any, r: any) => {
        if (!r.period_start && !r.period_end) return '—';
        return `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}`;
      },
    },
    {
      key: 'provider',
      title: 'Провайдер',
      dataIndex: 'provider',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      key: 'prize_fund',
      title: 'Общий ПФ',
      dataIndex: 'prize_fund',
      width: 110,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      key: 'mechanics',
      title: 'Механика',
      dataIndex: 'mechanics',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      key: 'min_bet',
      title: 'Мин. ставка для участия',
      dataIndex: 'min_bet',
      width: 140,
      render: (v: string) => v || '—',
    },
    {
      key: 'wagering_prize',
      title: 'Вейджер на приз',
      dataIndex: 'wagering_prize',
      width: 120,
      render: (v: string) => v || '—',
    },
    {
      key: 'actions',
      title: '',
      width: 48,
      align: 'right' as const,
      render: (_: any, r: any) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedPromo(r);
          }}
        />
      ),
    },
  ];

  const filtered = allColumns.filter(
    (col) => col.key && columnSettings.visibleKeys.includes(col.key as string)
  );
  const hasDataColumn = filtered.some((col) => col.key !== 'actions');
  const visibleColumns =
    filtered.length > 0 && hasDataColumn ? filtered : allColumns;

  return (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Промо</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Турниры и акции по казино. Нажмите на строку, чтобы открыть казино.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={handleExport}>Выгрузить XLSX</Button>
          <ColumnSelector {...columnSettings} />
        </Space>
      </div>

      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Input
            placeholder="Поиск по названию, провайдеру, казино..."
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
            value={table.filters.promo_category}
            onChange={(v) => table.updateFilter('promo_category', v)}
            options={[
              { value: 'tournament', label: 'Турнир' },
              { value: 'promotion', label: 'Акция' },
            ]}
            style={{ width: '100%', maxWidth: 130, minWidth: 110 }}
            allowClear
          />
          <Select
            placeholder="Тип турнира"
            value={table.filters.promo_type}
            onChange={(v) => table.updateFilter('promo_type', v)}
            options={promoTypeOptions}
            style={{ width: '100%', maxWidth: 160, minWidth: 130 }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Статус"
            value={table.filters.status}
            onChange={(v) => table.updateFilter('status', v)}
            options={[
              { value: 'active', label: 'Активен' },
              { value: 'paused', label: 'Пауза' },
              { value: 'expired', label: 'Истёк' },
              { value: 'draft', label: 'Черновик' },
            ]}
            style={{ width: '100%', maxWidth: 130, minWidth: 110 }}
            allowClear
          />
          {hasFilters && (
            <Button onClick={() => table.reset()}>Сбросить</Button>
          )}
        </Space>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading}
            dataSource={promosResp?.data ?? []}
            pagination={{
              ...table.paginationConfig(promosResp?.pagination?.total ?? promosResp?.total ?? 0),
              responsive: true,
            }}
            onChange={table.handleTableChange}
            scroll={{ x: 'max-content' }}
            onRow={(record: any) => ({
              onClick: () => nav(`/casinos/${record.casino_id}`),
              style: { cursor: 'pointer' },
            })}
            columns={visibleColumns}
          />
        </div>
      </Card>

      <Modal
        title={
          <Space align="center">
            <Tag color={selectedPromo?.promo_category === 'tournament' ? 'blue' : 'purple'}>
              {selectedPromo ? categoryLabels[selectedPromo.promo_category] : ''}
            </Tag>
            <span>{selectedPromo?.name || 'Промо'}</span>
          </Space>
        }
        open={!!selectedPromo}
        onCancel={() => {
          setSelectedPromo(null);
          setPendingImages([]);
        }}
        footer={null}
        width={640}
      >
        {selectedPromo && (
          <>
            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 500, width: 200 }}>
              <Descriptions.Item label="GEO">
                <Tag>{selectedPromo.geo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Конкурент">
                {selectedPromo.casino_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Турнир / Акция">
                <Tag color={selectedPromo.promo_category === 'tournament' ? 'blue' : 'purple'}>
                  {categoryLabels[selectedPromo.promo_category]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Тип турнира">
                {selectedPromo.promo_type || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Название турнира">
                {selectedPromo.name}
              </Descriptions.Item>
              <Descriptions.Item label="Период проведения">
                {fmtDate(selectedPromo.period_start)} – {fmtDate(selectedPromo.period_end)}
              </Descriptions.Item>
              <Descriptions.Item label="Провайдер">
                {selectedPromo.provider || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Общий ПФ">
                {selectedPromo.prize_fund || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Механика">
                {selectedPromo.mechanics || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Мин. ставка для участия">
                {selectedPromo.min_bet || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Вейджер на приз">
                {selectedPromo.wagering_prize || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={statusColors[selectedPromo.status]}>
                  {statusLabels[selectedPromo.status]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Изображения</Typography.Title>

              {promoImages.length > 0 && (
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {promoImages.map((img: CasinoPromoImage) => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <Image
                          src={img.url}
                          alt={img.original_name || 'Promo image'}
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
                            if (!selectedPromo?.casino_id || !selectedPromo?.id) return;
                            try {
                              await deletePromoImage({
                                casinoId: selectedPromo.casino_id,
                                promoId: selectedPromo.id,
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
                          onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="primary"
                    loading={uploading}
                    style={{ marginTop: 12 }}
                    onClick={async () => {
                      if (!selectedPromo?.casino_id || !selectedPromo?.id || pendingImages.length === 0) return;
                      setUploading(true);
                      try {
                        await uploadPromoImages({
                          casinoId: selectedPromo.casino_id,
                          promoId: selectedPromo.id,
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
                  >
                    Загрузить изображения
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </Flex>
  );
}
