import { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Switch, Space, Drawer, Typography, Avatar } from 'antd';
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
  MessageOutlined,
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
  { key: '/chat', icon: <MessageOutlined />, label: <Link to="/chat">Чат с ИИ</Link> },
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
  const siderSecondaryTextColor = token.colorTextSecondary;
  const siderBg = mode === 'dark' ? '#020617' : '#ffffff';
  const themeToggleBg = mode === 'dark' ? 'rgba(129, 140, 248, 0.18)' : 'rgba(15,23,42,0.03)';

  const menuContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="app-sider-logo" style={{ color: siderTextColor }}>
        <div className="app-sider-logo-badge">R</div>
        {!collapsed && (
          <div>
            <div className="app-sider-logo-text-main">Research CRM</div>
          </div>
        )}
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
          padding: '10px 12px 64px',
          borderTop: `1px solid ${token.colorBorder}`,
          background: siderBg,
        }}
      >
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
              height: 60,
              background: 'rgba(15,23,42,0.98)',
              borderBottom: `1px solid ${token.colorBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 1000,
            }}
          >
            <Space>
              <div className="app-sider-logo-badge" style={{ width: 28, height: 28, fontSize: 15 }}>
                R
              </div>
              <div>
                <Typography.Title level={5} style={{ margin: 0, color: '#e2e8f0' }}>
                  Research CRM
                </Typography.Title>
              </div>
            </Space>
            <Space>
              <Switch
                size="small"
                checked={mode === 'dark'}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ color: token.colorText }}
              />
            </Space>
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
          <Content style={{ padding: '76px 12px 16px', minHeight: '100vh', marginLeft: 0 }}>
            <div className="page-shell">
              <Outlet />
            </div>
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
              background:
                mode === 'dark'
                  ? 'radial-gradient(circle at top, #1d2344 0, #020617 50%)'
                  : 'radial-gradient(circle at top, #eef2ff 0, #ffffff 55%)',
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
            <Content style={{ padding: '20px 40px 32px', minHeight: '100vh' }}>
              <div className="page-shell">
                <div
                  className="app-topbar"
                  style={{
                    border: `1px solid ${token.colorBorder}`,
                    background:
                      mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.92)'
                        : 'linear-gradient(135deg, #ffffff, #f8fafc)',
                    boxShadow:
                      mode === 'dark'
                        ? '0 14px 30px rgba(15, 23, 42, 0.55)'
                        : '0 10px 25px rgba(15, 23, 42, 0.12)',
                  }}
                >
                  <div className="app-topbar-title">
                    <span className="app-topbar-title-main">Рабочее пространство</span>
                    <span className="app-topbar-title-sub">
                      Управляйте казино, бонусами, почтой и аналитикой в&nbsp;одном месте
                    </span>
                  </div>
                  <Space size={12}>
                    <Space
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: themeToggleBg,
                      }}
                    >
                      {mode === 'dark' ? (
                        <MoonOutlined style={{ color: siderSecondaryTextColor }} />
                      ) : (
                        <SunOutlined style={{ color: siderSecondaryTextColor }} />
                      )}
                      <Switch
                        size="small"
                        checked={mode === 'dark'}
                        onChange={toggleTheme}
                        checkedChildren={<MoonOutlined />}
                        unCheckedChildren={<SunOutlined />}
                      />
                    </Space>
                    <Avatar
                      size={32}
                      style={{
                        background:
                          'conic-gradient(from 160deg, #6366f1, #22c55e, #0ea5e9, #6366f1)',
                        color: '#0f172a',
                        fontWeight: 600,
                      }}
                    >
                      R
                    </Avatar>
                  </Space>
                </div>
                <Outlet />
              </div>
            </Content>
          </Layout>
        </>
      )}
    </Layout>
  );
}

