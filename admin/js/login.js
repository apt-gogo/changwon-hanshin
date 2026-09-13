/* ============================================================
   관리자 로그인
   ------------------------------------------------------------
   - Supabase Auth 이메일/비밀번호 로그인
   - 로그인 성공 후 관리자 시작화면(home.html)으로 이동
   ============================================================ */
(() => {
  const form = document.getElementById('adminLoginForm');
  const button = document.getElementById('loginButton');
  const status = document.getElementById('loginStatus');

  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = `admin-status ${type}`.trim();
  }

  if (!isSupabaseConfigReady()) {
    setStatus('Supabase 연결정보를 먼저 설정해 주세요.', 'error');
    button.disabled = true;
    return;
  }

  const client = createAptGogoSupabaseClient();

  /* 이미 로그인된 상태라면 로그인 화면을 거치지 않고 시작화면으로 이동 */
  client.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'home.html';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    setStatus('');
    button.disabled = true;
    button.textContent = '로그인 중...';

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      console.error(error);
      setStatus('이메일 또는 비밀번호를 확인해 주세요.', 'error');
      button.disabled = false;
      button.textContent = '로그인';
      return;
    }

    location.href = 'home.html';
  });
})();
