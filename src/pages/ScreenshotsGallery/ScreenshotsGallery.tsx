import { useState, useMemo } from 'react';
import {
  Card,
  Col,
  Descriptions,
  Image,
  Row,
  Select,
  DatePicker,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  theme,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import { FilterOutlined, PictureOutlined } from '@ant-design/icons';
import {
  useGetAllScreenshotsQuery,
  type ScreenshotFilters,
  type ScreenshotGalleryItem,
} from '../../store/api/slotSelectorApi';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { resolvePublicUploadUrl } from '../../config/api';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

type DescriptionItem = NonNullable<DescriptionsProps['items']>[number];

function profileStyleFieldLabel(text: string) {
  return (
    <Typography.Text strong style={{ fontSize: 13, color: 'inherit' }}>
      {text}
    </Typography.Text>
  );
}

function formatGeoLabel(code: string | null | undefined, geos: { code: string; name: string }[]): string {
  if (!code?.trim()) return '—';
  const row = geos.find((g) => g.code === code);
  return row ? `${row.code} — ${row.name}` : code;
}

const galleryListDescriptionsStyles = {
  label: { width: 200, minWidth: 200 },
  content: { minWidth: 0 },
} as const;

function galleryMetaItems(s: ScreenshotGalleryItem, geos: { code: string; name: string }[]): DescriptionItem[] {
  return [
    { key: 'casino', label: profileStyleFieldLabel('Казино'), children: s.casino_name || '—' },
    { key: 'geo', label: profileStyleFieldLabel('GEO'), children: formatGeoLabel(s.geo, geos) },
    {
      key: 'section',
      label: profileStyleFieldLabel('Раздел'),
      children: s.section ? <Tag>{s.section}</Tag> : '—',
    },
    {
      key: 'category',
      label: profileStyleFieldLabel('Категория'),
      children: s.category ? <Tag color="green">{s.category}</Tag> : '—',
    },
    {
      key: 'date',
      label: profileStyleFieldLabel('Дата снимка'),
      children: s.screenshot_created_at
        ? dayjs(s.screenshot_created_at).format('DD.MM.YYYY HH:mm')
        : '—',
    },
    {
      key: 'url',
      label: profileStyleFieldLabel('URL страницы'),
      children:
        s.url && s.url.trim() ? (
          <Typography.Link href={s.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Открыть
          </Typography.Link>
        ) : (
          '—'
        ),
    },
  ];
}

export default function ScreenshotsGallery() {
  const { token } = theme.useToken();
  const [filters, setFilters] = useState<ScreenshotFilters>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: screenshots = [], isLoading } = useGetAllScreenshotsQuery(filters);
  const { data: allScreenshots = [] } = useGetAllScreenshotsQuery({});
  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();

  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    allScreenshots.forEach((s) => s.section && sections.add(s.section));
    return Array.from(sections).sort();
  }, [allScreenshots]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    allScreenshots.forEach((s) => s.category && categories.add(s.category));
    return Array.from(categories).sort();
  }, [allScreenshots]);

  const handleFilterChange = (key: keyof ScreenshotFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        dateFrom: dates[0]!.format('YYYY-MM-DD'),
        dateTo: dates[1]!.format('YYYY-MM-DD'),
      }));
    } else {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.dateFrom;
        delete next.dateTo;
        return next;
      });
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <PageHeaderCard
        title={
          <Space>
            <PictureOutlined />
            <span>Галерея скриншотов</span>
          </Space>
        }
      />

      <Card
        size="small"
        title={
          <Space>
            <FilterOutlined />
            <Typography.Text strong>Фильтры</Typography.Text>
            {hasActiveFilters ? (
              <Typography.Link onClick={clearFilters} style={{ fontSize: 13, fontWeight: 400 }}>
                Очистить
              </Typography.Link>
            ) : null}
          </Space>
        }
        styles={{ body: { paddingTop: 12 } }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="GEO"
              allowClear
              style={{ width: '100%' }}
              value={filters.geo}
              onChange={(value) => handleFilterChange('geo', value)}
            >
              {geos.map((geo) => (
                <Select.Option key={geo.code} value={geo.code as string}>
                  {geo.name} ({geo.code})
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Раздел"
              allowClear
              style={{ width: '100%' }}
              value={filters.section}
              onChange={(value) => handleFilterChange('section', value)}
            >
              {uniqueSections.map((section) => (
                <Select.Option key={section} value={section}>
                  {section}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Категория"
              allowClear
              style={{ width: '100%' }}
              value={filters.category}
              onChange={(value) => handleFilterChange('category', value)}
            >
              {uniqueCategories.map((category) => (
                <Select.Option key={category} value={category}>
                  {category}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Проект (казино)"
              allowClear
              showSearch
              style={{ width: '100%' }}
              value={filters.casinoId}
              onChange={(value) => handleFilterChange('casinoId', value)}
              optionFilterProp="children"
              filterOption={(input, option) => {
                const text = String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {casinos.map((casino) => (
                <Select.Option key={casino.id} value={casino.id}>
                  {casino.name}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={24} md={12}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Дата от', 'Дата до']}
              onChange={handleDateRangeChange}
              value={
                filters.dateFrom && filters.dateTo
                  ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)]
                  : null
              }
            />
          </Col>
        </Row>
      </Card>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : screenshots.length === 0 ? (
        <Card styles={{ body: { padding: 32, textAlign: 'center' } }}>
          <Empty description="Скриншоты не найдены" />
        </Card>
      ) : (
        <Row gutter={[18, 18]}>
          {screenshots.map((screenshot) => {
            const imgSrc = resolvePublicUploadUrl(screenshot.screenshot_url);
            const meta = galleryMetaItems(screenshot, geos);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={screenshot.screenshot_id}>
                <Card
                  hoverable
                  onClick={() => imgSrc && setPreviewImage(imgSrc)}
                  styles={{ body: { padding: 0 } }}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    overflow: 'hidden',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      minHeight: 132,
                      background: token.colorFillQuaternary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt=""
                        preview={false}
                        style={{ width: '100%', height: 148, objectFit: 'cover' }}
                      />
                    ) : (
                      <Typography.Text type="secondary" style={{ padding: 20 }}>
                        Нет изображения
                      </Typography.Text>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    <Card
                      size="small"
                      title={
                        <Typography.Text strong style={{ fontSize: 14 }}>
                          Данные снимка
                        </Typography.Text>
                      }
                      styles={{
                        header: {
                          minHeight: 40,
                          padding: '8px 12px',
                          borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        },
                        body: { padding: 0 },
                      }}
                    >
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        colon
                        styles={galleryListDescriptionsStyles}
                        items={meta}
                      />
                    </Card>
                    {screenshot.selector ? (
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2, tooltip: screenshot.selector }}
                        style={{ marginTop: 12, marginBottom: 0, fontSize: 12, lineHeight: 1.45 }}
                      >
                        {screenshot.selector}
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                </Card>
                {imgSrc ? (
                  <Image
                    src={imgSrc}
                    alt=""
                    style={{ display: 'none' }}
                    preview={{
                      visible: previewImage === imgSrc,
                      onVisibleChange: (visible) => setPreviewImage(visible ? imgSrc : null),
                    }}
                  />
                ) : null}
              </Col>
            );
          })}
        </Row>
      )}
    </Space>
  );
}
