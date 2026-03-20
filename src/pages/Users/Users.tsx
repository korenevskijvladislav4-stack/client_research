import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Popconfirm,
  Tag,
  Switch,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  User,
  CreateUserDto,
  UpdateUserDto,
} from '../../store/api/userApi';
import { useServerTable } from '../../hooks/useServerTable';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { CasinoProfileTable } from '../../components/CasinoProfileTable';
import { SettingsEntityDrawer } from '../../components/settings/SettingsEntityDrawer';
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
      <PageHeaderCard
        title="Пользователи"
        description="Учётные записи системы: роли, статус активности и доступ в CRM."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreate}>
            Добавить пользователя
          </Button>
        }
      />

      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
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
      </Card>

      <Card>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <CasinoProfileTable<User>
            dataSource={users}
            rowKey="id"
            loading={isLoading}
            pagination={table.paginationConfig(usersResp?.pagination?.total ?? 0)}
            onChange={table.handleTableChange}
            scroll={{ x: 1100 }}
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
        </div>
      </Card>

      <SettingsEntityDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        width={560}
        editing={!!editingUser}
        icon={<UserOutlined />}
        titleCreate="Новый пользователь"
        titleEdit="Редактировать пользователя"
        subtitleCreate="Логин и email для входа в CRM. Пароль не хранится в открытом виде — задайте надёжный при создании."
        subtitleEdit="Пароль меняется только если заполнить поле ниже. Роль и статус вступают в силу после сохранения."
        alertCreate={{
          message: 'Создание учётной записи',
          description: (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Имя пользователя</strong> — уникальный логин (латиница, без пробелов).
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Администратор</strong> — полный доступ; <strong>Пользователь</strong> — ограниченный набор прав.
              </li>
              <li style={{ marginBottom: 0 }}>
                Неактивный пользователь не сможет войти, пока его снова не активируют.
              </li>
            </ul>
          ),
        }}
        alertEdit={{
          message: 'Редактирование',
          description:
            'Пустое поле пароля означает «оставить текущий». Смена роли или деактивация действуют для следующих входов в систему.',
        }}
        onPrimaryClick={() => form.submit()}
        primaryLabelCreate="Создать пользователя"
        primaryLabelEdit="Сохранить"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{
            role: 'user',
            is_active: true,
          }}
        >
          <Card size="small" title="Учётная запись" style={{ marginBottom: 16 }} styles={{ header: { fontWeight: 600 } }}>
            <Form.Item
              name="username"
              label="Имя пользователя"
              rules={[{ required: true, message: 'Введите имя пользователя' }]}
            >
              <Input placeholder="username" autoComplete="username" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]}
            >
              <Input placeholder="email@example.com" type="email" autoComplete="email" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={
                editingUser
                  ? []
                  : [
                      { required: true, message: 'Введите пароль' },
                      { min: 6, message: 'Минимум 6 символов' },
                    ]
              }
              extra={
                editingUser ? 'Оставьте пустым, чтобы не менять пароль' : 'Минимум 6 символов'
              }
            >
              <Input.Password
                placeholder={editingUser ? 'Оставить без изменений' : 'Задайте пароль'}
                autoComplete="new-password"
              />
            </Form.Item>
          </Card>

          <Card size="small" title="Роль и доступ" styles={{ header: { fontWeight: 600 } }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={14}>
                <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
                  <Select options={roleOptions} placeholder="Роль" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item name="is_active" label="Статус" valuePropName="checked">
                  <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </SettingsEntityDrawer>
    </Space>
  );
}
