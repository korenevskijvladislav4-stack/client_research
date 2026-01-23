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
  useGetAllPaymentsQuery,
  CasinoPayment,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  useDeletePaymentImageMutation,
  // CasinoPaymentImage,
} from '../../store/api/casinoPaymentApi';
import { useGetCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { useGetPaymentTypesQuery } from '../../store/api/referenceApi';
import { useGetPaymentMethodsQuery } from '../../store/api/referenceApi';
import { useColumnSettings, ColumnConfig } from '../../hooks/useColumnSettings';
import { ColumnSelector } from '../../components/ColumnSelector';

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'casino_name', title: 'Казино' },
  { key: 'geo', title: 'GEO' },
  { key: 'type', title: 'Тип' },
  { key: 'method', title: 'Метод' },
  { key: 'min_amount', title: 'Мин.' },
  { key: 'max_amount', title: 'Макс.' },
  { key: 'currency', title: 'Валюта' },
  { key: 'actions', title: 'Действия' },
];

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

export default function Payments() {
  const nav = useNavigate();
  const columnSettings = useColumnSettings('payments', COLUMN_CONFIG);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterCasino, setFilterCasino] = useState<number | undefined>(undefined);
  const [filterGeo, setFilterGeo] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterMethod, setFilterMethod] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<(CasinoPayment & { casino_name?: string }) | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const PAGE_SIZE = 20;

  // Загрузка изображений для выбранного платежа
  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId: selectedPayment?.casino_id ?? 0, paymentId: selectedPayment?.id ?? 0 },
    { skip: !selectedPayment?.id || !selectedPayment?.casino_id }
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();
  const [deletePaymentImage] = useDeletePaymentImageMutation();

  // Data
  const { data: casinos } = useGetCasinosQuery();
  const { data: geos } = useGetGeosQuery();
  const { data: paymentTypes } = useGetPaymentTypesQuery();
  const { data: paymentMethods } = useGetPaymentMethodsQuery();
  const { data: paymentsResp, isLoading } = useGetAllPaymentsQuery({
    casino_id: filterCasino,
    geo: filterGeo,
    type: filterType,
    method: filterMethod,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const casinoOptions = useMemo(
    () => (casinos ?? []).map((c) => ({ value: c.id, label: c.name })),
    [casinos]
  );

  const geoOptions = useMemo(
    () => (geos ?? []).map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` })),
    [geos]
  );

  const typeOptions = useMemo(
    () => (paymentTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [paymentTypes]
  );

  const methodOptions = useMemo(
    () => (paymentMethods ?? []).map((m) => ({ value: m.name, label: m.name })),
    [paymentMethods]
  );

  const clearFilters = () => {
    setSearch('');
    setFilterCasino(undefined);
    setFilterGeo(undefined);
    setFilterType(undefined);
    setFilterMethod(undefined);
    setPage(1);
  };

  const hasFilters = search || filterCasino || filterGeo || filterType || filterMethod;

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
            Все платёжные решения
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Список всех платёжных решений по всем казино с фильтрами
          </Typography.Text>
        </Space>
        <ColumnSelector {...columnSettings} />
      </div>

      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap size={[12, 12]} style={{ width: '100%' }}>
            <Input
              placeholder="Поиск по типу, методу, казино..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', maxWidth: 300, minWidth: 200 }}
              allowClear
            />
            <Select
              placeholder="Казино"
              value={filterCasino}
              onChange={(v) => {
                setFilterCasino(v);
                setPage(1);
              }}
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
              value={filterGeo}
              onChange={(v) => {
                setFilterGeo(v);
                setPage(1);
              }}
              options={geoOptions}
              style={{ width: '100%', maxWidth: 120, minWidth: 100 }}
              allowClear
              showSearch
            />
            <Select
              placeholder="Тип"
              value={filterType}
              onChange={(v) => {
                setFilterType(v);
                setPage(1);
              }}
              options={typeOptions}
              style={{ width: '100%', maxWidth: 150, minWidth: 130 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              placeholder="Метод"
              value={filterMethod}
              onChange={(v) => {
                setFilterMethod(v);
                setPage(1);
              }}
              options={methodOptions}
              style={{ width: '100%', maxWidth: 150, minWidth: 130 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            {hasFilters && (
              <Button icon={<FilterOutlined />} onClick={clearFilters}>
                Сбросить
              </Button>
            )}
          </Space>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table<(CasinoPayment & { casino_name?: string })>
            rowKey="id"
            size="small"
            loading={isLoading}
            dataSource={paymentsResp?.data ?? []}
            pagination={{
              current: page,
              total: paymentsResp?.total ?? 0,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              onChange: (p) => setPage(p),
            }}
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
              columnSettings.isVisible('type') && {
                title: 'Тип',
                dataIndex: 'type',
                width: 140,
                ellipsis: true,
              },
              columnSettings.isVisible('method') && {
                title: 'Метод',
                dataIndex: 'method',
                width: 140,
                ellipsis: true,
              },
              columnSettings.isVisible('min_amount') && {
                title: 'Мин.',
                width: 100,
                render: (_: any, p: CasinoPayment) => fmtAmount(p.min_amount, p.currency),
              },
              columnSettings.isVisible('max_amount') && {
                title: 'Макс.',
                width: 100,
                render: (_: any, p: CasinoPayment) => fmtAmount(p.max_amount, p.currency),
              },
              columnSettings.isVisible('currency') && {
                title: 'Валюта',
                dataIndex: 'currency',
                width: 80,
                render: (v: string) => v || '—',
              },
              columnSettings.isVisible('actions') && {
                title: '',
                width: 40,
                align: 'right',
                render: (_: any, p: CasinoPayment & { casino_name?: string }) => (
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPayment(p);
                    }}
                  />
                ),
              },
            ].filter(Boolean) as any}
            />
          </div>

          {/* Модальное окно с подробностями платежа */}
          <Modal
            title="Информация о платёжном решении"
            open={!!selectedPayment}
            onCancel={() => {
              setSelectedPayment(null);
              setPendingImages([]);
            }}
            footer={null}
            width={600}
          >
            {selectedPayment && (
              <>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Казино">
                    {selectedPayment.casino_name || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="GEO">
                    <Tag>{selectedPayment.geo}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Тип">
                    {selectedPayment.type || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Метод">
                    {selectedPayment.method || '—'}
                  </Descriptions.Item>
                  {selectedPayment.min_amount != null && (
                    <Descriptions.Item label="Мин. сумма">
                      {fmtAmount(selectedPayment.min_amount, selectedPayment.currency)}
                    </Descriptions.Item>
                  )}
                  {selectedPayment.max_amount != null && (
                    <Descriptions.Item label="Макс. сумма">
                      {fmtAmount(selectedPayment.max_amount, selectedPayment.currency)}
                    </Descriptions.Item>
                  )}
                  {selectedPayment.currency && (
                    <Descriptions.Item label="Валюта">
                      {selectedPayment.currency}
                    </Descriptions.Item>
                  )}
                  {selectedPayment.notes && (
                    <Descriptions.Item label="Заметки">
                      {selectedPayment.notes}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                {/* Изображения платежного метода */}
                <div style={{ marginTop: 24 }}>
                  <Typography.Title level={5}>Изображения</Typography.Title>
                  
                  {/* Existing Images */}
                  {paymentImages && paymentImages.length > 0 && (
                    <Image.PreviewGroup>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {paymentImages.map((img) => (
                          <div key={img.id} style={{ position: 'relative' }}>
                            <Image
                              src={img.url}
                              alt={img.original_name || 'Payment image'}
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
                                if (!selectedPayment?.casino_id || !selectedPayment?.id) return;
                                try {
                                  await deletePaymentImage({
                                    casinoId: selectedPayment.casino_id,
                                    paymentId: selectedPayment.id,
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
                          if (!selectedPayment?.casino_id || !selectedPayment?.id || pendingImages.length === 0) return;
                          setUploading(true);
                          try {
                            await uploadPaymentImages({
                              casinoId: selectedPayment.casino_id,
                              paymentId: selectedPayment.id,
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
