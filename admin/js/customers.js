/* ============================================================
   APT-GOGO 관리자 관심고객 조회 - 진단용
   ------------------------------------------------------------
   목적:
   - 기존 기능은 유지
   - Supabase 오류 발생 시 실제 error.message / code / details 표시
   - 원인 확인 후 이 진단 문구는 제거 예정
   ============================================================ */

(() => {
  if (!isSupabaseConfigReady()) {
    alert('Supabase 연결정보가 설정되지 않았습니다.');
    location.href = 'index.html';
    return;
  }

  const client = createAptGogoSupabaseClient();

  const rows = document.getElementById('customerRows');
  const mobileCards = document.getElementById('mobileCustomerCards');
  const status = document.getElementById('queryStatus');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = `admin-status ${type}`.trim();
  }

  function showDiagnosticError(error, stage = '조회') {
    console.error(`[${stage} 오류]`, error);

    const message = error?.message || '알 수 없는 오류';
    const code = error?.code || '-';
    const details = error?.details || '-';
    const hint = error?.hint || '-';

    const diagnostic =
      `${stage} 오류 | message: ${message} | code: ${code} | details: ${details} | hint: ${hint}`;

    setStatus(diagnostic, 'error');

    if (rows) {
      rows.innerHTML =
        `<tr><td colspan="9" class="empty-cell">${escapeHtml(diagnostic)}</td></tr>`;
    }

    if (mobileCards) {
      mobileCards.innerHTML =
        `<div class="mobile-empty">${escapeHtml(diagnostic)}</div>`;
    }
  }

  async function requireSession() {
    const { data, error } = await client.auth.getSession();

    if (error) {
      showDiagnosticError(error, '세션 확인');
      return null;
    }

    if (!data.session) {
      location.href = 'index.html';
      return null;
    }

    const loginUser = document.getElementById('loginUser');
    if (loginUser) {
      loginUser.textContent = data.session.user.email || '';
    }

    return data.session;
  }

  async function testBaseCustomerQuery() {
    const { data, error } = await client
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
      .eq('customer_status', 'NEW')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      throw {
        stage: '기본 고객조회',
        error
      };
    }

    return data || [];
  }

  async function testComboQuery() {
    const { data, error } = await client
      .from('trn_apt_customer')
      .select('id, customer_name, mobile_no, customer_status, active_yn')
      .eq('active_yn', 'Y')
      .order('customer_name', { ascending: true })
      .limit(1000);

    if (error) {
      throw {
        stage: '고객 ComboBox 조회',
        error
      };
    }

    return data || [];
  }

  async function runDiagnostics() {
    try {
      if (rows) {
        rows.innerHTML =
          '<tr><td colspan="9" class="empty-cell">진단 중...</td></tr>';
      }

      if (mobileCards) {
        mobileCards.innerHTML =
          '<div class="mobile-empty">진단 중...</div>';
      }

      setStatus('Supabase 조회 진단 중...');

      const session = await requireSession();
      if (!session) return;

      const baseData = await testBaseCustomerQuery();
      const comboData = await testComboQuery();

      const okMessage =
        `진단 성공: 기본조회 ${baseData.length}건 / 고객목록 ${comboData.length}건`;

      setStatus(okMessage, 'success');

      if (rows) {
        rows.innerHTML =
          `<tr><td colspan="9" class="empty-cell">${escapeHtml(okMessage)}</td></tr>`;
      }

      if (mobileCards) {
        mobileCards.innerHTML =
          `<div class="mobile-empty">${escapeHtml(okMessage)}</div>`;
      }

    } catch (wrapped) {
      if (wrapped?.error) {
        showDiagnosticError(wrapped.error, wrapped.stage || '조회');
      } else {
        showDiagnosticError(wrapped, '조회');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', runDiagnostics);
})();