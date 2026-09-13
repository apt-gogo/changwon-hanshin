/* ============================================================
   관리자 관심고객 조회 / 1차 방어용
   ------------------------------------------------------------
   기본 화면 : 전체 미확인 고객(NEW)
   확인 처리 : CONFIRMED로 변경 후 기본 목록에서 즉시 제외
   확인완료 조회 : [확인완료 고객] 버튼으로 전환
   날짜       : 기본 공란, 필요 시 기간검색
   고객       : 이름 · 전화번호 ComboBox
   ============================================================ */
(() => {
  if (!isSupabaseConfigReady()) {
    alert('Supabase 연결정보가 설정되지 않았습니다.');
    location.href = 'index.html';
    return;
  }

  if (typeof SITE_CONFIG === 'undefined') {
    alert('SITE_CONFIG를 불러오지 못했습니다.');
    location.href = 'index.html';
    return;
  }

  const client = createAptGogoSupabaseClient();

  const rows = document.getElementById('customerRows');
  const mobileCards = document.getElementById('mobileCustomerCards');
  const status = document.getElementById('queryStatus');
  const customerFilter = document.getElementById('customerFilter');
  const completedButton = document.getElementById('completedButton');
  const resultCount = document.getElementById('resultCount');
  const reservedCount = document.getElementById('reservedCount');

  let viewStatus = SITE_CONFIG.customer.statusNew;
  let customerIndex = new Map();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat(SITE_CONFIG.ui.locale, {
      timeZone: SITE_CONFIG.ui.timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(value));
  }

  function formatMobile(value) {
    const n = String(value || '').replace(/\D/g, '');
    if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
    if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
    return n || '-';
  }

  function localDayStartIso(dateText) {
    return new Date(`${dateText}T00:00:00+09:00`).toISOString();
  }

  function localDayEndIso(dateText) {
    return new Date(`${dateText}T23:59:59.999+09:00`).toISOString();
  }

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = `admin-status ${type}`.trim();
  }

  function setViewStatus(nextStatus) {
    viewStatus = nextStatus;
    const isConfirmed = viewStatus === SITE_CONFIG.customer.statusConfirmed;
    completedButton.textContent = isConfirmed ? '미확인 고객' : '확인완료 고객';
    completedButton.classList.toggle('is-active', isConfirmed);
  }

  async function requireSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      location.href = 'index.html';
      return null;
    }
    document.getElementById('loginUser').textContent = data.session.user.email || '';
    return data.session;
  }

  /* 고객 ComboBox는 전체 활성 고객을 바인딩합니다.
     이미 확인한 고객을 선택하면 해당 고객 상태에 맞춰 조회모드도 자동 전환합니다. */
  async function loadCustomerCombo() {
    const { data, error } = await client
      .from('trn_apt_customer')
      .select('id, customer_name, mobile_no, customer_status, created_at')
      .eq('active_yn', 'Y')
      .order('created_at', { ascending: false })
      .limit(SITE_CONFIG.customer.defaultListLimit);

    if (error) throw error;

    customerIndex = new Map(data.map(item => [String(item.id), item]));
    customerFilter.innerHTML = '<option value="">전체</option>';

    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.customer_name} · ${formatMobile(item.mobile_no)}`;
      customerFilter.appendChild(option);
    });
  }

  function buildBaseQuery() {
    return client
      .from('trn_apt_customer')
      .select(`
        id, created_at, apt_site_id, customer_name, mobile_no,
        visit_date, visit_time, customer_message,
        marketing_agree_yn, source_channel, customer_status,
        md_apt_site ( site_name, site_code )
      `)
      .eq('active_yn', 'Y')
      .eq('customer_status', viewStatus)
      .order('created_at', { ascending: false })
      .limit(SITE_CONFIG.customer.defaultListLimit);
  }

  async function loadCustomers() {
    rows.innerHTML = '<tr><td colspan="9" class="empty-cell">조회 중...</td></tr>';
    mobileCards.innerHTML = '<div class="mobile-empty">조회 중...</div>';
    setStatus('');

    let query = buildBaseQuery();

    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const customerId = customerFilter.value;

    if (dateFrom) query = query.gte('created_at', localDayStartIso(dateFrom));
    if (dateTo) query = query.lte('created_at', localDayEndIso(dateTo));
    if (customerId) query = query.eq('id', Number(customerId));

    const { data, error } = await query;
    if (error) throw error;

    renderCustomers(data || []);
  }

  function renderCustomers(data) {
    resultCount.textContent = data.length.toLocaleString(SITE_CONFIG.ui.locale);
    reservedCount.textContent = data.filter(x => x.visit_date).length.toLocaleString(SITE_CONFIG.ui.locale);

    if (!data.length) {
      const label = viewStatus === SITE_CONFIG.customer.statusConfirmed ? '확인완료 고객' : '미확인 고객';
      rows.innerHTML = `<tr><td colspan="9" class="empty-cell">조회된 ${label}이 없습니다.</td></tr>`;
      mobileCards.innerHTML = `<div class="mobile-empty">조회된 ${label}이 없습니다.</div>`;
      return;
    }

    const canConfirm = viewStatus === SITE_CONFIG.customer.statusNew;

    rows.innerHTML = data.map(item => `
      <tr>
        <td>${escapeHtml(formatDateTime(item.created_at))}</td>
        <td class="customer-name">${escapeHtml(item.customer_name)}</td>
        <td><a class="phone-link" href="tel:${escapeHtml(item.mobile_no)}">${escapeHtml(formatMobile(item.mobile_no))}</a></td>
        <td>${escapeHtml(item.visit_date || '-')}</td>
        <td>${escapeHtml(item.visit_time ? item.visit_time.slice(0,5) : '-')}</td>
        <td class="customer-message">${escapeHtml(item.customer_message || '-')}</td>
        <td>${item.marketing_agree_yn === 'Y' ? '동의' : '미동의'}</td>
        <td>${escapeHtml(item.source_channel || '-')}</td>
        <td class="action-cell">${canConfirm ? `<button class="confirm-button" type="button" data-confirm-id="${item.id}" data-confirm-name="${escapeHtml(item.customer_name)}">확인완료</button>` : '<span class="confirmed-label">확인완료</span>'}</td>
      </tr>
    `).join('');

    mobileCards.innerHTML = data.map(item => {
      const visitDate = item.visit_date ? item.visit_date.slice(5).replace('-', '/') : '예약일 미정';
      const visitTime = item.visit_time ? item.visit_time.slice(0, 5) : '';
      const message = item.customer_message || '남긴 메시지 없음';

      return `
        <article class="mobile-customer-card">
          <div class="mobile-card-topline">${escapeHtml(visitDate)}${visitTime ? ` ${escapeHtml(visitTime)}` : ''}</div>
          <div class="mobile-card-customer">
            <strong>${escapeHtml(item.customer_name)}</strong>
            <span>·</span>
            <a class="phone-link" href="tel:${escapeHtml(item.mobile_no)}">${escapeHtml(formatMobile(item.mobile_no))}</a>
          </div>
          <div class="mobile-card-message">“${escapeHtml(message)}”</div>
          ${canConfirm ? `<button class="confirm-button mobile-confirm-button" type="button" data-confirm-id="${item.id}" data-confirm-name="${escapeHtml(item.customer_name)}">확인완료</button>` : '<div class="mobile-confirmed-label">확인완료 고객</div>'}
        </article>
      `;
    }).join('');
  }

  async function confirmCustomer(customerId, customerName) {
    const ok = window.confirm(`${customerName} 고객을 확인완료 처리하시겠습니까?`);
    if (!ok) return;

    setStatus('확인완료 처리 중...');

    const { error } = await client
      .from('trn_apt_customer')
      .update({ customer_status: SITE_CONFIG.customer.statusConfirmed })
      .eq('id', Number(customerId))
      .eq('customer_status', SITE_CONFIG.customer.statusNew)
      .eq('active_yn', 'Y');

    if (error) throw error;

    setStatus(`${customerName} 고객을 확인완료 처리했습니다.`, 'success');
    await loadCustomerCombo();
    await loadCustomers();
  }

  async function handleConfirmClick(event) {
    const button = event.target.closest('[data-confirm-id]');
    if (!button) return;

    button.disabled = true;
    try {
      await confirmCustomer(button.dataset.confirmId, button.dataset.confirmName || '선택한');
    } catch (error) {
      console.error(error);
      setStatus('확인완료 처리 중 오류가 발생했습니다. 관리자 권한/RLS 설정을 확인해 주세요.', 'error');
      button.disabled = false;
    }
  }

  document.getElementById('searchButton').addEventListener('click', () => {
    loadCustomers().catch(handleLoadError);
  });

  document.getElementById('refreshButton').addEventListener('click', async () => {
    try {
      await loadCustomerCombo();
      await loadCustomers();
    } catch (error) {
      handleLoadError(error);
    }
  });

  completedButton.addEventListener('click', () => {
    setViewStatus(
      viewStatus === SITE_CONFIG.customer.statusNew
        ? SITE_CONFIG.customer.statusConfirmed
        : SITE_CONFIG.customer.statusNew
    );
    customerFilter.value = '';
    loadCustomers().catch(handleLoadError);
  });

  customerFilter.addEventListener('change', () => {
    const selected = customerIndex.get(customerFilter.value);
    if (selected?.customer_status) {
      setViewStatus(selected.customer_status);
    }
    loadCustomers().catch(handleLoadError);
  });

  rows.addEventListener('click', handleConfirmClick);
  mobileCards.addEventListener('click', handleConfirmClick);

  document.getElementById('logoutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    location.href = 'index.html';
  });

  function handleLoadError(error) {
    console.error(error);
    rows.innerHTML = '<tr><td colspan="9" class="empty-cell">조회 중 오류가 발생했습니다.</td></tr>';
    mobileCards.innerHTML = '<div class="mobile-empty">조회 중 오류가 발생했습니다.</div>';
    resultCount.textContent = '0';
    reservedCount.textContent = '0';
    setStatus('고객정보를 불러오지 못했습니다. Supabase 권한/RLS 설정을 확인해 주세요.', 'error');
  }

  async function init() {
    try {
      const session = await requireSession();
      if (!session) return;

      /* 날짜는 의도적으로 초기값을 넣지 않습니다. 전체 미확인 고객이 기본입니다. */
      document.getElementById('dateFrom').value = '';
      document.getElementById('dateTo').value = '';
      setViewStatus(SITE_CONFIG.customer.statusNew);

      await loadCustomerCombo();
      await loadCustomers();
    } catch (error) {
      handleLoadError(error);
    }
  }

  init();
})();
