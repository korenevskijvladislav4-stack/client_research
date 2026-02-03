import { useMemo } from 'react';
import { Button, Space, Table, message } from 'antd';
import {
  useGetSettingsFieldsQuery,
  useGetProfileContextsQuery,
  useGetCasinoProfileSettingsQuery,
  useUpdateProfileSettingMutation,
} from '../store/api/profileSettingsApi';
import { useGetGeosQuery } from '../store/api/geoApi';

interface ProfileSettingsTableProps {
  casinoId: number;
  activeGeo?: string;
  onGeoChange?: (geo: string | undefined) => void;
  readOnly?: boolean;
  /** Только GEO, на которые работает казино. Если задано — в фильтре показываются только они. */
  casinoGeoCodes?: string[];
}

export function ProfileSettingsTable({ casinoId, activeGeo, onGeoChange, readOnly, casinoGeoCodes }: ProfileSettingsTableProps) {
  const { data: geos = [] } = useGetGeosQuery();
  const { data: fields = [] } = useGetSettingsFieldsQuery();
  const { data: contexts = [] } = useGetProfileContextsQuery();
  const { data: settings = [] } = useGetCasinoProfileSettingsQuery(
    { casinoId, geo: activeGeo || '' },
    { skip: !activeGeo }
  );
  const [updateSetting] = useUpdateProfileSettingMutation();

  // Filter only active fields and contexts, sorted
  const activeFields = useMemo(
    () => fields.filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const activeContexts = useMemo(
    () => contexts.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [contexts]
  );

  // GEO для кнопок фильтра: только те, на которые работает казино (если передано casinoGeoCodes)
  const activeGeos = useMemo(() => {
    let list = geos.filter((g) => g.is_active);
    if (casinoGeoCodes && casinoGeoCodes.length > 0) {
      const allowed = new Set(casinoGeoCodes);
      list = list.filter((g) => allowed.has(g.code));
    }
    return list;
  }, [geos, casinoGeoCodes]);

  // Build a map of (field_id, context_id) -> value for quick lookup
  const settingsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of settings) {
      map.set(`${s.field_id}_${s.context_id}`, s.value);
    }
    return map;
  }, [settings]);

  const handleToggle = async (fieldId: number, contextId: number, currentValue: boolean) => {
    if (readOnly || !activeGeo) return;

    try {
      await updateSetting({
        casinoId,
        data: {
          geo: activeGeo,
          field_id: fieldId,
          context_id: contextId,
          value: !currentValue,
        },
      }).unwrap();
    } catch (e: any) {
      message.error(e?.data?.message ?? 'Ошибка обновления');
    }
  };

  const renderCell = (fieldId: number, contextId: number) => {
    const key = `${fieldId}_${contextId}`;
    const value = settingsMap.get(key) ?? false;

    if (readOnly) {
      return value ? 'Да' : 'Нет';
    }

    return (
      <Button
        type={value ? 'primary' : 'default'}
        size="small"
        onClick={() => handleToggle(fieldId, contextId, value)}
        style={{ width: 60 }}
      >
        {value ? 'Да' : 'Нет'}
      </Button>
    );
  };

  // Build table data: each row is a field
  const dataSource = activeFields.map((field) => ({
    key: field.id,
    field_name: field.name,
    field_id: field.id,
  }));

  // Build columns: first column is field name, then one column per context
  const columns = [
    {
      title: 'Поле',
      dataIndex: 'field_name',
      key: 'field_name',
      fixed: 'left' as const,
      width: 200,
    },
    ...activeContexts.map((context) => ({
      title: context.name,
      key: `context_${context.id}`,
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => renderCell(record.field_id, context.id),
    })),
  ];

  if (activeFields.length === 0 && activeContexts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        Настройки профиля не настроены. Добавьте поля и контексты в разделе "Настройки профиля".
      </div>
    );
  }

  if (activeFields.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        Не созданы поля (строки). Добавьте поля в разделе "Настройки профиля" → "Поля (строки)".
      </div>
    );
  }

  if (activeContexts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        Не созданы контексты (столбцы). Добавьте контексты в разделе "Настройки профиля" → "Контексты (столбцы)".
      </div>
    );
  }

  return (
    <div>
      {/* GEO buttons */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          size="small"
          type={!activeGeo ? 'primary' : 'default'}
          onClick={() => onGeoChange?.(undefined)}
        >
          Все
        </Button>
        {activeGeos.map((g) => (
          <Button
            key={g.code}
            size="small"
            type={activeGeo === g.code ? 'primary' : 'default'}
            onClick={() => onGeoChange?.(g.code)}
          >
            {g.code}
          </Button>
        ))}
      </Space>

      {/* Table */}
      {activeGeo ? (
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          Выберите GEO для просмотра настроек профиля.
        </div>
      )}
    </div>
  );
}
