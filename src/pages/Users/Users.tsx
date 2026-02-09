import { useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Popconfirm,
  Typography,
  Tag,
  Switch,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  User,
  CreateUserDto,
  UpdateUserDto,
} from '../../store/api/userApi';
import { useServerTable } from '../../hooks/useServerTable';
import dayjs from 'dayjs';

export default function Users() {
  const table = useServerTable<{ role?: string; is_active?: boolean }>({
    defaultPageSize: 20,
    defaultSortField: 'username',
    defaultSortOrder: 'asc',
  });
  const { data: usersResp, isLoading } = useGetUsersQuery(table.params);
  const users = usersResp?.data ?? [];

  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const showCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'user',
      is_active: true,
    });
    setDrawerOpen(true);
  };

  const showEdit = (user: User) => {
    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: undefined,
    });
    setDrawerOpen(true);
  };

  const onFinish = async (values: CreateUserDto | UpdateUserDto) => {
    try {
      if (editingUser) {
        const updateData: UpdateUserDto = { ...values };
        if (!values.password || values.password.trim() === '') {
          delete updateData.password;
        }
        await updateUser({ id: editingUser.id, data: updateData }).unwrap();
        message.success('Пользователь обновлён');
      } else {
        await createUser(values as CreateUserDto).unwrap();
        message.success('Пользователь создан');
      }
      setDrawerOpen(false);
      setEditingUser(null);
      form.resetFields();
    } catch (e: any) {
      message.error(e?.data?.error || 'Ошибка сохранения пользователя');
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Администратор' },
    { value: 'user', label: 'Пользователь' },
  ];

  const roleLabels: Record<string, string> = {
    admin: 'Администратор',
    user: 'Пользователь',
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Пользователи
            </Typography.Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={showCreate}>
              Добавить пользователя
            </Button>
          </div>

          <Space wrap>
            <Input
              placeholder="Поиск по имени или email"
              prefix={<SearchOutlined />}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Роль"
              value={table.filters.role}
              onChange={(val) => table.updateFilter('role', val)}
              allowClear
              style={{ width: 150 }}
              options={roleOptions}
            />
            <Select
              placeholder="Статус"
              value={
                table.filters.is_active === undefined
                  ? undefined
                  : table.filters.is_active
                  ? 'active'
                  : 'inactive'
              }
              onChange={(val) =>
                table.updateFilter('is_active', val === undefined ? undefined : val === 'active')
              }
              allowClear
              style={{ width: 150 }}
              options={[
                { value: 'active', label: 'Активные' },
                { value: 'inactive', label: 'Неактивные' },
              ]}
            />
          </Space>

          <Table
            dataSource={users}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={table.paginationConfig(usersResp?.pagination?.total ?? 0)}
            onChange={table.handleTableChange}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 80,
                sorter: true,
              },
              {
                title: 'Имя пользователя',
                dataIndex: 'username',
                key: 'username',
                width: 200,
                sorter: true,
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                width: 250,
                sorter: true,
              },
              {
                title: 'Роль',
                dataIndex: 'role',
                key: 'role',
                width: 150,
                sorter: true,
                render: (role: string) => (
                  <Tag color={role === 'admin' ? 'red' : 'blue'}>{roleLabels[role] || role}</Tag>
                ),
              },
              {
                title: 'Статус',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 120,
                sorter: true,
                render: (isActive: boolean) => (
                  <Tag color={isActive ? 'green' : 'default'}>
                    {isActive ? 'Активен' : 'Неактивен'}
                  </Tag>
                ),
              },
              {
                title: 'Создан',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 180,
                sorter: true,
                render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
              },
              {
                title: 'Действия',
                key: 'actions',
                width: 150,
                align: 'right',
                render: (_: any, record: User) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => showEdit(record)}
                    />
                    <Popconfirm
                      title={record.is_active ? 'Деактивировать пользователя?' : 'Активировать пользователя?'}
                      description={
                        record.is_active
                          ? 'Пользователь не сможет войти в систему.'
                          : 'Пользователь сможет снова войти в систему.'
                      }
                      onConfirm={() => {
                        updateUser({
                          id: record.id,
                          data: { is_active: !record.is_active },
                        })
                          .unwrap()
                          .then(() => {
                            message.success(record.is_active ? 'Пользователь деактивирован' : 'Пользователь активирован');
                          })
                          .catch(() => {
                            message.error('Не удалось изменить статус пользователя');
                          });
                      }}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button
                        type="link"
                        size="small"
                        danger={record.is_active}
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer
        title={editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            role: 'user',
            is_active: true,
          }}
        >
          <Form.Item
            name="username"
            label="Имя пользователя"
            rules={[{ required: true, message: 'Введите имя пользователя' }]}
          >
            <Input placeholder="username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="email@example.com" type="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={
              editingUser
                ? []
                : [{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]
            }
            help={editingUser ? 'Оставьте пустым, чтобы не менять пароль' : undefined}
          >
            <Input.Password placeholder={editingUser ? 'Оставить без изменений' : 'Пароль'} />
          </Form.Item>

          <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item name="is_active" label="Статус" valuePropName="checked">
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Сохранить' : 'Создать'}
              </Button>
              <Button
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
