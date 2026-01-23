import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Image,
  Select,
  DatePicker,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useGetAllScreenshotsQuery, ScreenshotFilters } from '../../store/api/slotSelectorApi';
import { useGetCasinosQuery } from '../../store/api/casinoApi';
import { useGetGeosQuery } from '../../store/api/geoApi';
import dayjs, { Dayjs } from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ScreenshotsGallery() {
  const [filters, setFilters] = useState<ScreenshotFilters>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fetch filtered data
  const { data: screenshots = [], isLoading } = useGetAllScreenshotsQuery(filters);
  
  // Fetch ALL screenshots (without filters) to get unique values for filter options
  const { data: allScreenshots = [] } = useGetAllScreenshotsQuery({});
  const { data: casinos = [] } = useGetCasinosQuery();
  const { data: geos = [] } = useGetGeosQuery();

  // Extract unique values for filters from ALL screenshots (not filtered)
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

  const handleFilterChange = (key: keyof ScreenshotFilters, value: any) => {
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
        const newFilters = { ...prev };
        delete newFilters.dateFrom;
        delete newFilters.dateTo;
        return newFilters;
      });
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>Галерея скриншотов</Title>

        {/* Filters */}
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space align="center">
              <FilterOutlined />
              <Title level={5} style={{ margin: 0 }}>
                Фильтры
              </Title>
              {hasActiveFilters && (
                <a onClick={clearFilters} style={{ marginLeft: 'auto' }}>
                  Очистить фильтры
                </a>
              )}
            </Space>

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
                  placeholder="Проект (Казино)"
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
          </Space>
        </Card>

        {/* Gallery */}
        <Card>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : screenshots.length === 0 ? (
            <Empty description="Скриншоты не найдены" />
          ) : (
            <Row gutter={[16, 16]}>
              {screenshots.map((screenshot) => (
                <Col key={screenshot.screenshot_id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
                      <Image
                        src={screenshot.screenshot_url}
                        alt={`Screenshot ${screenshot.screenshot_id}`}
                        preview={{
                          src: screenshot.screenshot_url,
                          visible: previewImage === screenshot.screenshot_url,
                          onVisibleChange: (visible) =>
                            setPreviewImage(visible ? screenshot.screenshot_url : null),
                        }}
                        style={{ cursor: 'pointer', maxHeight: '200px', objectFit: 'cover' }}
                        onClick={() => setPreviewImage(screenshot.screenshot_url)}
                      />
                    }
                    style={{ height: '100%' }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Tag color="blue">{screenshot.geo}</Tag>
                        {screenshot.section && <Tag>{screenshot.section}</Tag>}
                        {screenshot.category && <Tag color="green">{screenshot.category}</Tag>}
                      </div>
                      <Typography.Text strong>{screenshot.casino_name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(screenshot.screenshot_created_at).format('DD.MM.YYYY HH:mm')}
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </Space>
    </div>
  );
}
