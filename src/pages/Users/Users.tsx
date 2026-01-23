import { useState, useMemo } from 'react';
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
  // useDeleteUserMutation,
  User,
  CreateUserDto,
  UpdateUserDto,
} from '../../store/api/userApi';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

export default function Users() {
  const { data: users = [], isLoading } = useGetUsersQuery();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  // const [deleteUser] = useDeleteUserMutation();

  // Filters state
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !user.username.toLowerCase().includes(searchLower) &&
          !user.email.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filterRole && user.role !== filterRole) {
        return false;
      }
      if (filterActive !== undefined && user.is_active !== filterActive) {
        return false;
      }
      return true;
    });
  }, [users, search, filterRole, filterActive]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, page]);

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
      password: undefined, // Don't prefill password
    });
    setDrawerOpen(true);
  };

  // const handleDelete = async (id: number) => {
  //   try {
  //     await deleteUser(id).unwrap();
  //     message.success('Пользователь деактивирован');
  //   } catch {
  //     message.error('Не удалось деактивировать пользователя');
  //   }
  // };

  const onFinish = async (values: CreateUserDto | UpdateUserDto) => {
    try {
      if (editingUser) {
        // If password is empty, don't include it in update
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

          {/* Filters */}
          <Space wrap>
            <Input
              placeholder="Поиск по имени или email"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Роль"
              value={filterRole}
              onChange={(val) => {
                setFilterRole(val);
                setPage(1);
              }}
              allowClear
              style={{ width: 150 }}
              options={roleOptions}
            />
            <Select
              placeholder="Статус"
              value={filterActive === undefined ? undefined : filterActive ? 'active' : 'inactive'}
              onChange={(val) => {
                setFilterActive(val === undefined ? undefined : val === 'active');
                setPage(1);
              }}
              allowClear
              style={{ width: 150 }}
              options={[
                { value: 'active', label: 'Активные' },
                { value: 'inactive', label: 'Неактивные' },
              ]}
            />
          </Space>

          {/* Table */}
          <Table
            dataSource={paginatedUsers}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              current: page,
              total: filteredUsers.length,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              onChange: (page) => setPage(page),
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 80,
              },
              {
                title: 'Имя пользователя',
                dataIndex: 'username',
                key: 'username',
                width: 200,
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                width: 250,
              },
              {
                title: 'Роль',
                dataIndex: 'role',
                key: 'role',
                width: 150,
                render: (role: string) => (
                  <Tag color={role === 'admin' ? 'red' : 'blue'}>
                    {roleLabels[role] || role}
                  </Tag>
                ),
              },
              {
                title: 'Статус',
                dataIndex: 'is_active',
                key: 'is_active',
                width: 120,
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
                render: (date: string) =>
                  date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '—',
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
                          ? 'Пользователь не сможет войти в систему после деактивации.'
                          : 'Пользователь сможет войти в систему после активации.'
                      }
                      onConfirm={() => {
                        updateUser({
                          id: record.id,
                          data: { is_active: !record.is_active },
                        })
                          .unwrap()
                          .then(() => {
                            message.success(
                              record.is_active ? 'Пользователь деактивирован' : 'Пользователь активирован'
                            );
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

      {/* Drawer for create/edit */}
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
