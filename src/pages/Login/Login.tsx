import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Space, Typography, message, theme } from 'antd';
import { useAppDispatch } from '../../hooks/redux';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { useTheme } from '../../contexts/ThemeContext';

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

  const pageBg = isDark
    ? 'radial-gradient(circle at top left, #1d2344 0, #020617 55%), radial-gradient(circle at bottom right, #0f172a 0, #020617 55%)'
    : token.colorBgLayout;

  const cardSurface = isDark
    ? {
        boxShadow: '0 20px 55px rgba(15, 23, 42, 0.9), 0 0 0 1px rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(148,163,184,0.45)',
        background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))',
      }
    : {
        boxShadow: token.boxShadowSecondary,
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
      };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: pageBg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            color: token.colorText,
          }}
        >
          <Space size={10} align="center">
            <div
              className="app-sider-logo-badge"
              style={{
                width: 34,
                height: 34,
                fontSize: 18,
                ...(isDark
                  ? {
                      boxShadow:
                        '0 18px 40px rgba(15, 23, 42, 0.8), 0 0 0 1px rgba(15, 23, 42, 0.9)',
                    }
                  : {}),
              }}
            >
              R
            </div>
            <div>
              <Typography.Title
                level={4}
                style={{ margin: 0, color: token.colorText, letterSpacing: '-0.03em' }}
              >
                Research CRM
              </Typography.Title>
            </div>
          </Space>

          <Card
            style={{
              width: '100%',
              borderRadius: 18,
              ...cardSurface,
            }}
            bodyStyle={{ padding: 28 }}
          >
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <div style={{ textAlign: 'left' }}>
                <Typography.Title
                  level={4}
                  style={{
                    marginBottom: 4,
                    fontWeight: 600,
                    color: token.colorText,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Вход в рабочее пространство
                </Typography.Title>
              </div>

              <Form
                layout="vertical"
                form={form}
                requiredMark={false}
                onFinish={handleSubmit}
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true }, { type: 'email' }]}
                >
                  <Input placeholder="you@company.com" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Пароль"
                  rules={[{ required: true }]}
                >
                  <Input.Password placeholder="••••••••" />
                </Form.Item>
                <Button
                  type="primary"
                  block
                  loading={loading}
                  htmlType="submit"
                  style={{ marginTop: 4 }}
                >
                  Войти в систему
                </Button>
              </Form>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
