/* ============================================================
   관리자 관심고객 조회
   ------------------------------------------------------------
   - Supabase Auth 로그인 세션이 없으면 로그인 화면으로 이동
   - authenticated 역할만 trn_apt_customer SELECT 가능
   - 현재 1차 버전은 조회 전용
   ============================================================ */
(() => {
  if (!isSupabaseConfigReady()) {
    alert('Supabase 연결정보가 설정되지 않았습니다.');
    location.href = 'index.html';
    return;
  }

  const client = createAptGogoSupabaseClient();
  const rows = document.getElementById('customerRows');
  const status = document.getElementById('queryStatus');
  const siteFilter = document.getElementById('siteFilter');

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
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
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

  async function requireSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      location.href = 'index.html';
      return null;
    }
    document.getElementById('loginUser').textContent = data.session.user.email || '';
    return data.session;
  }

  async function loadSites() {
    const { data, error } = await client
      .from('md_apt_site')
      .select('id, site_name, site_code, active_yn')
      .order('site_name');

    if (error) throw error;

    siteFilter.innerHTML = '<option value="">전체</option>';
    data.forEach(site => {
      const option = document.createElement('option');
      option.value = site.id;
      option.textContent = `${site.site_name}${site.active_yn === 'N' ? ' (종료)' : ''}`;
      siteFilter.appendChild(option);
    });
  }

  async function loadCustomers() {
    rows.innerHTML = '<tr><td colspan="8" class="empty-cell">조회 중...</td></tr>';
    setStatus('');

    let query = client
      .from('trn_apt_customer')
      .select(`
        id, created_at, apt_site_id, customer_name, mobile_no,
        visit_date, visit_time, marketing_agree_yn, source_channel,
        md_apt_site ( site_name, site_code )
      `)
      .eq('active_yn', 'Y')
      .order('created_at', { ascending: false })
      .limit(500);

    const siteId = siteFilter.value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const customerName = document.getElementById('nameFilter').value.trim();
    const mobileNo = document.getElementById('mobileFilter').value.replace(/\D/g, '');

    if (siteId) query = query.eq('apt_site_id', siteId);
    if (dateFrom) query = query.gte('created_at', localDayStartIso(dateFrom));
    if (dateTo) query = query.lte('created_at', localDayEndIso(dateTo));
    if (customerName) query = query.ilike('customer_name', `%${customerName}%`);
    if (mobileNo) query = query.ilike('mobile_no', `%${mobileNo}%`);

    const { data, error } = await query;
    if (error) throw error;

    document.getElementById('resultCount').textContent = data.length.toLocaleString('ko-KR');
    document.getElementById('reservedCount').textContent = data.filter(x => x.visit_date).length.toLocaleString('ko-KR');

    if (!data.length) {
      rows.innerHTML = '<tr><td colspan="8" class="empty-cell">조회된 관심고객이 없습니다.</td></tr>';
      return;
    }

    rows.innerHTML = data.map(item => `
      <tr>
        <td>${escapeHtml(formatDateTime(item.created_at))}</td>
        <td>${escapeHtml(item.md_apt_site?.site_name || '-')}</td>
        <td class="customer-name">${escapeHtml(item.customer_name)}</td>
        <td><a class="phone-link" href="tel:${escapeHtml(item.mobile_no)}">${escapeHtml(formatMobile(item.mobile_no))}</a></td>
        <td>${escapeHtml(item.visit_date || '-')}</td>
        <td>${escapeHtml(item.visit_time ? item.visit_time.slice(0,5) : '-')}</td>
        <td>${item.marketing_agree_yn === 'Y' ? '동의' : '미동의'}</td>
        <td>${escapeHtml(item.source_channel || '-')}</td>
      </tr>
    `).join('');
  }

  document.getElementById('searchButton').addEventListener('click', () => {
    loadCustomers().catch(error => {
      console.error(error);
      setStatus('조회 중 오류가 발생했습니다.', 'error');
    });
  });

  document.getElementById('refreshButton').addEventListener('click', () => {
    loadCustomers().catch(error => {
      console.error(error);
      setStatus('새로고침 중 오류가 발생했습니다.', 'error');
    });
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    location.href = 'index.html';
  });

  document.getElementById('mobileFilter').addEventListener('input', event => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 11);
  });

  (async () => {
    const session = await requireSession();
    if (!session) return;

    try {
      await loadSites();
      await loadCustomers();
    } catch (error) {
      console.error(error);
      rows.innerHTML = '<tr><td colspan="8" class="empty-cell">데이터를 불러오지 못했습니다.</td></tr>';
      setStatus('Supabase 테이블/RLS/권한 설정을 확인해 주세요.', 'error');
    }
  })();
})();
