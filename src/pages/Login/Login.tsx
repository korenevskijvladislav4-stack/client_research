import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Space, Typography, message, theme } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../../hooks/redux';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { useTheme } from '../../contexts/ThemeContext';

const ACCENT =
  'linear-gradient(90deg, #6366f1 0%, #22c55e 45%, #0ea5e9 100%)';

const Login = () => {
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { email, password } = await form.validateFields();
      const response = await authService.login({ email, password });
      dispatch(setCredentials(response));
      navigate('/');
    } catch (err: any) {
      if (err?.errorFields) return;
      const data = err.response?.data;
      const text = (data && (data.error || data.message)) || 'Ошибка входа';
      message.error(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: isDark
          ? '#020617'
          : `linear-gradient(165deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 42%, ${token.colorFillAlter} 100%)`,
      }}
    >
      {/* Декоративные пятна */}
      {isDark ? (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '-12%',
              right: '-8%',
              width: 'min(520px, 70vw)',
              height: 'min(520px, 70vw)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 68%)',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: '-18%',
              left: '-12%',
              width: 'min(480px, 65vw)',
              height: 'min(480px, 65vw)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, transparent 65%)',
              filter: 'blur(52px)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.4,
              background:
                'radial-gradient(circle at top left, #1d2344 0, transparent 50%), radial-gradient(circle at bottom right, #0f172a 0, transparent 55%)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: 'min(420px, 80vw)',
            height: 'min(420px, 80vw)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${token.colorPrimary}18 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            color: token.colorText,
          }}
        >
          {/* Бренд */}
          <div style={{ textAlign: 'center' }}>
            <Space size={14} align="center" style={{ justifyContent: 'center', marginBottom: 10 }}>
              <div
                className="app-sider-logo-badge"
                style={{
                  width: 48,
                  height: 48,
                  fontSize: 22,
                  ...(isDark
                    ? {
                        boxShadow:
                          '0 20px 50px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(148, 163, 184, 0.15)',
                      }
                    : {
                        boxShadow: '0 12px 32px rgba(99, 102, 241, 0.28)',
                      }),
                }}
              >
                R
              </div>
            </Space>
            <Typography.Title
              level={3}
              style={{
                margin: 0,
                color: token.colorTextHeading,
                letterSpacing: '-0.04em',
                fontWeight: 700,
              }}
            >
              Research CRM
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 13,
                lineHeight: 1.5,
                maxWidth: 320,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Исследовательская CRM: казино, бонусы, почта и аналитика в одном месте
            </Typography.Text>
          </div>

          <Card
            style={{
              width: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              ...(isDark
                ? {
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.92) 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow:
                      '0 24px 64px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }
                : {
                    border: `1px solid ${token.colorBorder}`,
                    background: token.colorBgContainer,
                    boxShadow: `0 20px 50px rgba(15, 23, 42, 0.08), 0 0 0 1px ${token.colorBorderSecondary}`,
                  }),
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ height: 4, background: ACCENT }} />
            <div style={{ padding: '26px 28px 28px' }}>
              <Typography.Title
                level={4}
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontWeight: 600,
                  fontSize: 18,
                  color: token.colorTextHeading,
                  letterSpacing: '-0.02em',
                }}
              >
                Вход в систему
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 22 }}>
                Укажите email и пароль учётной записи
              </Typography.Text>

              <Form
                layout="vertical"
                form={form}
                requiredMark={false}
                onFinish={handleSubmit}
                size="large"
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true }, { type: 'email' }]}
                  style={{ marginBottom: 18 }}
                >
                  <Input
                    placeholder="you@company.com"
                    prefix={<MailOutlined style={{ color: token.colorTextTertiary }} />}
                    autoComplete="email"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Пароль"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 22 }}
                >
                  <Input.Password
                    placeholder="••••••••"
                    prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                    autoComplete="current-password"
                  />
                </Form.Item>
                <Button type="primary" block loading={loading} htmlType="submit" size="large">
                  Войти
                </Button>
              </Form>
            </div>
          </Card>

          <Typography.Text
            type="secondary"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            Данные передаются по защищённому соединению
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default Login;
