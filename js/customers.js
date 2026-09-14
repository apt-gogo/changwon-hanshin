/* ============================================================
   APT-GOGO 관리자 관심고객 조회 / 최종
   ------------------------------------------------------------
   기본 조회      : 미확인 고객(NEW) 전체
   기간 조회      : 등록일 From / To 선택 시 해당 기간만 조회
   고객 선택      : 고객명 · 전화번호 ComboBox
   고객 확인 처리  : [확인함] 클릭 시 NEW -> CONFIRMED
   조회상태 전환  : 버튼 문구가 현재 조회 상태(미확인 고객 / 확인완료 고객)를 표시

   유지보수 원칙
   - 현장별/운영별 변경값은 SITE_CONFIG에서 관리합니다.
   - 이 파일에는 화면 동작과 DB 처리 로직만 둡니다.
   ============================================================ */
(() => {
  'use strict';

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

  // ------------------------------------------------------------
  // 1. 화면 요소
  // ------------------------------------------------------------
  const el = {
    rows: document.getElementById('customerRows'),
    mobileCards: document.getElementById('mobileCustomerCards'),
    status: document.getElementById('queryStatus'),
    customerFilter: document.getElementById('customerFilter'),
    completedButton: document.getElementById('completedButton'),
    resultCount: document.getElementById('resultCount'),
    reservedCount: document.getElementById('reservedCount'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    periodClearButton: document.getElementById('periodClearButton'),
    searchButton: document.getElementById('searchButton'),
    refreshButton: document.getElementById('refreshButton'),
    logoutButton: document.getElementById('logoutButton'),
    loginUser: document.getElementById('loginUser')
  };

  let viewStatus = SITE_CONFIG.customer.statusNew;
  let customerIndex = new Map();

  // ------------------------------------------------------------
  // 2. 공통 함수
  // ------------------------------------------------------------
  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMobile(value) {
    const n = String(value || '').replace(/\D/g, '');
    if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
    return n || '-';
  }

  function formatDateTime(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat(SITE_CONFIG.ui.locale, {
      timeZone: SITE_CONFIG.ui.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(value));
  }

  function localDayStartIso(dateText) {
    return new Date(`${dateText}T00:00:00+09:00`).toISOString();
  }

  function localDayEndIso(dateText) {
    return new Date(`${dateText}T23:59:59.999+09:00`).toISOString();
  }

  function setStatus(message, type = '') {
    if (!el.status) return;
    el.status.textContent = message;
    el.status.className = `admin-status ${type}`.trim();
  }

  function setViewStatus(nextStatus) {
    viewStatus = nextStatus;

    const isConfirmed = viewStatus === SITE_CONFIG.customer.statusConfirmed;
    // 버튼 문구는 '이동 대상'이 아니라 현재 화면에 조회되는 고객 상태를 표시합니다.
    el.completedButton.textContent = isConfirmed ? '확인완료 고객' : '미확인 고객';
    el.completedButton.classList.toggle('is-active', isConfirmed);
  }

  function setLoading(message = '조회 중...') {
    el.rows.innerHTML = `<tr><td colspan="9" class="empty-cell">${escapeHtml(message)}</td></tr>`;
    el.mobileCards.innerHTML = `<div class="mobile-empty">${escapeHtml(message)}</div>`;
  }

  function showError(error, message) {
    console.error(error);
    setLoading(message);
    el.resultCount.textContent = '0';
    el.reservedCount.textContent = '0';
    setStatus(message, 'error');
  }

  // ------------------------------------------------------------
  // 3. 로그인 세션
  // ------------------------------------------------------------
  async function requireSession() {
    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
      location.href = 'index.html';
      return null;
    }

    el.loginUser.textContent = data.session.user.email || '';
    return data.session;
  }

  // ------------------------------------------------------------
  // 4. 고객 ComboBox
  //    - 전체 활성 고객 표시
  //    - 표시값: 고객명 · 전화번호
  // ------------------------------------------------------------
  async function loadCustomerCombo() {
    const { data, error } = await client
      .from('trn_apt_customer')
      .select('id, customer_name, mobile_no, customer_status, created_at')
      .eq('active_yn', 'Y')
      .order('created_at', { ascending: false })
      .limit(SITE_CONFIG.customer.defaultListLimit);

    if (error) throw error;

    const customers = data || [];
    customerIndex = new Map(customers.map(item => [String(item.id), item]));

    el.customerFilter.innerHTML = '<option value="">전체</option>';

    customers.forEach(item => {
      const option = document.createElement('option');
      option.value = String(item.id);
      option.textContent = `${item.customer_name} · ${formatMobile(item.mobile_no)}`;
      el.customerFilter.appendChild(option);
    });
  }

  // ------------------------------------------------------------
  // 5. 고객 조회
  // ------------------------------------------------------------
  async function loadCustomers() {
    setLoading();
    setStatus('');

    let query = client
      .from('trn_apt_customer')
      .select(`
        id,
        created_at,
        apt_site_id,
        customer_name,
        mobile_no,
        visit_date,
        visit_time,
        customer_message,
        customer_status,
        marketing_agree_yn,
        source_channel,
        active_yn,
        md_apt_site (
          site_name,
          site_code
        )
      `)
      .eq('active_yn', 'Y')
      .eq('customer_status', viewStatus)
      .order('created_at', { ascending: false })
      .limit(SITE_CONFIG.customer.defaultListLimit);

    if (el.dateFrom.value) {
      query = query.gte('created_at', localDayStartIso(el.dateFrom.value));
    }

    if (el.dateTo.value) {
      query = query.lte('created_at', localDayEndIso(el.dateTo.value));
    }

    if (el.customerFilter.value) {
      query = query.eq('id', Number(el.customerFilter.value));
    }

    const { data, error } = await query;
    if (error) throw error;

    renderCustomers(data || []);
  }

  // ------------------------------------------------------------
  // 6. 조회결과 화면 표시
  // ------------------------------------------------------------
  function renderCustomers(customers) {
    el.resultCount.textContent = String(customers.length);
    el.reservedCount.textContent = String(customers.filter(item => item.visit_date).length);

    if (customers.length === 0) {
      const label = viewStatus === SITE_CONFIG.customer.statusConfirmed
        ? '확인완료 고객'
        : '미확인 고객';

      el.rows.innerHTML = `<tr><td colspan="9" class="empty-cell">조회된 ${label}이 없습니다.</td></tr>`;
      el.mobileCards.innerHTML = `<div class="mobile-empty">조회된 ${label}이 없습니다.</div>`;
      return;
    }

    const canConfirm = viewStatus === SITE_CONFIG.customer.statusNew;

    el.rows.innerHTML = customers.map(item => {
      const action = canConfirm
        ? `<button class="confirm-button" type="button" data-confirm-id="${item.id}" data-confirm-name="${escapeHtml(item.customer_name)}">확인함</button>`
        : '<span class="confirmed-label">확인완료</span>';

      return `
        <tr>
          <td>${escapeHtml(formatDateTime(item.created_at))}</td>
          <td class="customer-name">${escapeHtml(item.customer_name)}</td>
          <td><a class="phone-link" href="tel:${escapeHtml(item.mobile_no)}">${escapeHtml(formatMobile(item.mobile_no))}</a></td>
          <td>${escapeHtml(item.visit_date || '-')}</td>
          <td>${escapeHtml(item.visit_time ? item.visit_time.slice(0, 5) : '-')}</td>
          <td class="customer-message">${escapeHtml(item.customer_message || '-')}</td>
          <td>${item.marketing_agree_yn === 'Y' ? '동의' : '미동의'}</td>
          <td>${escapeHtml(item.source_channel || '-')}</td>
          <td class="action-cell">${action}</td>
        </tr>
      `;
    }).join('');

    el.mobileCards.innerHTML = customers.map(item => {
      const visitDate = item.visit_date
        ? item.visit_date.slice(5).replace('-', '/')
        : '예약일 미정';

      const visitTime = item.visit_time
        ? item.visit_time.slice(0, 5)
        : '';

      const message = item.customer_message || '남긴 메시지 없음';

      const action = canConfirm
        ? `<button class="confirm-button mobile-confirm-button" type="button" data-confirm-id="${item.id}" data-confirm-name="${escapeHtml(item.customer_name)}">확인함</button>`
        : '<div class="mobile-confirmed-label">확인완료 고객</div>';

      return `
        <article class="mobile-customer-card">
          <div class="mobile-card-topline">
            ${escapeHtml(visitDate)}${visitTime ? ` ${escapeHtml(visitTime)}` : ''}
          </div>
          <div class="mobile-card-customer">
            <strong>${escapeHtml(item.customer_name)}</strong>
            <span>·</span>
            <a class="phone-link" href="tel:${escapeHtml(item.mobile_no)}">${escapeHtml(formatMobile(item.mobile_no))}</a>
          </div>
          <div class="mobile-card-message">“${escapeHtml(message)}”</div>
          ${action}
        </article>
      `;
    }).join('');
  }

  // ------------------------------------------------------------
  // 7. 확인완료 처리
  // ------------------------------------------------------------
  async function confirmCustomer(customerId, customerName) {
    const ok = window.confirm(`${customerName} 고객을 확인 처리하시겠습니까?`);
    if (!ok) return;

    setStatus('고객 확인 처리 중...');

    const { error } = await client
      .from('trn_apt_customer')
      .update({
        customer_status: SITE_CONFIG.customer.statusConfirmed
      })
      .eq('id', Number(customerId))
      .eq('customer_status', SITE_CONFIG.customer.statusNew)
      .eq('active_yn', 'Y');

    if (error) throw error;

    setStatus(`${customerName} 고객을 확인했습니다.`, 'success');

    await loadCustomerCombo();
    await loadCustomers();
  }

  async function handleConfirmClick(event) {
    const button = event.target.closest('[data-confirm-id]');
    if (!button) return;

    button.disabled = true;

    try {
      await confirmCustomer(
        button.dataset.confirmId,
        button.dataset.confirmName || '선택한'
      );
    } catch (error) {
      console.error(error);
      setStatus('고객 확인 처리 중 오류가 발생했습니다.', 'error');
      button.disabled = false;
    }
  }

  // ------------------------------------------------------------
  // 8. 이벤트
  // ------------------------------------------------------------
  el.searchButton.addEventListener('click', () => {
    loadCustomers().catch(error => {
      showError(error, '조회 중 오류가 발생했습니다.');
    });
  });

  el.refreshButton.addEventListener('click', async () => {
    try {
      await loadCustomerCombo();
      await loadCustomers();
    } catch (error) {
      showError(error, '새로고침 중 오류가 발생했습니다.');
    }
  });

  // 등록일 From / To를 다시 빈 값으로 돌리고 현재 상태 전체를 재조회합니다.
  el.periodClearButton.addEventListener('click', () => {
    el.dateFrom.value = '';
    el.dateTo.value = '';

    loadCustomers().catch(error => {
      showError(error, '조회 중 오류가 발생했습니다.');
    });
  });

  el.completedButton.addEventListener('click', () => {
    const nextStatus = viewStatus === SITE_CONFIG.customer.statusNew
      ? SITE_CONFIG.customer.statusConfirmed
      : SITE_CONFIG.customer.statusNew;

    setViewStatus(nextStatus);
    el.customerFilter.value = '';

    loadCustomers().catch(error => {
      showError(error, '조회 중 오류가 발생했습니다.');
    });
  });

  el.customerFilter.addEventListener('change', () => {
    const selected = customerIndex.get(el.customerFilter.value);

    if (selected && selected.customer_status) {
      setViewStatus(selected.customer_status);
    }

    loadCustomers().catch(error => {
      showError(error, '조회 중 오류가 발생했습니다.');
    });
  });

  el.rows.addEventListener('click', handleConfirmClick);
  el.mobileCards.addEventListener('click', handleConfirmClick);

  el.logoutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    location.href = 'index.html';
  });

  // ------------------------------------------------------------
  // 9. 초기화
  // ------------------------------------------------------------
  async function init() {
    try {
      const session = await requireSession();
      if (!session) return;

      // 날짜는 의도적으로 비워 둡니다.
      el.dateFrom.value = '';
      el.dateTo.value = '';

      // 첫 화면은 전체 미확인 고객입니다.
      setViewStatus(SITE_CONFIG.customer.statusNew);

      await loadCustomerCombo();
      await loadCustomers();
    } catch (error) {
      showError(error, '고객정보를 불러오지 못했습니다.');
    }
  }

  init();
})();
