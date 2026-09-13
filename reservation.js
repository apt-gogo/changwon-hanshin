/* ============================================================
   관심고객 등록
   ------------------------------------------------------------
   처리 순서
   1) 입력값 검증
   2) md_apt_site에서 현재 현장 ID 확인
   3) trn_apt_customer에 관심고객 정보 INSERT
   4) 성공 메시지 표시 후 입력창 초기화

   보안
   - 홈페이지 방문자는 로그인하지 않은 anon 역할입니다.
   - anon은 trn_apt_customer에 INSERT만 허용합니다.
   - SELECT / UPDATE / DELETE는 허용하지 않습니다.
   ============================================================ */
(() => {
  const form = document.getElementById('interestForm');
  const mobile = document.getElementById('mobileNo');
  const time = document.getElementById('visitTime');
  const visitDate = document.getElementById('visitDate');
  const submitButton = form?.querySelector('.res-submit');
  const statusMessage = document.getElementById('registrationStatus');

  let aptSiteId = null;

  function setStatus(message, type = '') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `res-status ${type}`.trim();
  }

  function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? '등록 중...' : '등록하기';
  }

  function normalizeMobile(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 11);
  }

  function isValidKoreanMobile(value) {
    return /^01\d{8,9}$/.test(value);
  }

  async function getCurrentSiteId(client) {
    if (aptSiteId) return aptSiteId;

    const { data, error } = await client
      .from('md_apt_site')
      .select('id')
      .eq('site_code', APT_GOGO_SITE_CODE)
      .eq('active_yn', 'Y')
      .single();

    if (error) throw error;
    aptSiteId = data.id;
    return aptSiteId;
  }

  /* 방문시간 10:00 ~ 19:00 / 30분 단위 생성 */
  if (time) {
    for (let h = 10; h <= 19; h += 1) {
      for (const m of [0, 30]) {
        if (h === 19 && m === 30) continue;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const option = document.createElement('option');
        option.value = `${hh}:${mm}`;
        option.textContent = `${hh}:${mm}`;
        time.appendChild(option);
      }
    }
  }

  /* 과거 날짜 예약 방지 */
  if (visitDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    visitDate.min = `${yyyy}-${mm}-${dd}`;
  }

  /* 휴대폰번호 숫자만 입력 */
  if (mobile) {
    mobile.addEventListener('input', () => {
      mobile.value = normalizeMobile(mobile.value);
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    if (!form.reportValidity()) return;

    const customerName = document.getElementById('customerName').value.trim();
    const mobileNo = normalizeMobile(mobile.value);
    const selectedVisitDate = visitDate.value || null;
    const selectedVisitTime = time.value || null;
    const privacyAgree = document.getElementById('privacyAgree').checked;
    const marketingAgree = document.getElementById('marketingAgree').checked;

    if (!isValidKoreanMobile(mobileNo)) {
      setStatus('휴대폰번호를 정확히 입력해 주세요.', 'error');
      mobile.focus();
      return;
    }

    if (!privacyAgree) {
      setStatus('개인정보 수집 및 이용 동의가 필요합니다.', 'error');
      return;
    }

    if (!isSupabaseConfigReady()) {
      setStatus('현재 온라인 등록 연결 준비 중입니다. 전화상담 1555-4940을 이용해 주세요.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const client = createAptGogoSupabaseClient();
      const siteId = await getCurrentSiteId(client);

      const payload = {
        apt_site_id: siteId,
        customer_name: customerName,
        mobile_no: mobileNo,
        visit_date: selectedVisitDate,
        visit_time: selectedVisitTime,
        privacy_agree_yn: 'Y',
        marketing_agree_yn: marketingAgree ? 'Y' : 'N',
        source_channel: 'HOMEPAGE',
        source_detail: APT_GOGO_SITE_CODE
      };

      const { error } = await client
        .from('trn_apt_customer')
        .insert(payload);

      if (error) throw error;

     /* ------------------------------------------------------------
       등록 완료 처리
       - 등록화면을 다시 초기화해서 남겨두지 않습니다.
       - 완료 메시지를 잠시 보여준 뒤 메인 홈페이지로 돌아갑니다.
       ------------------------------------------------------------ */
    setStatus(
      '관심고객 등록이 완료되었습니다. 담당자가 확인 후 연락드리겠습니다.',
      'success'
    );

    /* 1.5초 후 메인 홈페이지로 자동 복귀 */
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);		

    } catch (error) {
      console.error('관심고객 등록 오류:', error);
      setStatus('등록 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 전화상담을 이용해 주세요.', 'error');
    } finally {
      setSubmitting(false);
    }
  });
})();
