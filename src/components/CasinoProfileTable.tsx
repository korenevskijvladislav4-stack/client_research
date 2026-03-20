import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import './CasinoProfileTable.css';

const DEFAULT_PAGINATION: TablePaginationConfig = {
  pageSize: 20,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total, range) => `${range[0]}–${range[1]} из ${total}`,
};

function mergePagination(user?: TableProps['pagination']): TableProps['pagination'] {
  if (user === false) return false;
  if (user == null) return DEFAULT_PAGINATION;
  return { ...DEFAULT_PAGINATION, ...user };
}

export type CasinoProfileTableProps<RecordType extends object = Record<string, unknown>> = TableProps<RecordType>;

/**
 * Единое оформление таблиц: анкета казино, реестры (бонусы, платежи, промо, аккаунты, транзакции).
 */
export function CasinoProfileTable<RecordType extends object = Record<string, unknown>>(
  props: CasinoProfileTableProps<RecordType>
) {
  const { className, pagination, size, bordered, ...rest } = props;
  const wrapClass = className ? `casino-profile-table-wrap ${className}` : 'casino-profile-table-wrap';
  return (
    <div className={wrapClass}>
      <Table<RecordType>
        size={size ?? 'small'}
        bordered={bordered ?? true}
        pagination={mergePagination(pagination)}
        {...rest}
      />
    </div>
  );
}
