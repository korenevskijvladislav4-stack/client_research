import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Segmented,
  Spin,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ApiOutlined,
  DeleteOutlined,
  DollarOutlined,
  GlobalOutlined,
  SearchOutlined,
  TagOutlined,
  TrophyOutlined,
  CreditCardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeaderCard } from '../../components/PageHeaderCard';
import { useGetAllGeosQuery, useDeleteGeoMutation, type Geo } from '../../store/api/geoApi';
import {
  useGetBonusNamesQuery,
  useGetPaymentTypesQuery,
  useGetPaymentMethodsQuery,
  useGetPromoTypesQuery,
  useGetProvidersQuery,
  useDeleteBonusNameMutation,
  useDeletePaymentTypeMutation,
  useDeletePaymentMethodMutation,
  useDeletePromoTypeMutation,
  useDeleteProviderMutation,
  type RefItem,
} from '../../store/api/referenceApi';
import { getApiErrorMessage } from '../../store/api/baseApi';

type TabKey = 'geo' | 'providers' | 'bonusNames' | 'paymentTypes' | 'paymentMethods' | 'promoTypes';

function filterByName<T extends { name: string }>(items: T[], q: string): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((x) => x.name.toLowerCase().includes(s));
}

function filterGeos(items: Geo[], q: string): Geo[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter(
    (g) => g.code.toLowerCase().includes(s) || g.name.toLowerCase().includes(s),
  );
}

