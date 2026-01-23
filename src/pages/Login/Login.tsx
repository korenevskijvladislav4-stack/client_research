import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useAppDispatch } from '../../hooks/redux';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

const Login = () => {
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
      message.error(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: '#020617',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={3} style={{ marginBottom: 8, fontWeight: 500 }}>
              Research CRM
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              Вход в систему
            </Typography.Text>
          </div>
          <Form layout="vertical" form={form}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
              <Input placeholder="admin@example.com" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Button type="primary" block loading={loading} onClick={handleSubmit}>
              Войти
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
