/**
 * Экспорт анкеты казино в интерактивный HTML:
 * фильтры по GEO, направлению, получателю; модалки бонусов/платежей; просмотр писем.
 */

export interface ExportCasino {
  id: number;
  name: string;
  website?: string;
  description?: string;
  geo?: string[];
  is_our?: boolean;
  status?: string;
}

export interface ExportProfileItem {
  field: { id: number; label: string; field_type: string; key_name: string };
  value: any;
}

export interface ExportBonus {
  id: number;
  geo: string;
  name: string;
  bonus_category?: string;
  bonus_kind?: string;
  bonus_type?: string;
  bonus_value?: number;
  bonus_unit?: string | null;
  currency?: string;
  freespins_count?: number;
  freespin_value?: number;
  cashback_percent?: number;
  min_deposit?: number;
  max_bonus?: number;
  max_cashout?: number;
  wagering_requirement?: number;
  promo_code?: string;
  valid_from?: string;
  valid_to?: string;
  status?: string;
  notes?: string;
  max_win_cash_value?: number | null;
  max_win_cash_unit?: string | null;
  max_win_freespin_value?: number | null;
  max_win_freespin_unit?: string | null;
  max_win_percent_value?: number | null;
  max_win_percent_unit?: string | null;
}

export interface ExportPayment {
  id: number;
  geo: string;
  direction: string;
  type: string;
  method: string;
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string | null;
  notes?: string | null;
}

export interface ExportEmail {
  id: number;
  subject?: string;
  from_email?: string;
  from_name?: string;
  to_email?: string;
  body_text?: string;
  body_html?: string;
  date_received?: string;
}

export interface ExportComment {
  id: number;
  text: string;
  created_at?: string;
  user?: { username?: string };
}

