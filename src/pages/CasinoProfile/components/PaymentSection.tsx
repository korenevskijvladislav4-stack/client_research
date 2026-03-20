import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Image,
  Modal,
  Space,
  Typography,
} from 'antd';
import { EyeOutlined, CreditCardOutlined } from '@ant-design/icons';
import {
  CasinoPayment,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  CasinoPaymentImage,
} from '../../../store/api/casinoPaymentApi';
import ImageUploadArea from './ImageUploadArea';
import { CasinoProfileTable } from '../../../components/CasinoProfileTable';

interface PaymentSectionProps {
  casinoId: number;
  payments: CasinoPayment[] | undefined;
  isLoading: boolean;
  activeGeo?: string;
}

export default function PaymentSection({ casinoId, payments, isLoading }: PaymentSectionProps) {
  const [selectedPayment, setSelectedPayment] = useState<CasinoPayment | null>(null);

  const { data: paymentImages = [] } = useGetPaymentImagesQuery(
    { casinoId, paymentId: selectedPayment?.id ?? 0 },
    { skip: !selectedPayment?.id || !casinoId }
  );
  const [uploadPaymentImages] = useUploadPaymentImagesMutation();

  return (
    <Card size="small" title={<Space><CreditCardOutlined /><span>Платёжные решения</span></Space>}>
      <CasinoProfileTable<CasinoPayment>
        rowKey="id"
        loading={isLoading}
        dataSource={payments ?? []}
        columns={[
          { title: 'Направление', dataIndex: 'direction', width: 100, render: (v: string) => v === 'withdrawal' ? 'Выплата' : 'Депозит' },
          { title: 'GEO', dataIndex: 'geo', width: 60 },
          { title: 'Тип', dataIndex: 'type', width: 140 },
          { title: 'Метод', dataIndex: 'method', width: 140 },
          {
            title: 'Мин.',
            dataIndex: 'min_amount',
            width: 100,
            render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
          },
          {
            title: 'Макс.',
            dataIndex: 'max_amount',
            width: 100,
            render: (v, r) => v != null ? `${Number(v).toLocaleString()} ${r.currency || ''}`.trim() : '—',
          },
          {
            title: '',
            width: 60,
            align: 'right' as const,
            render: (_, p) => (
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setSelectedPayment(p)} />
            ),
          },
        ]}
      />

      <Modal
        title="Платёжный метод"
        open={!!selectedPayment}
        onCancel={() => setSelectedPayment(null)}
        footer={<Button onClick={() => setSelectedPayment(null)}>Закрыть</Button>}
        width={600}
      >
        {selectedPayment && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="GEO">{selectedPayment.geo}</Descriptions.Item>
              <Descriptions.Item label="Тип">{selectedPayment.type}</Descriptions.Item>
              <Descriptions.Item label="Метод">{selectedPayment.method}</Descriptions.Item>
              <Descriptions.Item label="Мин. сумма">
                {selectedPayment.min_amount != null
                  ? `${Number(selectedPayment.min_amount).toLocaleString()} ${selectedPayment.currency || ''}`.trim()
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Макс. сумма">
                {selectedPayment.max_amount != null
                  ? `${Number(selectedPayment.max_amount).toLocaleString()} ${selectedPayment.currency || ''}`.trim()
                  : '—'}
              </Descriptions.Item>
              {selectedPayment.notes && <Descriptions.Item label="Заметки">{selectedPayment.notes}</Descriptions.Item>}
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Изображения платежного метода</Typography.Title>
              {paymentImages.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
                    {paymentImages.map((img: CasinoPaymentImage) => (
                      <Image key={img.id} src={img.url} alt={img.original_name || 'Payment image'} width={90} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
              <ImageUploadArea
                onUpload={async (files) => {
                  await uploadPaymentImages({ casinoId, paymentId: selectedPayment.id, files }).unwrap();
                }}
              />
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
}
