import { Card, Table, Typography, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { ReactNode } from 'react';

interface DataTableProps<T> {
  title?: ReactNode;
  description?: ReactNode;
  toolbar?: ReactNode;
  columns: ColumnsType<T>;
  data: T[];
  rowKey: string | ((record: T) => string);
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  scrollX?: number;
  emptyHint?: string;
}

export function DataTable<T extends object>({
  title,
  description,
  toolbar,
  columns,
  data,
  rowKey,
  loading,
  pagination = { pageSize: 20, showSizeChanger: false },
  scrollX,
  emptyHint,
}: DataTableProps<T>) {
  return (
    <Card
      size="small"
      style={{ borderRadius: 12, boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }}
      bodyStyle={{ padding: 16 }}
      title={
        title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {title}
              </Typography.Title>
              {description && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {description}
                </Typography.Text>
              )}
            </div>
            {toolbar && <Space>{toolbar}</Space>}
          </div>
        )
      }
    >
      <Table<T>
        rowKey={rowKey as any}
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={pagination}
        scroll={scrollX ? { x: scrollX } : undefined}
        locale={{
          emptyText: emptyHint || 'Нет данных для отображения',
        }}
      />
    </Card>
  );
}