export interface ExportProfileSettingsField {
  id: number;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ExportProfileSettingsContext {
  id: number;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ExportProfileSetting {
  geo: string;
  field_id: number;
  context_id: number;
  value: boolean;
}

export interface ExportData {
  casino: ExportCasino;
  profile: ExportProfileItem[];
  profileSettingsFields?: ExportProfileSettingsField[];
  profileSettingsContexts?: ExportProfileSettingsContext[];
  profileSettings?: ExportProfileSetting[];
  bonuses: ExportBonus[];
  payments: ExportPayment[];
  emails: ExportEmail[];
  comments: ExportComment[];
  geos: string[];
  recipients: string[];
  bonusImageUrls?: Record<number, string[]>;
  paymentImageUrls?: Record<number, string[]>;
  commentImageUrls?: { comment_id: number; url: string }[];
}

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return n;
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
};
const fmtAmount = (v: any, cur?: string | null) =>
  v == null ? '—' : (cur ? `${fmt(v)} ${cur}` : String(fmt(v)));

const BONUS_CATEGORY: Record<string, string> = { casino: 'Казино', sport: 'Спорт' };
const BONUS_KIND: Record<string, string> = { deposit: 'Депозит', nodeposit: 'Бездеп', cashback: 'Кешбек', rakeback: 'Рейкбек' };
const BONUS_TYPE: Record<string, string> = {
  cash: 'Кэш', freespin: 'FS', combo: 'Комбо', freebet: 'Фрибет', wagering: 'Вейджеринг',
  insurance: 'Страховка', accumulator: 'Аккумулятор', odds_boost: 'Повышение коэф.',
};

function escapeHtml(s: string): string {
  if (s == null || s === '') return '';
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function bonusBonusCell(b: ExportBonus): string {
  const parts: string[] = [];
  if (b.bonus_value != null) parts.push(b.bonus_unit === 'percent' ? `${fmt(b.bonus_value)}%` : fmtAmount(b.bonus_value, b.currency));
  if (b.freespins_count) parts.push(`${fmt(b.freespins_count)} FS`);
  if (b.cashback_percent) parts.push(`${fmt(b.cashback_percent)}%`);
  return parts.length > 0 ? escapeHtml(parts.join('+')) : '—';
}

function bonusModalContent(b: ExportBonus, imageUrls: string[], imageDataUrls: Record<string, string>): string {
  const imgHtml = imageUrls.length
    ? imageUrls.map((url) => {
        const src = imageDataUrls[url] || url;
        return `<img src="${escapeHtml(src)}" alt="" class="modal-img" />`;
      }).join('')
    : '';
  const maxWinCash = b.max_win_cash_value != null
    ? `${fmt(b.max_win_cash_value)} ${b.max_win_cash_unit === 'coefficient' ? '(коэф.)' : '(фикс.)'}`
    : '—';
  const maxWinFs = b.max_win_freespin_value != null
    ? `${fmt(b.max_win_freespin_value)} ${b.max_win_freespin_unit === 'coefficient' ? '(коэф.)' : '(фикс.)'}`
    : '—';
  const maxWinPct = b.max_win_percent_value != null
    ? `${fmt(b.max_win_percent_value)} ${b.max_win_percent_unit === 'coefficient' ? '(коэф.)' : '(фикс.)'}`
    : '—';
  return `
    <div class="modal-desc">
      <p><strong>GEO:</strong> <span class="modal-tag">${escapeHtml(b.geo)}</span></p>
      <p><strong>Категория:</strong> ${escapeHtml(BONUS_CATEGORY[b.bonus_category || ''] || b.bonus_category || '—')}</p>
      <p><strong>Вид:</strong> ${escapeHtml(BONUS_KIND[b.bonus_kind || ''] || b.bonus_kind || '—')}</p>
      <p><strong>Тип:</strong> ${escapeHtml(BONUS_TYPE[b.bonus_type || ''] || b.bonus_type || '—')}</p>
      <p><strong>Бонус:</strong> ${bonusBonusCell(b)}</p>
      <p><strong>Мин. депозит:</strong> ${escapeHtml(fmtAmount(b.min_deposit, b.currency))}</p>
      <p><strong>Макс. бонус:</strong> ${escapeHtml(fmtAmount(b.max_bonus, b.currency))}</p>
      <p><strong>Вейджеринг:</strong> ${b.wagering_requirement != null ? `x${fmt(b.wagering_requirement)}` : '—'}</p>
      <p><strong>Максвин кэш:</strong> ${escapeHtml(maxWinCash)}</p>
      <p><strong>Максвин фриспинов:</strong> ${escapeHtml(maxWinFs)}</p>
      <p><strong>Максвин % части:</strong> ${escapeHtml(maxWinPct)}</p>
      ${b.promo_code ? `<p><strong>Промокод:</strong> ${escapeHtml(b.promo_code)}</p>` : ''}
      ${b.valid_from ? `<p><strong>Действует с:</strong> ${escapeHtml(b.valid_from)}</p>` : ''}
      ${b.valid_to ? `<p><strong>Действует до:</strong> ${escapeHtml(b.valid_to)}</p>` : ''}
      ${b.notes ? `<p><strong>Заметки:</strong> ${escapeHtml(b.notes)}</p>` : ''}
    </div>
    ${imgHtml ? `<div class="modal-images">${imgHtml}</div>` : ''}
  `;
}

function paymentModalContent(p: ExportPayment, imageUrls: string[], imageDataUrls: Record<string, string>): string {
  const imgHtml = imageUrls.length
    ? imageUrls.map((url) => {
        const src = imageDataUrls[url] || url;
        return `<img src="${escapeHtml(src)}" alt="" class="modal-img" />`;
      }).join('')
    : '';
  return `
    <div class="modal-desc">
      <p><strong>GEO:</strong> <span class="modal-tag">${escapeHtml(p.geo)}</span></p>
      <p><strong>Направление:</strong> ${p.direction === 'withdrawal' ? 'Выплата' : 'Депозит'}</p>
      <p><strong>Тип:</strong> ${escapeHtml(p.type)}</p>
      <p><strong>Метод:</strong> ${escapeHtml(p.method)}</p>
      <p><strong>Мин. сумма:</strong> ${escapeHtml(fmtAmount(p.min_amount, p.currency))}</p>
      <p><strong>Макс. сумма:</strong> ${escapeHtml(fmtAmount(p.max_amount, p.currency))}</p>
      ${p.notes ? `<p><strong>Заметки:</strong> ${escapeHtml(p.notes)}</p>` : ''}
    </div>
    ${imgHtml ? `<div class="modal-images">${imgHtml}</div>` : ''}
  `;
}

/**
 * Собирает все URL изображений из data и опционально конвертирует в data URL через getImageDataUrl.
 */
async function resolveImageDataUrls(
  data: ExportData,
  getImageDataUrl?: (url: string) => Promise<string | null>
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!getImageDataUrl) return out;
  const urls = new Set<string>();
  (data.bonusImageUrls ? Object.values(data.bonusImageUrls).flat() : []).forEach((u) => urls.add(u));
  (data.paymentImageUrls ? Object.values(data.paymentImageUrls).flat() : []).forEach((u) => urls.add(u));
  (data.commentImageUrls || []).forEach((c) => urls.add(c.url));
  for (const url of urls) {
    const dataUrl = await getImageDataUrl(url);
    if (dataUrl) out[url] = dataUrl;
  }
  return out;
}

export async function exportProfileToInteractiveHtml(
  data: ExportData,
  options: {
    title?: string;
    filename?: string;
    getImageDataUrl?: (url: string) => Promise<string | null>;
  }
): Promise<void> {
  const { casino, profile, bonuses, payments, emails, comments, geos, recipients } = data;
  const imageDataUrls = await resolveImageDataUrls(data, options.getImageDataUrl);

  const bonusTableRows = bonuses.map((b) => `
    <tr data-geo="${escapeHtml(b.geo)}" data-bonus-id="${b.id}">
      <td>${escapeHtml(b.geo)}</td>
      <td>${escapeHtml(b.name)}</td>
      <td>${escapeHtml(BONUS_CATEGORY[b.bonus_category || ''] || b.bonus_category || '—')}</td>
      <td>${escapeHtml(BONUS_KIND[b.bonus_kind || ''] || b.bonus_kind || '—')}</td>
      <td>${escapeHtml(BONUS_TYPE[b.bonus_type || ''] || b.bonus_type || '—')}</td>
      <td>${bonusBonusCell(b)}</td>
      <td>${escapeHtml(fmtAmount(b.min_deposit, b.currency))}</td>
      <td>${b.wagering_requirement != null ? `x${fmt(b.wagering_requirement)}` : '—'}</td>
      <td><button type="button" class="btn-view" data-modal="bonus-${b.id}">Просмотр</button></td>
    </tr>
  `).join('');

  const bonusModalDivs = bonuses.map((b) => {
    const imageUrls = data.bonusImageUrls?.[b.id] ?? [];
    const modalBody = bonusModalContent(b, imageUrls, imageDataUrls);
    return `<div id="bonus-${b.id}" class="modal-content" style="display:none;">${modalBody}</div>`;
  }).join('');

  const paymentTableRows = payments.map((p) => {
    const dir = (p.direction ?? 'deposit') as string;
    return `
      <tr data-geo="${escapeHtml(p.geo)}" data-direction="${escapeHtml(dir)}" data-payment-id="${p.id}">
        <td>${dir === 'withdrawal' ? 'Выплата' : 'Депозит'}</td>
        <td>${escapeHtml(p.geo)}</td>
        <td>${escapeHtml(p.type)}</td>
        <td>${escapeHtml(p.method)}</td>
        <td>${escapeHtml(fmtAmount(p.min_amount, p.currency))}</td>
        <td>${escapeHtml(fmtAmount(p.max_amount, p.currency))}</td>
        <td><button type="button" class="btn-view" data-modal="payment-${p.id}">Просмотр</button></td>
      </tr>
    `;
  }).join('');

  const paymentModalDivs = payments.map((p) => {
    const imageUrls = data.paymentImageUrls?.[p.id] ?? [];
    const modalBody = paymentModalContent(p, imageUrls, imageDataUrls);
    return `<div id="payment-${p.id}" class="modal-content" style="display:none;">${modalBody}</div>`;
  }).join('');

  const emailItems = emails.map((e) => `
    <div class="email-item" data-to="${escapeHtml((e.to_email || '') as string)}" data-email-id="email-${e.id}">
      <div class="email-item-head">
        <strong>${escapeHtml((e.from_name || e.from_email || '—') as string)}</strong>
        ${e.to_email ? ` <span class="email-to">→ ${escapeHtml(e.to_email)}</span>` : ''}
        <br><span class="email-subject">${escapeHtml((e.subject || '—') as string)}</span>
        <br><span class="email-date">${escapeHtml((e.date_received || '') as string)}</span>
      </div>
      <div id="email-${e.id}" class="email-body" style="display:none;">
        <div class="email-body-inner">${e.body_html ? e.body_html : `<pre>${escapeHtml((e.body_text || '') as string)}</pre>`}</div>
      </div>
    </div>
  `).join('');

  const profileRows = profile.map((it) => `
    <tr><td class="label">${escapeHtml(it.field.label)}</td><td>${escapeHtml(String(it.value ?? '—'))}</td></tr>
  `).join('');

  const profileSettingsFields = (data.profileSettingsFields || []).filter((f) => Boolean(f.is_active)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const profileSettingsContexts = (data.profileSettingsContexts || []).filter((c) => Boolean(c.is_active)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const profileSettingsMap = new Map<string, boolean | number>();
  (data.profileSettings || []).forEach((s) => {
    const key = `${String(s.geo)}_${s.field_id}_${s.context_id}`;
    profileSettingsMap.set(key, s.value as boolean | number);
  });
  const profileSettingsGeos = geos.length > 0 ? geos : (casino.geo && casino.geo.length > 0 ? casino.geo : []);
  const profileSettingsGeoButtons = profileSettingsGeos.map((g) => `<button type="button" class="filter-btn profile-settings-geo-btn" data-geo="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('');
  const profileSettingsValueText = (val: boolean | number | undefined): string => (val === true || val === 1 ? 'Да' : 'Нет');
  const profileSettingsTables = profileSettingsGeos.map((geo) => {
    const rows = profileSettingsFields.map((field) => {
      const cells = profileSettingsContexts.map((ctx) => {
        const val = profileSettingsMap.get(`${geo}_${field.id}_${ctx.id}`);
        const text = profileSettingsValueText(val);
        return `<td class="profile-settings-cell">${escapeHtml(text)}</td>`;
      }).join('');
      return `<tr><td class="profile-settings-label">${escapeHtml(field.name)}</td>${cells}</tr>`;
    }).join('');
    const headerCells = profileSettingsContexts.map((ctx) => `<th class="profile-settings-th">${escapeHtml(ctx.name)}</th>`).join('');
    return `
      <div class="profile-settings-table-wrap" data-geo="${escapeHtml(geo)}" style="display:none;">
        <table class="profile-settings-table">
          <thead><tr><th class="profile-settings-th profile-settings-th-first">Поле</th>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join('');

  const commentItems = (comments || []).map((c) => {
    const imgs = (data.commentImageUrls || []).filter((i) => i.comment_id === c.id);
    const imgHtml = imgs.length
      ? imgs.map((i) => {
          const src = imageDataUrls[i.url] || i.url;
          return `<img src="${escapeHtml(src)}" alt="" style="max-width:120px;max-height:120px;object-fit:cover;border-radius:4px;margin:4px;" />`;
        }).join('')
      : '';
    return `
      <div class="comment-item">
        <div class="comment-meta">${escapeHtml((c.user?.username || '—') as string)} · ${escapeHtml((c.created_at || '') as string)}</div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
        ${imgHtml ? `<div class="comment-images">${imgHtml}</div>` : ''}
      </div>
    `;
  }).join('');

  const geoButtons = geos.map((g) => `<button type="button" class="filter-btn geo-btn" data-geo="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('');
  const geoPayButtons = geos.map((g) => `<button type="button" class="filter-btn geo-pay-btn" data-geo="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('');
  const recipientOptions = recipients.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');

  const title = options.title || `${casino.name} — анкета`;
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: rgba(0,0,0,0.88); }
    .card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .card-title { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
    th { background: #fafafa; font-weight: 500; }
    .label { width: 200px; color: #666; }
    .filter-bar { margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .filter-btn { padding: 4px 12px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
    .filter-btn.primary { background: #1677ff; color: #fff; border-color: #1677ff; }
    .btn-view { padding: 6px 14px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; transition: color 0.2s, border-color 0.2s, background 0.2s; }
    .btn-view:hover { color: #1677ff; border-color: #1677ff; background: #f0f7ff; }
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center; padding: 24px; animation: modalFadeIn 0.2s ease; }
    .modal-overlay.show { display: flex; }
    @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-box { background: #fff; border-radius: 12px; max-width: 640px; width: 100%; max-height: 90vh; overflow: hidden; position: relative; box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1); animation: modalSlideIn 0.25s ease; display: flex; flex-direction: column; }
    .modal-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; background: #fafafa; display: flex; align-items: center; justify-content: flex-end; }
    .modal-close { width: 36px; height: 36px; padding: 0; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-size: 22px; line-height: 1; color: #666; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s; }
    .modal-close:hover { color: #1677ff; background: #f0f7ff; }
    .modal-body-inner { padding: 20px 24px; overflow: auto; flex: 1; }
    .modal-desc { margin: 0; }
    .modal-desc p { margin: 10px 0; font-size: 14px; line-height: 1.5; }
    .modal-desc p:first-child { margin-top: 0; }
    .modal-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e6f4ff; color: #1677ff; font-size: 13px; }
    .modal-images { margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
    .modal-img { width: 90px; height: 90px; object-fit: cover; border-radius: 8px; margin: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .profile-settings-table-wrap { margin-top: 12px; overflow-x: auto; }
    .profile-settings-table { width: 100%; border-collapse: collapse; border: 1px solid #e8e8e8; font-size: 14px; }
    .profile-settings-table th, .profile-settings-table td { padding: 10px 12px; border: 1px solid #e8e8e8; vertical-align: middle; text-align: center; }
    .profile-settings-th { background: #fafafa; font-weight: 600; color: rgba(0,0,0,0.88); }
    .profile-settings-th-first { min-width: 180px; }
    .profile-settings-label { background: #fafafa; font-weight: 500; min-width: 180px; color: rgba(0,0,0,0.88); }
    .profile-settings-cell { min-width: 80px; }
    .profile-settings-placeholder { text-align: center; padding: 24px; color: #999; font-size: 14px; }
    .email-item { border-bottom: 1px solid #f0f0f0; padding: 12px 0; cursor: pointer; }
    .email-item:hover { background: #fafafa; }
    .email-to { color: #666; font-size: 12px; }
    .email-subject { font-size: 13px; }
    .email-date { color: #999; font-size: 12px; }
    .email-body { margin-top: 8px; padding: 12px; background: #fafafa; border-radius: 4px; }
    .email-body-inner { max-height: 400px; overflow: auto; }
    .comment-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .comment-meta { color: #666; font-size: 12px; margin-bottom: 4px; }
    .comment-text { white-space: pre-wrap; }
    .comment-images { margin-top: 8px; }
    select { padding: 6px 12px; border-radius: 6px; border: 1px solid #d9d9d9; min-width: 200px; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="card">
    <h1 style="margin:0 0 8px 0; font-size: 20px;">${escapeHtml(casino.name)}</h1>
    <p style="margin:0; color:#666;">${escapeHtml((casino.website || '—') as string)}</p>
  </div>

  <div class="card">
    <div class="card-title">Общая информация</div>
    <table>
      <tr><td class="label">Название</td><td>${escapeHtml(casino.name)}</td></tr>
      <tr><td class="label">Сайт</td><td>${casino.website ? `<a href="${escapeHtml(casino.website)}" target="_blank" rel="noreferrer">${escapeHtml(casino.website)}</a>` : '—'}</td></tr>
      <tr><td class="label">GEO</td><td>${(casino.geo && casino.geo.length) ? casino.geo.map((g) => escapeHtml(g)).join(', ') : '—'}</td></tr>
      <tr><td class="label">Наш</td><td>${casino.is_our ? 'Да' : 'Нет'}</td></tr>
      ${casino.description ? `<tr><td class="label">Описание</td><td>${escapeHtml(casino.description)}</td></tr>` : ''}
    </table>
  </div>

  ${profile.length ? `
  <div class="card">
    <div class="card-title">Дополнительные поля</div>
    <table>${profileRows}</table>
  </div>
  ` : ''}

  ${profileSettingsFields.length > 0 && profileSettingsContexts.length > 0 ? `
  <div class="card">
    <div class="card-title">Настройки профиля</div>
    <div class="filter-bar">
      <span style="color:#666;">GEO:</span>
      <button type="button" class="filter-btn profile-settings-geo-btn primary" data-geo="">Все</button>
      ${profileSettingsGeoButtons}
    </div>
    <div id="profile-settings-placeholder" class="profile-settings-placeholder">${profileSettingsGeos.length > 0 ? 'Выберите GEO для просмотра настроек.' : 'Нет GEO для отображения.'}</div>
    <div id="profile-settings-tables">${profileSettingsTables}</div>
  </div>
  ` : ''}

  <div class="card">
    <div class="card-title">Бонусы</div>
    <div class="filter-bar">
      <span style="color:#666;">GEO:</span>
      <button type="button" class="filter-btn geo-btn primary" data-geo="">Все</button>
      ${geoButtons}
    </div>
    <table><thead><tr><th>GEO</th><th>Название</th><th>Категория</th><th>Вид</th><th>Тип</th><th>Бонус</th><th>Мин.</th><th>x</th><th></th></tr></thead><tbody>${bonusTableRows}</tbody></table>
    <div id="bonus-modals" style="display:none;">${bonusModalDivs}</div>
  </div>

  <div class="card">
    <div class="card-title">Платёжные решения</div>
    <div class="filter-bar">
      <span style="color:#666;">Направление:</span>
      <button type="button" class="filter-btn dir-btn primary" data-direction="">Все</button>
      <button type="button" class="filter-btn dir-btn" data-direction="deposit">Деп</button>
      <button type="button" class="filter-btn dir-btn" data-direction="withdrawal">Вывод</button>
      <span style="color:#666; margin-left:12px;">GEO:</span>
      <button type="button" class="filter-btn geo-pay-btn primary" data-geo="">Все</button>
      ${geoPayButtons}
    </div>
    <table><thead><tr><th>Направление</th><th>GEO</th><th>Тип</th><th>Метод</th><th>Мин.</th><th>Макс.</th><th></th></tr></thead><tbody>${paymentTableRows}</tbody></table>
    <div id="payment-modals" style="display:none;">${paymentModalDivs}</div>
  </div>

  <div class="card">
    <div class="card-title">Почта</div>
    <div class="filter-bar">
      <label>Получатель:</label>
      <select id="filter-recipient">
        <option value="">Все</option>
        ${recipientOptions}
      </select>
    </div>
    <div id="email-list">${emailItems}</div>
  </div>

  ${comments.length ? `
  <div class="card">
    <div class="card-title">Комментарии (${comments.length})</div>
    <div>${commentItems}</div>
  </div>
  ` : ''}

  <div id="modal-overlay" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-header">
        <button type="button" class="modal-close" id="modal-close" aria-label="Закрыть">&times;</button>
      </div>
      <div id="modal-body" class="modal-body-inner"></div>
    </div>
  </div>

  <script>
(function() {
  var overlay = document.getElementById('modal-overlay');
  var modalBody = document.getElementById('modal-body');
  var modalClose = document.getElementById('modal-close');

  function openModal(contentEl) {
    if (!contentEl) return;
    modalBody.innerHTML = contentEl.innerHTML;
    overlay.classList.add('show');
  }
  function closeModal() {
    overlay.classList.remove('show');
  }
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  modalClose.addEventListener('click', closeModal);

  document.querySelectorAll('.btn-view[data-modal]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.getAttribute('data-modal');
      var el = document.getElementById(id);
      if (el) openModal(el);
    });
  });

  // GEO filter bonuses
  var bonusRows = document.querySelectorAll('tbody tr[data-bonus-id]');
  document.querySelectorAll('.geo-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.geo-btn').forEach(function(b) { b.classList.remove('primary'); });
      this.classList.add('primary');
      var geo = this.getAttribute('data-geo') || '';
      bonusRows.forEach(function(row) {
        row.classList.toggle('hidden', geo !== '' && row.getAttribute('data-geo') !== geo);
      });
    });
  });

  // Direction + GEO filter payments
  var paymentRows = document.querySelectorAll('tbody tr[data-payment-id]');
  document.querySelectorAll('.dir-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.dir-btn').forEach(function(b) { b.classList.remove('primary'); });
      this.classList.add('primary');
      applyPaymentFilters();
    });
  });
  document.querySelectorAll('.geo-pay-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.geo-pay-btn').forEach(function(b) { b.classList.remove('primary'); });
      this.classList.add('primary');
      applyPaymentFilters();
    });
  });
  function applyPaymentFilters() {
    var dirBtn = document.querySelector('.dir-btn.primary');
    var geoBtn = document.querySelector('.geo-pay-btn.primary');
    var dir = (dirBtn && dirBtn.getAttribute('data-direction')) || '';
    var geo = (geoBtn && geoBtn.getAttribute('data-geo')) || '';
    paymentRows.forEach(function(row) {
      var matchDir = !dir || row.getAttribute('data-direction') === dir;
      var matchGeo = !geo || row.getAttribute('data-geo') === geo;
      row.classList.toggle('hidden', !matchDir || !matchGeo);
    });
  }

  // Profile settings GEO filter
  var profileSettingsPlaceholder = document.getElementById('profile-settings-placeholder');
  var profileSettingsTables = document.getElementById('profile-settings-tables');
  var profileSettingsGeoBtns = document.querySelectorAll('.profile-settings-geo-btn');
  if (profileSettingsGeoBtns.length && profileSettingsTables) {
    profileSettingsGeoBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        profileSettingsGeoBtns.forEach(function(b) { b.classList.remove('primary'); });
        this.classList.add('primary');
        var geo = this.getAttribute('data-geo') || '';
        if (profileSettingsPlaceholder) profileSettingsPlaceholder.style.display = geo ? 'none' : 'block';
        profileSettingsTables.querySelectorAll('.profile-settings-table-wrap').forEach(function(wrap) {
          wrap.style.display = wrap.getAttribute('data-geo') === geo ? 'block' : 'none';
        });
      });
    });
  }

  // Recipient filter emails
  var emailItems = document.querySelectorAll('.email-item');
  var filterRecipient = document.getElementById('filter-recipient');
  if (filterRecipient) {
    filterRecipient.addEventListener('change', function() {
      var val = this.value || '';
      emailItems.forEach(function(item) {
        item.classList.toggle('hidden', val !== '' && item.getAttribute('data-to') !== val);
      });
    });
  }

  // Email click -> toggle body
  emailItems.forEach(function(item) {
    var bodyId = item.getAttribute('data-email-id');
    if (!bodyId) return;
    var bodyEl = item.querySelector('.email-body');
    if (!bodyEl) return;
    item.addEventListener('click', function(e) {
      if (e.target.closest('.email-body')) return;
      bodyEl.style.display = bodyEl.style.display === 'none' ? 'block' : 'none';
    });
  });
})();
  </script>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || `${title.replace(/[^\w\s-]/g, '')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
