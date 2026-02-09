import { useMemo } from 'react';
import { Card, Col, Row, Statistic, Typography, Space, Tag, List } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,

  MailOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useGetAllCasinosQuery } from '../../store/api/casinoApi';

import { useGetEmailsQuery } from '../../store/api/emailApi';
import { useGetAllBonusesQuery } from '../../store/api/casinoBonusApi';
import { useGetAllPaymentsQuery } from '../../store/api/casinoPaymentApi';

export default function Dashboard() {
  const { data: casinos = [] } = useGetAllCasinosQuery();
  const { data: emailsResponse } = useGetEmailsQuery({ limit: 50, offset: 0 });

  // Берём первую страницу бонусов и платежей, но total используем для общей статистики
  const { data: bonusesResp } = useGetAllBonusesQuery({ limit: 200, offset: 0 });
  const { data: paymentsResp } = useGetAllPaymentsQuery({ limit: 200, offset: 0 });

  const totalCasinos = casinos.length;
  const ourCasinos = casinos.filter((c: any) => c.is_our);
  const otherCasinos = casinos.filter((c: any) => !c.is_our);
  // const unreadEmails =
  //   emailsResponse?.data?.filter((e) => !e.is_read).length ?? 0;

  const totalBonuses = bonusesResp?.total ?? 0;
  const totalPayments = paymentsResp?.total ?? 0;
  const avgPaymentsPerCasino =
    totalCasinos > 0 ? Math.round((totalPayments / totalCasinos) * 10) / 10 : 0;

  // GEO статистика по казино
  const geoStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; our: number }
    >();

    for (const c of casinos as any[]) {
      const geos: string[] = Array.isArray(c.geo) ? c.geo : [];
      for (const g of geos) {
        if (!g) continue;
        const current = map.get(g) ?? { total: 0, our: 0 };
        current.total += 1;
        if (c.is_our) current.our += 1;
        map.set(g, current);
      }
    }

    return Array.from(map.entries())
      .map(([geo, v]) => ({
        geo,
        total: v.total,
        our: v.our,
        other: v.total - v.our,
        ourPct: v.total ? Math.round((v.our / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [casinos]);

  // Статистика по видам бонусов
  const bonusStats = useMemo(() => {
    const data = bonusesResp?.data ?? [];
    const map = new Map<
      string,
      { count: number }
    >();
    for (const b of data) {
      const kind = b.bonus_kind || 'other';
      map.set(kind, { count: (map.get(kind)?.count ?? 0) + 1 });
    }
    const labels: Record<string, string> = {
      deposit: 'Депозитный',
      nodeposit: 'Бездеп',
      cashback: 'Кешбек',
      rakeback: 'Рейкбек',
      other: 'Другое',
    };
    return Array.from(map.entries())
      .map(([kind, v]) => ({
        kind,
        label: labels[kind] ?? kind,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [bonusesResp]);

  // Статистика по типам платежей
  const paymentTypeStats = useMemo(() => {
    const data = paymentsResp?.data ?? [];
    const map = new Map<string, number>();
    for (const p of data) {
      const type = p.type || 'Другое';
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [paymentsResp]);

  // Статистика по GEO для платежей
  const paymentGeoStats = useMemo(() => {
    const data = paymentsResp?.data ?? [];
    const map = new Map<string, number>();
    for (const p of data as any[]) {
      const geo = p.geo || '—';
      map.set(geo, (map.get(geo) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([geo, count]) => ({ geo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [paymentsResp]);

  const latestEmails = emailsResponse?.data ?? [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 0, fontWeight: 500 }}>
          Дашборд
        </Typography.Title>
        <Typography.Text type="secondary">
          Сводная информация по казино, бонусам, платежам и коммуникациям
        </Typography.Text>
      </div>

      {/* Верхний ряд метрик */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Всего казино"
              value={totalCasinos}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Наши казино"
              value={ourCasinos.length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Чужие казино"
              value={otherCasinos.length}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Бонусов всего"
              value={totalBonuses}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Платёжных методов"
              value={totalPayments}
              prefix={<CreditCardOutlined />}
              suffix={totalCasinos > 0 ? undefined : ''}
            />
            {totalCasinos > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ~{avgPaymentsPerCasino} метода на казино
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Сравнение наших и чужих по GEO + бонусы */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>Казино по GEO: наши vs чужие</span>
              </Space>
            }
          >
            {geoStats.length === 0 ? (
              <Typography.Text type="secondary">
                Нет данных по GEO.
              </Typography.Text>
            ) : (
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>GEO</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Всего</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Наши</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Чужие</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>% наших</th>
                  </tr>
                </thead>
                <tbody>
                  {geoStats.map((row) => (
                    <tr key={row.geo}>
                      <td style={{ padding: '4px 8px' }}>
                        <Tag>{row.geo}</Tag>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.total}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.our}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.other}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <Typography.Text type={row.ourPct >= 50 ? 'success' : 'secondary'}>
                          {row.ourPct}%
                        </Typography.Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <DollarOutlined />
                <span>Распределение по видам бонусов</span>
              </Space>
            }
          >
            {bonusStats.length === 0 ? (
              <Typography.Text type="secondary">
                Бонусы ещё не заведены.
              </Typography.Text>
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {bonusStats.map((b) => (
                  <Space
                    key={b.kind}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <Typography.Text>{b.label}</Typography.Text>
                    <Typography.Text strong>{b.count}</Typography.Text>
                  </Space>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Платежи + Почта */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <CreditCardOutlined />
                <span>Популярные платежные решения</span>
              </Space>
            }
          >
            {paymentTypeStats.length === 0 && paymentGeoStats.length === 0 ? (
              <Typography.Text type="secondary">
                Платёжные методы ещё не заведены.
              </Typography.Text>
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* Типы платежей */}
                {paymentTypeStats.length > 0 && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Топ типов платежей
                    </Typography.Text>
                    <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                      {paymentTypeStats.map((p) => (
                        <Space
                          key={p.type}
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Typography.Text>{p.type}</Typography.Text>
                          <Typography.Text strong>{p.count}</Typography.Text>
                        </Space>
                      ))}
                    </Space>
                  </div>
                )}

                {/* GEO по платежам */}
                {paymentGeoStats.length > 0 && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Топ GEO по количеству методов
                    </Typography.Text>
                    <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                      {paymentGeoStats.map((g) => (
                        <Space
                          key={g.geo}
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Tag style={{ margin: 0 }}>{g.geo}</Tag>
                          <Typography.Text strong>{g.count}</Typography.Text>
                        </Space>
                      ))}
                    </Space>
                  </div>
                )}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <MailOutlined />
                <span>Последние письма</span>
              </Space>
            }
          >
            {latestEmails.length === 0 ? (
              <Typography.Text type="secondary">
                Писем пока нет.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={latestEmails.slice(0, 8)}
                renderItem={(email) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Space>
                        <Typography.Text strong>
                          {email.from_name || email.from_email || 'Без отправителя'}
                        </Typography.Text>
                        {email.to_email && (
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            → {email.to_email}
                          </Typography.Text>
                        )}
                        {!email.is_read && (
                          <Tag color="blue" style={{ marginLeft: 4 }}>
                            Новое
                          </Tag>
                        )}
                      </Space>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {email.subject || '(Без темы)'}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
