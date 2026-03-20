import { Card, Space, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

export interface PageHeaderCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Кнопки справа (экспорт, колонки и т.д.) */
  actions?: ReactNode;
}

/**
 * Компактная шапка страницы в духе B2B/SaaS: плотная сетка, без декора.
 */
export function PageHeaderCard({ title, description, actions }: PageHeaderCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: token.borderRadius,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: 'none',
      }}
      styles={{
        body: { padding: '12px 18px' },
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          rowGap: 10,
        }}
      >
        <div
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            maxWidth: 'min(100%, 52rem)',
          }}
        >
          <Typography.Title
            level={5}
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Typography.Title>
          {description != null && description !== false && (
            <Typography.Paragraph
              type="secondary"
              ellipsis={{ rows: 2, tooltip: true }}
              style={{
                margin: '2px 0 0',
                marginBottom: 0,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {description}
            </Typography.Paragraph>
          )}
        </div>
        {actions != null && actions !== false && (
          <Space wrap size={8} style={{ flexShrink: 0, alignItems: 'center' }}>
            {actions}
          </Space>
        )}
      </div>
    </Card>
  );
}
