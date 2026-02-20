import { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Switch, Space, Drawer, Typography } from 'antd';
import {
  BankOutlined,
  MailOutlined,
  DollarOutlined,
  CreditCardOutlined,
  SettingOutlined,
  LogoutOutlined,
  BarChartOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  DiffOutlined,
  KeyOutlined,
  UserOutlined,
  PictureOutlined,
  HistoryOutlined,
  TrophyOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { logout } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/casinos', icon: <BankOutlined />, label: <Link to="/casinos">Казино</Link> },
  { key: '/casinos/compare', icon: <DiffOutlined />, label: <Link to="/casinos/compare">Сравнение</Link> },
  { key: '/bonuses', icon: <DollarOutlined />, label: <Link to="/bonuses">Бонусы</Link> },
  { key: '/payments', icon: <CreditCardOutlined />, label: <Link to="/payments">Платежи</Link> },
  { key: '/promos', icon: <TrophyOutlined />, label: <Link to="/promos">Промо</Link> },
  { key: '/accounts', icon: <KeyOutlined />, label: <Link to="/accounts">Аккаунты</Link> },
  { key: '/accounts/transactions', icon: <HistoryOutlined />, label: <Link to="/accounts/transactions">История транзакций</Link> },
  { key: '/emails', icon: <MailOutlined />, label: <Link to="/emails">Почта</Link> },
  { key: '/screenshots', icon: <PictureOutlined />, label: <Link to="/screenshots">Скриншоты</Link> },
  { type: 'divider' as const },
  {
    key: 'analytics-submenu',
    icon: <BarChartOutlined />,
    label: 'Аналитика',
    children: [
      { key: '/profile-settings-analytics', icon: <BarChartOutlined />, label: <Link to="/profile-settings-analytics">Профиль</Link> },
      { key: '/email-analytics', icon: <MailOutlined />, label: <Link to="/email-analytics">Почта</Link> },
      { key: '/provider-analytics', icon: <ApiOutlined />, label: <Link to="/provider-analytics">Провайдеры</Link> },
    ],
  },
  {
    key: 'settings-submenu',
    icon: <SettingOutlined />,
    label: 'Настройки',
    children: [
      { key: '/profile-settings', icon: <SettingOutlined />, label: <Link to="/profile-settings">Профиль</Link> },
      { key: '/profile-fields', icon: <SettingOutlined />, label: <Link to="/profile-fields">Поля</Link> },
      { key: '/email-topics', icon: <MailOutlined />, label: <Link to="/email-topics">Темы писем</Link> },
      { key: '/users', icon: <UserOutlined />, label: <Link to="/users">Пользователи</Link> },
    ],
  },
];

export function AppLayout() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { token } = theme.useToken();
  const { mode, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Find selected key including submenu items
  const findSelectedKey = () => {
    for (const item of menuItems) {
      if ('key' in item && item.key === location.pathname) return item.key;
      if ('children' in item && item.children) {
        const child = item.children.find((c: any) => c.key === location.pathname);
        if (child) return child.key;
      }
    }
    if (location.pathname.startsWith('/casinos')) return '/casinos';
    return location.pathname;
  };

  const selectedKey = findSelectedKey();
  
  // Determine which submenu should be open
  const getOpenKeys = () => {
    if (location.pathname === '/profile-settings-analytics' || location.pathname === '/email-analytics' || location.pathname === '/provider-analytics') return ['analytics-submenu'];
    if (location.pathname.startsWith('/profile') || location.pathname === '/email-topics' || location.pathname === '/users') return ['settings-submenu'];
    return [];
  };
  const openKeys = getOpenKeys();

  // Determine sidebar theme and colors based on mode
  const siderTheme = mode === 'dark' ? 'dark' : 'light';
  const siderTextColor = mode === 'dark' ? token.colorTextLightSolid : token.colorText;
  const siderSecondaryTextColor = mode === 'dark' ? token.colorTextSecondary : token.colorTextSecondary;
  const siderBg = mode === 'dark' ? '#0f1629' : '#ffffff';
  const themeToggleBg = mode === 'dark' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(0,0,0,0.05)';

  const menuContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '16px',
          fontSize: 15,
          fontWeight: 600,
          color: siderTextColor,
          letterSpacing: '-0.3px',
          flexShrink: 0,
        }}
      >
        Research CRM
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          mode="inline"
          theme={siderTheme}
          selectedKeys={[selectedKey as string]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          style={{
            background: 'transparent',
            border: 0,
            paddingBottom: 16,
          }}
          onClick={() => {
            if (isMobile) {
              setMobileMenuOpen(false);
            }
          }}
        />
      </div>
      <div 
        style={{ 
          flexShrink: 0,
          padding: '12px',
          paddingBottom: 60, // Space for collapse trigger button
          borderTop: `1px solid ${token.colorBorder}`,
          background: siderBg,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 6,
              background: themeToggleBg,
            }}
          >
            <Space size={8}>
              {mode === 'dark' ? (
                <MoonOutlined style={{ color: siderSecondaryTextColor }} />
              ) : (
                <SunOutlined style={{ color: siderSecondaryTextColor }} />
              )}
              {!collapsed && (
                <span style={{ color: siderSecondaryTextColor, fontSize: 13 }}>
                  {mode === 'dark' ? 'Тёмная' : 'Светлая'}
                </span>
              )}
            </Space>
            <Switch
              size="small"
              checked={mode === 'dark'}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => dispatch(logout())}
            style={{ 
              width: '100%', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: siderSecondaryTextColor,
              height: 32,
            }}
          >
            {!collapsed && 'Выйти'}
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {isMobile ? (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: 56,
              background: token.colorBgContainer,
              borderBottom: `1px solid ${token.colorBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 1000,
            }}
          >
            <Typography.Title level={4} style={{ margin: 0, fontSize: 18 }}>
              Research CRM
            </Typography.Title>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
          <Drawer
            title="Меню"
            placement="left"
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            size="default"
            styles={{
              body: {
                background: siderBg,
                padding: 0,
              },
            }}
          >
            {menuContent}
          </Drawer>
          <Content style={{ padding: '72px 16px 16px', minHeight: '100vh', marginLeft: 0 }}>
            <Outlet />
          </Content>
        </>
      ) : (
        <>
          <Sider
            width={200}
            theme={siderTheme}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            trigger={null}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              overflow: 'hidden',
              background: siderBg,
              borderRight: `1px solid ${token.colorBorder}`,
            }}
          >
            {menuContent}
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderTop: `1px solid ${token.colorBorder}`,
                background: siderBg,
                cursor: 'pointer',
                zIndex: 10,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = siderBg;
              }}
            >
              <MenuOutlined style={{ color: siderSecondaryTextColor, fontSize: 16 }} />
            </div>
          </Sider>
          <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
            <Content style={{ padding: '24px', minHeight: '100vh' }}>
              <Outlet />
            </Content>
          </Layout>
        </>
      )}
    </Layout>
  );
}

