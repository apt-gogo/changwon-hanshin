/* ============================================================
   APT-GOGO / Supabase 연결 설정
   ------------------------------------------------------------
   ★ 이 파일에서 아래 2개 값만 실제 APT_GOGO 프로젝트 값으로 바꾸면 됩니다.
   ★ Supabase Dashboard > Project Settings / API Keys에서 확인합니다.
   ★ 브라우저에는 Publishable Key만 사용합니다.
   ★ service_role / secret key는 절대로 이 파일에 넣지 마세요.
   ============================================================ */

const APT_GOGO_SUPABASE_URL = 'https://ipdzzbjvvwwxltcweouo.supabase.co';
const APT_GOGO_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tzyNFnTUqgVayjT2o2s95Q_wKrW8vJp';

/* 현재 홈페이지가 어느 분양현장인지 구분하는 코드입니다.
   md_apt_site.site_code와 반드시 동일해야 합니다. */
const APT_GOGO_SITE_CODE = 'changwon-hanshin';

function isSupabaseConfigReady() {
  return !APT_GOGO_SUPABASE_URL.startsWith('YOUR_') &&
         !APT_GOGO_SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');
}

function createAptGogoSupabaseClient() {
  if (!isSupabaseConfigReady()) {
    throw new Error('Supabase 연결정보가 아직 설정되지 않았습니다. js/supabase-config.js를 확인하세요.');
  }

  return window.supabase.createClient(
    APT_GOGO_SUPABASE_URL,
    APT_GOGO_SUPABASE_PUBLISHABLE_KEY
  );
}
