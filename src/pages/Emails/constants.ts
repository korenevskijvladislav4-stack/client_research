/** Email provider presets for quick IMAP configuration. */
export interface EmailProvider {
  id: string;
  name: string;
  icon: string;
  host: string;
  port: number;
  tls: boolean;
  supportsOAuth?: boolean;
  helpUrl?: string;
  helpText?: string;
}

export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📨',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    supportsOAuth: true,
    helpUrl: 'https://support.google.com/accounts/answer/185833',
    helpText:
      'Для подключения Gmail через IMAP нужен пароль приложения (2FA должна быть включена). Рекомендуется использовать подключение через Google OAuth.',
  },
  {
    id: 'outlook',
    name: 'Outlook / Hotmail',
    icon: '📧',
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    helpText: 'Используйте обычный пароль от учётной записи Microsoft.',
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '📩',
    host: 'imap.mail.yahoo.com',
    port: 993,
    tls: true,
    helpUrl: 'https://help.yahoo.com/kb/generate-manage-third-party-passwords-sln15241.html',
    helpText:
      'Для Yahoo нужен пароль приложения. Создайте его в настройках безопасности аккаунта.',
  },
  {
    id: 'mailru',
    name: 'Mail.ru',
    icon: '✉️',
    host: 'imap.mail.ru',
    port: 993,
    tls: true,
    helpUrl: 'https://help.mail.ru/mail/mailer/imap',
    helpText:
      'Используйте пароль для внешних приложений (если включена 2FA). Включите доступ по IMAP в настройках ящика.',
  },
  {
    id: 'yandex',
    name: 'Яндекс',
    icon: '📬',
    host: 'imap.yandex.ru',
    port: 993,
    tls: true,
    helpUrl: 'https://yandex.ru/support/mail/mail-clients/imap.html',
    helpText:
      'Включите доступ по IMAP в настройках Яндекс Почты. Используйте пароль приложения, если включена 2FA.',
  },
  {
    id: 'custom',
    name: 'Другой провайдер (IMAP)',
    icon: '⚙️',
    host: '',
    port: 993,
    tls: true,
    helpText: 'Укажите IMAP-сервер, порт и учётные данные вручную.',
  },
];

export const getProviderById = (id: string): EmailProvider | undefined =>
  EMAIL_PROVIDERS.find((p) => p.id === id);

/** Detect provider from IMAP host string. */
export const detectProviderByHost = (host: string): EmailProvider | undefined => {
  const h = host.toLowerCase();
  return EMAIL_PROVIDERS.find((p) => p.id !== 'custom' && p.host && h.includes(p.host));
};

export const PAGE_SIZE = 20;
