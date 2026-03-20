import { Alert, Avatar, Button, Drawer, Space, Typography, theme } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface SettingsEntityDrawerProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  /** true — режим редактирования */
  editing: boolean;
  /** Иконка в заголовке (например <FormOutlined />) */
  icon: ReactNode;
  titleCreate: string;
  titleEdit: string;
  subtitleCreate?: ReactNode;
  subtitleEdit?: ReactNode;
  alertCreate?: { message: string; description?: ReactNode };
  alertEdit?: { message: string; description?: ReactNode };
  onPrimaryClick: () => void;
  primaryLabelCreate: string;
  primaryLabelEdit?: string;
  children: ReactNode;
}

/**
 * Единый вид боковой панели создания/редактирования сущностей в настройках (как в анкете казино).
 */
export function SettingsEntityDrawer({
  open,
  onClose,
  width = 560,
  editing,
  icon,
  titleCreate,
  titleEdit,
  subtitleCreate,
  subtitleEdit,
  alertCreate,
  alertEdit,
  onPrimaryClick,
  primaryLabelCreate,
  primaryLabelEdit,
  children,
}: SettingsEntityDrawerProps) {
  const { token } = theme.useToken();
  const isEdit = editing;

  const alertCfg = isEdit ? alertEdit : alertCreate;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={width}
      destroyOnClose
      styles={{
        header: { alignItems: 'flex-start' },
        body: { paddingTop: 16 },
        footer: { borderTop: `1px solid ${token.colorBorderSecondary}` },
      }}
      title={
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            paddingRight: 28,
            maxWidth: '100%',
          }}
        >
          <Avatar
            size={48}
            style={{
              background: isEdit ? token.colorWarning : token.colorPrimary,
              flexShrink: 0,
            }}
            icon={isEdit ? <EditOutlined /> : icon}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
              {isEdit ? titleEdit : titleCreate}
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}
            >
              {isEdit ? subtitleEdit ?? subtitleCreate : subtitleCreate}
            </Typography.Text>
          </div>
        </div>
      }
      footer={
        <Space wrap style={{ width: '100%', justifyContent: 'flex-end', rowGap: 8 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" style={{ minWidth: 160 }} onClick={onPrimaryClick}>
            {isEdit ? primaryLabelEdit ?? primaryLabelCreate : primaryLabelCreate}
          </Button>
        </Space>
      }
    >
      {alertCfg && (
        <Alert
          type="info"
          showIcon
          icon={isEdit ? <EditOutlined /> : <PlusOutlined />}
          message={alertCfg.message}
          description={
            alertCfg.description ? (
              <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorTextSecondary }}>{alertCfg.description}</div>
            ) : undefined
          }
          style={{ marginBottom: 20 }}
        />
      )}
      {children}
    </Drawer>
  );
}
