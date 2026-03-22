import { useMemo } from 'react';
import { Card, Carousel, Empty, Image, Space, Spin, Tag, Typography, theme } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  useGetCasinoLoyaltyProgramsQuery,
  type CasinoLoyaltyProgram,
} from '../../../store/api/casinoLoyaltyApi';

function MarkdownBlock({ source }: { source: string }) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.55,
        color: token.colorText,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p> }}>
        {source || '—'}
      </ReactMarkdown>
    </div>
  );
}

function ProgramBlock({ program }: { program: CasinoLoyaltyProgram }) {
  const { token } = theme.useToken();
  const orientationLabel = program.orientation === 'sport' ? 'Спорт' : 'Казино';

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <CrownOutlined />
          <span>Программа лояльности</span>
          <Tag>{program.geo}</Tag>
          <Tag color="blue">{orientationLabel}</Tag>
        </Space>
      }
    >
      <Typography.Title level={5} style={{ marginTop: 0, fontSize: 14 }}>
        Условия и статусы
      </Typography.Title>
      <MarkdownBlock source={program.conditions_md} />

      <Typography.Title level={5} style={{ marginTop: 20, fontSize: 14 }}>
        Уровни
      </Typography.Title>
      {program.statuses.length === 0 ? (
        <Typography.Text type="secondary">Нет описанных статусов.</Typography.Text>
      ) : (
        <div className="loyalty-status-carousel">
          <Carousel
            dots
            arrows
            infinite={false}
            draggable
            swipeToSlide
            slidesToShow={3}
            slidesToScroll={1}
            responsive={[
              {
                breakpoint: 1100,
                settings: { slidesToShow: 2, slidesToScroll: 1, arrows: true },
              },
              {
                breakpoint: 640,
                settings: { slidesToShow: 1, slidesToScroll: 1, arrows: true },
              },
            ]}
            style={{ paddingBottom: 28 }}
          >
            {program.statuses.map((s) => (
              <div key={s.id}>
                <div style={{ padding: '4px 10px 8px', height: '100%' }}>
                  <Card
                    size="small"
                    style={{
                      borderColor: token.colorBorderSecondary,
                      background: token.colorFillAlter,
                      minHeight: 140,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    styles={{
                      body: { flex: 1, overflow: 'auto', maxHeight: 240 },
                    }}
                    title={<Typography.Text strong ellipsis={{ tooltip: s.name }}>{s.name}</Typography.Text>}
                  >
                    <MarkdownBlock source={s.description_md} />
                    {(s.images?.length ?? 0) > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                          Скриншоты
                        </Typography.Text>
                        <Image.PreviewGroup>
                          <Space wrap size={8}>
                            {(s.images ?? []).map((img) => (
                              <Image
                                key={img.id}
                                src={img.url}
                                alt=""
                                width={88}
                                height={64}
                                style={{ objectFit: 'cover', borderRadius: 6 }}
                              />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      )}
    </Card>
  );
}

interface LoyaltySectionProps {
  casinoId: number;
  activeGeo?: string;
}

export default function LoyaltySection({ casinoId, activeGeo }: LoyaltySectionProps) {
  const { data: programs = [], isLoading } = useGetCasinoLoyaltyProgramsQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId },
  );

  const filtered = useMemo(() => {
    if (!activeGeo) return programs;
    return programs.filter((p) => p.geo === activeGeo);
  }, [programs, activeGeo]);

  return (
    <div>
      {isLoading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет данных для выбранного GEO" />
      ) : (
        filtered.map((p) => <ProgramBlock key={p.id} program={p} />)
      )}
    </div>
  );
}
