import { useState, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  useGetCasinoProvidersQuery,
  useAddProviderToCasinoMutation,
  useRemoveProviderFromCasinoMutation,
  useExtractAndAddProvidersMutation,
} from '../../../store/api/casinoProviderApi';
import { useGetProvidersQuery } from '../../../store/api/referenceApi';

interface ProvidersEditSectionProps {
  casinoId: number;
  activeGeo?: string;
}

export default function ProvidersEditSection({ casinoId, activeGeo }: ProvidersEditSectionProps) {
  const { data: providers } = useGetProvidersQuery();
  const { data: casinoProviders = [], isLoading } = useGetCasinoProvidersQuery(
    { casinoId, geo: activeGeo },
    { skip: !casinoId },
  );
  const [addProvider] = useAddProviderToCasinoMutation();
  const [removeProvider] = useRemoveProviderFromCasinoMutation();
  const [extractProviders, { isLoading: extracting }] = useExtractAndAddProvidersMutation();

  const [newProviderInput, setNewProviderInput] = useState<number | string | null>(null);
  const [aiText, setAiText] = useState('');

  const providerOptions = useMemo(
    () => (providers ?? []).map((p) => ({ value: p.id, label: p.name })),
    [providers],
  );

  if (!activeGeo) {
    return <Typography.Text type="secondary">Выберите GEO, чтобы управлять списком провайдеров.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* Manual add */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Typography.Text type="secondary">Добавить:</Typography.Text>
        <Select
          style={{ minWidth: 240 }}
          placeholder="Выберите или введите"
          options={providerOptions}
          mode="tags"
          maxCount={1}
          value={newProviderInput != null ? [newProviderInput] : undefined}
          onChange={(val) => setNewProviderInput(Array.isArray(val) && val.length > 0 ? val[0] : null)}
          showSearch
          filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
        />
        <Button type="primary"
          onClick={async () => {
            if (newProviderInput == null || newProviderInput === '') { message.warning('Выберите провайдера'); return; }
            try {
              const isId = typeof newProviderInput === 'number' || (typeof newProviderInput === 'string' && /^\d+$/.test(newProviderInput));
              if (isId) {
                await addProvider({ casinoId, provider_id: Number(newProviderInput), geo: activeGeo }).unwrap();
              } else {
                await addProvider({ casinoId, provider_name: String(newProviderInput).trim(), geo: activeGeo }).unwrap();
              }
              message.success('Провайдер добавлен');
              setNewProviderInput(null);
            } catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
          }}
        >Добавить</Button>
      </div>

      {/* AI extraction */}
      <div>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Или извлеките провайдеров через ИИ:
        </Typography.Text>
        <Input.TextArea rows={4} placeholder="Вставьте HTML, JSON или список провайдеров..."
          value={aiText} onChange={(e) => setAiText(e.target.value)} style={{ marginBottom: 8 }}
        />
        <Button type="primary" loading={extracting}
          onClick={async () => {
            if (!aiText.trim()) { message.warning('Введите текст'); return; }
            try {
              const result = await extractProviders({ casinoId, text: aiText, geo: activeGeo }).unwrap();
              message.success(`Извлечено: ${result.names.length}, добавлено: ${result.added}`);
              setAiText('');
            } catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
          }}
        >Извлечь через ИИ</Button>
      </div>

      {/* Current list */}
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Список по GEO «{activeGeo}»:
        </Typography.Text>
        {isLoading ? (
          <Typography.Text type="secondary">Загрузка...</Typography.Text>
        ) : casinoProviders.length === 0 ? (
          <Typography.Text type="secondary">Нет провайдеров. Добавьте вручную или через ИИ.</Typography.Text>
        ) : (
          <Space wrap size={[8, 8]}>
            {casinoProviders.map((cp) => (
              <Tag key={cp.id} closable
                onClose={async () => {
                  try {
                    await removeProvider({ casinoId, providerId: cp.provider_id, geo: activeGeo }).unwrap();
                    message.success('Провайдер отвязан');
                  } catch (e: any) { message.error(e?.data?.error ?? 'Ошибка'); }
                }}
              >{cp.provider_name}</Tag>
            ))}
          </Space>
        )}
      </div>
    </Space>
  );
}
