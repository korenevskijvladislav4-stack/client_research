import { useState } from 'react';
import { Card, Pagination, Space, Table, Tag, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useGetCasinoHistoryQuery,
  type HistoryEntry,
} from '../../../store/api/casinoHistoryApi';

// ---------------------------------------------------------------------------
// Action labels
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  set_value: { label: 'Изменение', color: 'blue' },
  clear_value: { label: 'Очистка', color: 'default' },
  create_field: { label: 'Создание поля', color: 'green' },
  update_field: { label: 'Обновление поля', color: 'orange' },
  delete_field: { label: 'Удаление поля', color: 'red' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(val: any): string {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      return str.length > 100 ? str.slice(0, 100) + '…' : str;
    } catch {
      return String(val);
    }
  }
  const str = String(val);
  return str.length > 100 ? str.slice(0, 100) + '…' : str;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CasinoHistoryProps {
  casinoId: number;
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CasinoHistory({ casinoId }: CasinoHistoryProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetCasinoHistoryQuery({
    casinoId,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'date',
      width: 140,
      render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Пользователь',
      dataIndex: 'actor_username',
      key: 'user',
      width: 130,
      render: (v: string) => v || '—',
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (v: string) => {
        const cfg = ACTION_LABELS[v] || { label: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Поле',
      key: 'field',
      width: 160,
      render: (_: unknown, entry: HistoryEntry) =>
        entry.field_label || entry.field_key || '—',
    },
    {
      title: 'Было',
      key: 'old',
      render: (_: unknown, entry: HistoryEntry) => (
        <Typography.Text type="secondary">
          {formatValue(entry.old_value_json)}
        </Typography.Text>
      ),
    },
    {
      title: 'Стало',
      key: 'new',
      render: (_: unknown, entry: HistoryEntry) => formatValue(entry.new_value_json),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          <Typography.Title level={5} style={{ margin: 0 }}>
            История изменений
          </Typography.Title>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={entries}
        columns={columns}
        pagination={false}
        locale={{ emptyText: 'Нет записей в истории' }}
      />
      {total > PAGE_SIZE && (
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            showTotal={(t, range) => `${range[0]}-${range[1]} из ${t}`}
            onChange={setPage}
          />
        </div>
      )}
    </Card>
  );
}
