import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Image,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EyeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  CasinoPromo,
  useGetPromoImagesQuery,
  useUploadPromoImagesMutation,
  CasinoPromoImage,
  PromoCategory,
  PromoStatus,
} from '../../../store/api/casinoPromoApi';
import ImageUploadArea from './ImageUploadArea';
import dayjs from 'dayjs';

interface PromoSectionProps {
  casinoId: number;
  casinoName?: string;
  promos: CasinoPromo[] | undefined;
  isLoading: boolean;
  activeGeo?: string;
}

const PROMO_CATEGORY_LABELS: Record<string, string> = {
  tournament: 'Турнир',
  promotion: 'Акция',
  lottery: 'Лотерея',
};

const PROMO_CATEGORY_COLORS: Record<string, string> = {
  tournament: 'blue',
  promotion: 'purple',
  lottery: 'gold',
};

const PROMO_STATUS_COLORS: Record<PromoStatus, string> = {
  active: 'green',
  paused: 'orange',
  expired: 'red',
  draft: 'default',
};

const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  active: 'Активен',
  paused: 'Пауза',
  expired: 'Истёк',
  draft: 'Черновик',
};

export default function PromoSection({ casinoId, casinoName, promos, isLoading, activeGeo }: PromoSectionProps) {
  const [viewingPromo, setViewingPromo] = useState<CasinoPromo | null>(null);

  const { data: promoImages = [] } = useGetPromoImagesQuery(
    { casinoId, promoId: viewingPromo?.id ?? 0 },
    { skip: !casinoId || !viewingPromo?.id }
  );
  const [uploadPromoImages] = useUploadPromoImagesMutation();

  return (
    <>
      <Card size="small" title={<Space><ThunderboltOutlined /><span>Промо{activeGeo ? ` (${activeGeo})` : ''}</span></Space>}>
        <Table<CasinoPromo>
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={(promos ?? []).filter((p) => (activeGeo ? p.geo === activeGeo : true))}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1000 }}
          columns={[
            { title: 'GEO', dataIndex: 'geo', width: 60 },
            {
              title: 'Категория',
              dataIndex: 'promo_category',
              width: 110,
              render: (v: PromoCategory) => (
                <Tag color={PROMO_CATEGORY_COLORS[v] || 'default'}>{PROMO_CATEGORY_LABELS[v] || v}</Tag>
              ),
            },
            { title: 'Тип турнира', dataIndex: 'promo_type', width: 110, ellipsis: true, render: (v: string) => v || '—' },
            { title: 'Название турнира', dataIndex: 'name', width: 180, ellipsis: true },
            {
              title: 'Тип периода',
              width: 120,
              render: (_: unknown, r: CasinoPromo) => {
                const t = r.period_type ?? 'fixed';
                return ({ daily: 'Ежедневный', weekly: 'Еженедельный', monthly: 'Ежемесячный' } as Record<string, string>)[t] || 'Фикс. даты';
              },
            },
            {
              title: 'Период проведения',
              width: 150,
              render: (_: unknown, r: CasinoPromo) => {
                if (!r.period_start && !r.period_end) return '';
                const s = r.period_start ? dayjs(r.period_start).format('DD.MM.YY') : '?';
                const e = r.period_end ? dayjs(r.period_end).format('DD.MM.YY') : '?';
                return `${s} – ${e}`;
              },
            },
            { title: 'Провайдер', dataIndex: 'provider', width: 120, ellipsis: true, render: (v: string) => v || '—' },
            { title: 'Общий ПФ', dataIndex: 'prize_fund', width: 100, ellipsis: true, render: (v: string) => v || '—' },
            { title: 'Механика', dataIndex: 'mechanics', width: 140, ellipsis: true, render: (v: string) => v || '—' },
            { title: 'Мин. ставка', dataIndex: 'min_bet', width: 100, render: (v: string) => v || '—' },
            { title: 'Вейджер на приз', dataIndex: 'wagering_prize', width: 110, render: (v: string) => v || '—' },
            {
              title: '',
              width: 40,
              align: 'right' as const,
              render: (_, r: CasinoPromo) => (
                <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewingPromo(r)} />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={
          <Space align="center">
            <Tag color={PROMO_CATEGORY_COLORS[viewingPromo?.promo_category || ''] || 'default'}>
              {PROMO_CATEGORY_LABELS[viewingPromo?.promo_category || ''] || viewingPromo?.promo_category}
            </Tag>
            <span>{viewingPromo?.name || 'Промо'}</span>
          </Space>
        }
        open={!!viewingPromo}
        onCancel={() => setViewingPromo(null)}
        footer={null}
        width={640}
      >
        {viewingPromo && (
          <>
            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 500, width: 200 }}>
              <Descriptions.Item label="GEO"><Tag>{viewingPromo.geo}</Tag></Descriptions.Item>
              <Descriptions.Item label="Конкурент">{casinoName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Категория">
                <Tag color={PROMO_CATEGORY_COLORS[viewingPromo.promo_category] || 'default'}>
                  {PROMO_CATEGORY_LABELS[viewingPromo.promo_category] || viewingPromo.promo_category}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Тип турнира">{viewingPromo.promo_type || '—'}</Descriptions.Item>
              <Descriptions.Item label="Название турнира">{viewingPromo.name}</Descriptions.Item>
              <Descriptions.Item label="Тип периода">
                {({ daily: 'Ежедневный', weekly: 'Еженедельный', monthly: 'Ежемесячный' } as Record<string, string>)[viewingPromo.period_type || ''] || 'Фиксированные даты'}
              </Descriptions.Item>
              {(viewingPromo.period_start || viewingPromo.period_end) && (
                <Descriptions.Item label="Период проведения">
                  {viewingPromo.period_start ? dayjs(viewingPromo.period_start).format('DD.MM.YYYY') : '—'}
                  {' – '}
                  {viewingPromo.period_end ? dayjs(viewingPromo.period_end).format('DD.MM.YYYY') : '—'}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Провайдер">{viewingPromo.provider || '—'}</Descriptions.Item>
              <Descriptions.Item label="Общий ПФ">{viewingPromo.prize_fund || '—'}</Descriptions.Item>
              <Descriptions.Item label="Механика">{viewingPromo.mechanics || '—'}</Descriptions.Item>
              <Descriptions.Item label="Мин. ставка для участия">{viewingPromo.min_bet || '—'}</Descriptions.Item>
              <Descriptions.Item label="Вейджер на приз">{viewingPromo.wagering_prize || '—'}</Descriptions.Item>
              <Descriptions.Item label="Кнопка участия">{viewingPromo.has_participation_button ? 'Да' : 'Нет'}</Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={PROMO_STATUS_COLORS[viewingPromo.status] ?? 'default'}>
                  {PROMO_STATUS_LABELS[viewingPromo.status] ?? viewingPromo.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Изображения промо</Typography.Title>
              {promoImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                    {promoImages.map((img: CasinoPromoImage) => (
                      <Image key={img.id} src={img.url} alt={img.original_name || 'Promo image'} width={90} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
              <ImageUploadArea
                onUpload={async (files) => {
                  await uploadPromoImages({ casinoId, promoId: viewingPromo.id, files }).unwrap();
                }}
              />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
