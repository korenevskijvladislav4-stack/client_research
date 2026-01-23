import { Button, Checkbox, Dropdown, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { ColumnConfig } from '../hooks/useColumnSettings';

interface ColumnSelectorProps {
  allColumns: ColumnConfig[];
  visibleKeys: string[];
  toggleColumn: (key: string) => void;
  resetToDefault: () => void;
}

export function ColumnSelector({
  allColumns,
  visibleKeys,
  toggleColumn,
  resetToDefault,
}: ColumnSelectorProps) {
  const menu = (
    <div
      style={{
        background: 'var(--ant-color-bg-elevated)',
        borderRadius: 8,
        padding: '8px 0',
        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
        minWidth: 180,
      }}
    >
      <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid var(--ant-color-border)' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Отображаемые колонки
        </Typography.Text>
      </div>
      <div style={{ padding: '8px 4px', maxHeight: 300, overflow: 'auto' }}>
        {allColumns.map((col) => (
          <div
            key={col.key}
            style={{ padding: '4px 12px', cursor: 'pointer' }}
            onClick={() => toggleColumn(col.key)}
          >
            <Checkbox checked={visibleKeys.includes(col.key)}>
              <Typography.Text style={{ fontSize: 13 }}>{col.title}</Typography.Text>
            </Checkbox>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 12px 4px', borderTop: '1px solid var(--ant-color-border)' }}>
        <Button type="link" size="small" onClick={resetToDefault} style={{ padding: 0 }}>
          Сбросить
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown dropdownRender={() => menu} trigger={['click']} placement="bottomRight">
      <Button icon={<SettingOutlined />} size="small">
        Колонки
      </Button>
    </Dropdown>
  );
}
