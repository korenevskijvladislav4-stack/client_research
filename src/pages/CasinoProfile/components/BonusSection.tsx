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
import { EyeOutlined, GiftOutlined } from '@ant-design/icons';
import {
  CasinoBonus,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  CasinoBonusImage,
} from '../../../store/api/casinoBonusApi';
import ImageUploadArea from './ImageUploadArea';

const fmt = (n: unknown): string | number => {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};

const fmtAmount = (value: unknown, currency?: string | null): string => {
  if (value == null) return '—';
  const formatted = fmt(value);
  return currency ? `${formatted} ${currency}` : String(formatted);
};

interface BonusSectionProps {
  casinoId: number;
  bonuses: CasinoBonus[] | undefined;
  isLoading: boolean;
  activeGeo?: string;
}

export default function BonusSection({ casinoId, bonuses, isLoading, activeGeo }: BonusSectionProps) {
  const [selectedBonus, setSelectedBonus] = useState<CasinoBonus | null>(null);

  const { data: bonusImages = [] } = useGetBonusImagesQuery(
    { casinoId, bonusId: selectedBonus?.id ?? 0 },
    { skip: !selectedBonus?.id || !casinoId }
  );
  const [uploadBonusImages] = useUploadBonusImagesMutation();

  return (
    <Card size="small" title={<Space><GiftOutlined /><span>Бонусы{activeGeo ? ` (${activeGeo})` : ''}</span></Space>}>
      <Table<CasinoBonus>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={(bonuses ?? []).filter((b) => (activeGeo ? b.geo === activeGeo : true))}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 700 }}
        columns={[
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Название', dataIndex: 'name', width: 150, ellipsis: true },
          {
            title: 'Категория',
            dataIndex: 'bonus_category',
            width: 80,
            render: (v) => ({ casino: 'Казино', sport: 'Спорт' }[v as string] || v || 'Казино'),
          },
          {
            title: 'Вид',
            dataIndex: 'bonus_kind',
            width: 80,
            render: (v) => ({ deposit: 'Депозит', nodeposit: 'Бездеп', cashback: 'Кешбек', rakeback: 'Рейкбек' }[v as string] || v || '—'),
          },
          {
            title: 'Тип',
            dataIndex: 'bonus_type',
            width: 80,
            render: (v) => ({
              cash: 'Кэш', freespin: 'FS', combo: 'Комбо', freebet: 'Фрибет',
              wagering: 'Вейджеринг', insurance: 'Страховка', accumulator: 'Аккумулятор', odds_boost: 'Повышение коэф.',
            }[v as string] || v || '—'),
          },
          {
            title: 'Бонус',
            width: 120,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.bonus_value != null) {
                parts.push(b.bonus_unit === 'percent' ? `${fmt(b.bonus_value)}%` : (b.currency ? `${fmt(b.bonus_value)} ${b.currency}` : `${fmt(b.bonus_value)}`));
              }
              if (b.freespins_count) parts.push(`${fmt(b.freespins_count)} FS`);
              if (b.cashback_percent) parts.push(`${fmt(b.cashback_percent)}%`);
              return parts.length > 0 ? parts.join('+') : '—';
            },
          },
          {
            title: 'Мин.',
            dataIndex: 'min_deposit',
            width: 80,
            render: (v, b) => fmtAmount(v, b.currency),
          },
          {
            title: 'Вейджер',
            width: 100,
            render: (_, b) => {
              const parts: string[] = [];
              if (b.wagering_requirement != null) parts.push(`кэш x${fmt(b.wagering_requirement)}`);
              if (b.wagering_freespin != null) parts.push(`FS x${fmt(b.wagering_freespin)}`);
              return parts.length > 0 ? parts.join(', ') : '—';
            },
          },
          {
            title: '',
            width: 40,
            align: 'right' as const,
            render: (_, b) => (
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setSelectedBonus(b)} />
            ),
          },
        ]}
      />

      <Modal
        title={selectedBonus?.name || 'Информация о бонусе'}
        open={!!selectedBonus}
        onCancel={() => setSelectedBonus(null)}
        footer={<Button onClick={() => setSelectedBonus(null)}>Закрыть</Button>}
        width={700}
      >
        {selectedBonus && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="GEO"><Tag>{selectedBonus.geo}</Tag></Descriptions.Item>
              <Descriptions.Item label="Категория">
                {({ casino: 'Казино', sport: 'Спорт' }[selectedBonus.bonus_category || 'casino'] || selectedBonus.bonus_category || 'Казино')}
              </Descriptions.Item>
              <Descriptions.Item label="Вид бонуса">
                {({
                  deposit: 'Депозитный', nodeposit: 'Бездепозитный', cashback: 'Кешбек', rakeback: 'Рейкбек',
                } as Record<string, string>)[selectedBonus.bonus_kind || ''] || selectedBonus.bonus_kind || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Тип бонуса">
                {({
                  cash: 'Кэш-бонус', freespin: 'Фриспин-бонус', combo: 'Комбинированный',
                  freebet: 'Фрибет', wagering: 'Вейджеринг', insurance: 'Страховка',
                  accumulator: 'Аккумулятор', odds_boost: 'Повышение коэффициентов',
                } as Record<string, string>)[selectedBonus.bonus_type || ''] || selectedBonus.bonus_type || '—'}
              </Descriptions.Item>
              {selectedBonus.currency && <Descriptions.Item label="Валюта">{selectedBonus.currency}</Descriptions.Item>}
              {selectedBonus.bonus_value != null && (
                <Descriptions.Item label="Размер кэш-бонуса">
                  {selectedBonus.bonus_unit === 'percent' ? `${fmt(selectedBonus.bonus_value)}%` : fmtAmount(selectedBonus.bonus_value, selectedBonus.currency)}
                </Descriptions.Item>
              )}
              {selectedBonus.max_bonus != null && <Descriptions.Item label="Макс. бонус">{fmtAmount(selectedBonus.max_bonus, selectedBonus.currency)}</Descriptions.Item>}
              {selectedBonus.freespins_count != null && <Descriptions.Item label="Количество фриспинов">{selectedBonus.freespins_count} FS</Descriptions.Item>}
              {selectedBonus.freespin_value != null && <Descriptions.Item label="Стоимость спина">{fmtAmount(selectedBonus.freespin_value, selectedBonus.currency)}</Descriptions.Item>}
              {selectedBonus.freespin_game && <Descriptions.Item label="Игра для фриспинов">{selectedBonus.freespin_game}</Descriptions.Item>}
              {selectedBonus.cashback_percent != null && <Descriptions.Item label="Процент возврата">{fmt(selectedBonus.cashback_percent)}%</Descriptions.Item>}
              {selectedBonus.cashback_percent_min != null && <Descriptions.Item label="Мин. сумма кешбека">{fmt(selectedBonus.cashback_percent_min)}%</Descriptions.Item>}
              {selectedBonus.cashback_percent_max != null && <Descriptions.Item label="Макс. сумма кешбека">{fmt(selectedBonus.cashback_percent_max)}%</Descriptions.Item>}
              {selectedBonus.cashback_period && (
                <Descriptions.Item label="Период возврата">
                  {({ daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно' } as Record<string, string>)[selectedBonus.cashback_period] || selectedBonus.cashback_period}
                </Descriptions.Item>
              )}
              {selectedBonus.min_deposit != null && <Descriptions.Item label="Мин. депозит">{fmtAmount(selectedBonus.min_deposit, selectedBonus.currency)}</Descriptions.Item>}
              {(selectedBonus.wagering_requirement != null || selectedBonus.wagering_freespin != null) && (
                <Descriptions.Item label="Вейджер">
                  {[
                    selectedBonus.wagering_requirement != null && `кэш x${fmt(selectedBonus.wagering_requirement)}`,
                    selectedBonus.wagering_freespin != null && `фриспины x${fmt(selectedBonus.wagering_freespin)}`,
                  ].filter(Boolean).join(', ')}
                </Descriptions.Item>
              )}
              {selectedBonus.wagering_time_limit && <Descriptions.Item label="Время на отыгрыш">{selectedBonus.wagering_time_limit}</Descriptions.Item>}
              {selectedBonus.wagering_games && <Descriptions.Item label="Игры для отыгрыша">{selectedBonus.wagering_games}</Descriptions.Item>}
              {selectedBonus.notes && <Descriptions.Item label="Заметки">{selectedBonus.notes}</Descriptions.Item>}
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Изображения бонуса</Typography.Title>
              {bonusImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                    {bonusImages.map((img: CasinoBonusImage) => (
                      <Image key={img.id} src={img.url} alt={img.original_name || 'Bonus image'} width={90} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
              <ImageUploadArea
                onUpload={async (files) => {
                  await uploadBonusImages({ casinoId, bonusId: selectedBonus.id, files }).unwrap();
                }}
              />
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
}
