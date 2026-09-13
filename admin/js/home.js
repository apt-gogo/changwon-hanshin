/* ============================================================
   관리자 시작화면
   ------------------------------------------------------------
   - 로그인 세션 확인
   - 홈페이지 / 등록고객 조회로 이동하는 허브 역할
   ============================================================ */
(() => {
  const status = document.getElementById('homeStatus');
  const loginUser = document.getElementById('loginUser');
  const logoutButton = document.getElementById('logoutButton');

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = `admin-status ${type}`.trim();
  }

  if (!isSupabaseConfigReady()) {
    setStatus('Supabase 연결정보를 확인해 주세요.', 'error');
    return;
  }

  const client = createAptGogoSupabaseClient();

  async function requireSession() {
    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
      location.replace('index.html');
      return null;
    }

    loginUser.textContent = data.session.user.email || '';
    return data.session;
  }

  logoutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    location.replace('index.html');
  });

  requireSession().catch(error => {
    console.error(error);
    setStatus(`오류: ${error?.message || String(error)}`, 'error');
  });
})();