export default function Directories() {
  const { token } = theme.useToken();
  const [activeKey, setActiveKey] = useState<TabKey>('geo');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [activeKey]);

  const skipGeo = activeKey !== 'geo';
  const skipProviders = activeKey !== 'providers';
  const skipBonus = activeKey !== 'bonusNames';
  const skipPayTypes = activeKey !== 'paymentTypes';
  const skipPayMethods = activeKey !== 'paymentMethods';
  const skipPromo = activeKey !== 'promoTypes';

  const { data: geos = [], isLoading: loadingGeo } = useGetAllGeosQuery(undefined, { skip: skipGeo });
  const { data: providers = [], isLoading: loadingProviders } = useGetProvidersQuery(undefined, {
    skip: skipProviders,
  });
  const { data: bonusNames = [], isLoading: loadingBonus } = useGetBonusNamesQuery(undefined, {
    skip: skipBonus,
  });
  const { data: paymentTypes = [], isLoading: loadingPayTypes } = useGetPaymentTypesQuery(undefined, {
    skip: skipPayTypes,
  });
  const { data: paymentMethods = [], isLoading: loadingPayMethods } = useGetPaymentMethodsQuery(undefined, {
    skip: skipPayMethods,
  });
  const { data: promoTypes = [], isLoading: loadingPromo } = useGetPromoTypesQuery(undefined, {
    skip: skipPromo,
  });

  const [deleteGeo] = useDeleteGeoMutation();
  const [deleteProvider] = useDeleteProviderMutation();
  const [deleteBonusName] = useDeleteBonusNameMutation();
  const [deletePaymentType] = useDeletePaymentTypeMutation();
  const [deletePaymentMethod] = useDeletePaymentMethodMutation();
  const [deletePromoType] = useDeletePromoTypeMutation();

  const filteredGeos = useMemo(() => filterGeos(geos, search), [geos, search]);
  const filteredProviders = useMemo(() => filterByName(providers, search), [providers, search]);
  const filteredBonus = useMemo(() => filterByName(bonusNames, search), [bonusNames, search]);
  const filteredPayTypes = useMemo(() => filterByName(paymentTypes, search), [paymentTypes, search]);
  const filteredPayMethods = useMemo(() => filterByName(paymentMethods, search), [paymentMethods, search]);
  const filteredPromo = useMemo(() => filterByName(promoTypes, search), [promoTypes, search]);

  const loading =
    (activeKey === 'geo' && loadingGeo) ||
    (activeKey === 'providers' && loadingProviders) ||
    (activeKey === 'bonusNames' && loadingBonus) ||
    (activeKey === 'paymentTypes' && loadingPayTypes) ||
    (activeKey === 'paymentMethods' && loadingPayMethods) ||
    (activeKey === 'promoTypes' && loadingPromo);

  const rows =
    activeKey === 'geo'
      ? filteredGeos
      : activeKey === 'providers'
        ? filteredProviders
        : activeKey === 'bonusNames'
          ? filteredBonus
          : activeKey === 'paymentTypes'
            ? filteredPayTypes
            : activeKey === 'paymentMethods'
              ? filteredPayMethods
              : filteredPromo;

  const segmentedOptions = [
    { value: 'geo' as const, label: <Space size={6}><GlobalOutlined />GEO</Space> },
    { value: 'providers' as const, label: <Space size={6}><ApiOutlined />Провайдеры</Space> },
    { value: 'bonusNames' as const, label: <Space size={6}><DollarOutlined />Бонусы</Space> },
    { value: 'paymentTypes' as const, label: <Space size={6}><CreditCardOutlined />Типы платежей</Space> },
    { value: 'paymentMethods' as const, label: <Space size={6}><UnorderedListOutlined />Способы</Space> },
    { value: 'promoTypes' as const, label: <Space size={6}><TrophyOutlined />Промо</Space> },
  ];

  async function handleDeleteGeo(g: Geo) {
    try {
      await deleteGeo(g.id).unwrap();
      message.success(`GEO «${g.code}» удалён`);
    } catch (e: unknown) {
      message.error(getApiErrorMessage(e, 'Не удалось удалить GEO'));
    }
  }

  const deleteConfirmGeo = (g: Geo) => (
    <Popconfirm
      title="Удалить GEO из справочника?"
      description="Код перестанет подсказываться в списках. Данные в бонусах/платежах с этим кодом не меняются."
      okText="Удалить"
      cancelText="Отмена"
      okButtonProps={{ danger: true }}
      onConfirm={() => handleDeleteGeo(g)}
    >
      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
    </Popconfirm>
  );

  const deleteConfirmProvider = (p: RefItem) => (
    <Popconfirm
      title="Удалить провайдера?"
      description="Все привязки этого провайдера к казино (по GEO) будут удалены. Действие необратимо."
      okText="Удалить"
      cancelText="Отмена"
      okButtonProps={{ danger: true }}
      onConfirm={async () => {
        try {
          await deleteProvider(p.id).unwrap();
          message.success(`«${p.name}» удалён`);
        } catch (e: unknown) {
          message.error(getApiErrorMessage(e, 'Не удалось удалить провайдера'));
        }
      }}
    >
      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
    </Popconfirm>
  );

  const deleteConfirmRef = (
    item: RefItem,
    title: string,
    runDelete: () => Promise<unknown>,
  ) => (
    <Popconfirm
      title={title}
      description="Пункт исчезнет из подсказок при вводе. Уже сохранённые записи не изменятся."
      okText="Удалить"
      cancelText="Отмена"
      okButtonProps={{ danger: true }}
      onConfirm={async () => {
        try {
          await runDelete();
          message.success(`«${item.name}» удалено`);
        } catch (e: unknown) {
          message.error(getApiErrorMessage(e, 'Не удалось удалить'));
        }
      }}
    >
      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
    </Popconfirm>
  );

  const renderGeoCards = () => (
    <Row gutter={[16, 16]}>
      {filteredGeos.map((g) => (
        <Col key={g.id} xs={24} sm={12} lg={8} xl={6}>
          <Card
            size="small"
            styles={{ body: { padding: '12px 16px' } }}
            style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            title={
              <Space size={6} wrap>
                <Tag color="blue" style={{ margin: 0 }}>
                  {g.code}
                </Tag>
                <Typography.Text strong ellipsis={{ tooltip: g.name }}>
                  {g.name}
                </Typography.Text>
              </Space>
            }
            extra={deleteConfirmGeo(g)}
          >
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space size={6} wrap>
                {g.is_active ? <Tag color="success">Активен</Tag> : <Tag>Неактивен</Tag>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Порядок: {g.sort_order}
                </Typography.Text>
              </Space>
              {g.created_at && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Добавлено: {dayjs(g.created_at).format('YYYY-MM-DD HH:mm')}
                </Typography.Text>
              )}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderRefCards = (list: RefItem[], deleteFn: (item: RefItem) => ReactNode) => (
    <Row gutter={[16, 16]}>
      {list.map((item) => (
        <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
          <Card
            size="small"
            styles={{ body: { padding: '12px 16px' } }}
            style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            title={
              <Typography.Text strong ellipsis={{ tooltip: item.name }}>
                {item.name}
              </Typography.Text>
            }
            extra={deleteFn(item)}
          >
            {item.created_at ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Добавлено: {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Typography.Text>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );

  const emptyText =
    activeKey === 'geo'
      ? 'Нет записей GEO'
      : activeKey === 'providers'
        ? 'Нет провайдеров'
        : activeKey === 'bonusNames'
          ? 'Нет названий бонусов'
          : activeKey === 'paymentTypes'
            ? 'Нет типов платежей'
            : activeKey === 'paymentMethods'
              ? 'Нет способов оплаты'
              : 'Нет типов промо';

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeaderCard
        title="Справочники"
        description="GEO, провайдеры и подсказки для форм (бонусы, платежи, промо). Удаляйте лишние пункты — сохранённые данные в карточках не пересчитываются."
      />

      <Card size="small">
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Segmented<TabKey>
            value={activeKey}
            onChange={(v) => setActiveKey(v)}
            options={segmentedOptions}
            size="middle"
          />
        </div>
      </Card>

      <Card size="small">
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Input
            placeholder="Поиск по названию или коду…"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button type="link" onClick={() => setSearch('')} style={{ padding: 0 }}>
              Сбросить
            </Button>
          )}
        </Space>
      </Card>

      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Typography.Text type="secondary">{loading ? 'Загрузка…' : `Найдено: ${rows.length}`}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <TagOutlined style={{ marginRight: 6 }} />
            Удаление необратимо для справочника; проверьте, что пункт нигде не нужен.
          </Typography.Text>
        </div>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {rows.length === 0 && !loading ? (
            <Empty description={search.trim() ? 'Ничего не найдено' : emptyText} />
          ) : activeKey === 'geo' ? (
            renderGeoCards()
          ) : activeKey === 'providers' ? (
            renderRefCards(filteredProviders, (item) => deleteConfirmProvider(item))
          ) : activeKey === 'bonusNames' ? (
            renderRefCards(filteredBonus, (item) =>
              deleteConfirmRef(item, 'Удалить название бонуса?', () => deleteBonusName(item.id).unwrap()),
            )
          ) : activeKey === 'paymentTypes' ? (
            renderRefCards(filteredPayTypes, (item) =>
              deleteConfirmRef(item, 'Удалить тип платежа?', () => deletePaymentType(item.id).unwrap()),
            )
          ) : activeKey === 'paymentMethods' ? (
            renderRefCards(filteredPayMethods, (item) =>
              deleteConfirmRef(item, 'Удалить способ оплаты?', () => deletePaymentMethod(item.id).unwrap()),
            )
          ) : (
            renderRefCards(filteredPromo, (item) =>
              deleteConfirmRef(item, 'Удалить тип промо?', () => deletePromoType(item.id).unwrap()),
            )
          )}
        </Spin>
      </Card>
    </Space>
  );
}
