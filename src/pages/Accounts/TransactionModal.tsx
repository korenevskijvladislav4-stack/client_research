import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useCreateAccountTransactionMutation, CasinoAccount, CreateAccountTransactionDto } from '../../store/api/casinoAccountApi';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  account: CasinoAccount | null;
  onSuccess?: () => void;
}

export function TransactionModal({ open, onClose, account, onSuccess }: TransactionModalProps) {
  const [form] = Form.useForm();
  const [createTransaction, { isLoading }] = useCreateAccountTransactionMutation();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        type: 'deposit',
        transaction_date: dayjs().format('YYYY-MM-DD'),
        amount: undefined,
        currency: undefined,
        notes: undefined,
      });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    if (!account?.id) return;
    try {
      const values = await form.validateFields();
      const data: CreateAccountTransactionDto = {
        type: values.type,
        amount: values.amount,
        currency: values.currency || undefined,
        transaction_date: values.transaction_date,
        notes: values.notes || undefined,
      };
      await createTransaction({ accountId: account.id, data }).unwrap();
      onSuccess?.();
      onClose();
      form.resetFields();
    } catch (e) {
      // form validation or API error
    }
  };

  return (
    <Modal
      title={account ? `Транзакция: ${account.casino_name || '#' + account.casino_id} · ${account.geo} · ${account.email || '—'}` : 'Депозит / Вывод'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isLoading}
      destroyOnClose
      okText="Создать"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'deposit', label: 'Депозит' },
              { value: 'withdrawal', label: 'Вывод' },
            ]}
          />
        </Form.Item>
        <Form.Item name="amount" label="Сумма" rules={[{ required: true, message: 'Укажите сумму' }]}>
          <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} placeholder="1000" />
        </Form.Item>
        <Form.Item name="currency" label="Валюта">
          <Input placeholder="RUB, EUR, USD" />
        </Form.Item>
        <Form.Item name="transaction_date" label="Дата" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="notes" label="Заметки">
          <Input.TextArea rows={2} placeholder="Необязательно" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
