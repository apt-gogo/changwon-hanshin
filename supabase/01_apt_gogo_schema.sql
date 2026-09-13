-- =====================================================================
-- APT-GOGO 관심고객 관리 / 1차 DB 구축
-- 대상: Supabase SQL Editor에서 전체 실행
--
-- 현재 사용 범위
--   1) md_apt_site       : 분양현장 Master
--   2) trn_apt_customer  : 홈페이지 관심고객 등록정보
--
-- 현재 권한
--   anon          : 활성 현장 SELECT + 관심고객 INSERT만 가능
--   authenticated : 현장 SELECT + 관심고객 SELECT만 가능
--   UPDATE/DELETE : 1차에서는 허용하지 않음
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. 공통 updated_at 자동갱신 함수
-- ---------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. 분양현장 Master
-- ---------------------------------------------------------------------
create table if not exists public.md_apt_site (
  id              bigint generated always as identity primary key,
  site_code       varchar(50)  not null unique,
  site_name       varchar(150) not null,
  address         varchar(300),
  homepage_url    varchar(300),
  contact_phone   varchar(30),
  active_yn       char(1)      not null default 'Y' check (active_yn in ('Y','N')),
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

-- ---------------------------------------------------------------------
-- 3. 관심고객
--    고객이 홈페이지에서 입력하는 필드는 최소화하고,
--    향후 상담관리 확장을 위한 상태/연락/계약 필드는 미리 준비합니다.
-- ---------------------------------------------------------------------
create table if not exists public.trn_apt_customer (
  id                  bigint generated always as identity primary key,
  apt_site_id         bigint      not null references public.md_apt_site(id),

  customer_name       varchar(50) not null,
  mobile_no           varchar(20) not null,
  visit_date          date,
  visit_time          time,

  privacy_agree_yn    char(1)     not null default 'N' check (privacy_agree_yn in ('Y','N')),
  marketing_agree_yn  char(1)     not null default 'N' check (marketing_agree_yn in ('Y','N')),

  source_channel      varchar(30) not null default 'HOMEPAGE',
  source_detail       varchar(100),

  -- 향후 상담관리 확장용. 현재 홈페이지에서는 사용자가 입력하지 않습니다.
  customer_status     varchar(20) not null default 'NEW',
  assigned_to         uuid references auth.users(id),
  first_contact_at    timestamptz,
  last_contact_at     timestamptz,
  contract_yn         char(1) not null default 'N' check (contract_yn in ('Y','N')),
  remark              varchar(1000),

  active_yn           char(1) not null default 'Y' check (active_yn in ('Y','N')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint ck_trn_apt_customer_mobile
    check (mobile_no ~ '^01[0-9][0-9]{7,8}$'),

  constraint ck_trn_apt_customer_visit_time
    check (
      visit_time is null
      or (
        visit_time >= time '10:00'
        and visit_time <= time '19:00'
        and extract(minute from visit_time) in (0, 30)
      )
    )
);

-- 조회 성능용 Index
create index if not exists idx_apt_customer_site_created
  on public.trn_apt_customer (apt_site_id, created_at desc);

create index if not exists idx_apt_customer_mobile
  on public.trn_apt_customer (mobile_no);

create index if not exists idx_apt_customer_status
  on public.trn_apt_customer (customer_status);

-- updated_at Trigger
DROP TRIGGER IF EXISTS trg_md_apt_site_updated_at ON public.md_apt_site;
create trigger trg_md_apt_site_updated_at
before update on public.md_apt_site
for each row execute function public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_trn_apt_customer_updated_at ON public.trn_apt_customer;
create trigger trg_trn_apt_customer_updated_at
before update on public.trn_apt_customer
for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- 4. 현재 분양현장 등록
-- ---------------------------------------------------------------------
insert into public.md_apt_site
  (site_code, site_name, address, homepage_url, contact_phone, active_yn)
values
  (
    'changwon-hanshin',
    '창원 한신더휴 메가센텀',
    '경상남도 창원시 마산회원구 회원2동 480-31번지 일대',
    'https://apt-gogo.github.io/changwon-hanshin/',
    '1555-4940',
    'Y'
  )
on conflict (site_code)
do update set
  site_name     = excluded.site_name,
  address       = excluded.address,
  homepage_url  = excluded.homepage_url,
  contact_phone = excluded.contact_phone,
  active_yn     = excluded.active_yn;

-- ---------------------------------------------------------------------
-- 5. RLS ON
--    프로젝트 생성 시 Automatic RLS를 켰더라도 명시적으로 한 번 더 선언합니다.
-- ---------------------------------------------------------------------
alter table public.md_apt_site enable row level security;
alter table public.trn_apt_customer enable row level security;

-- 기존 정책이 있을 경우 재실행 가능하도록 정리
DROP POLICY IF EXISTS apt_site_anon_select_active ON public.md_apt_site;
DROP POLICY IF EXISTS apt_site_admin_select ON public.md_apt_site;
DROP POLICY IF EXISTS apt_customer_anon_insert ON public.trn_apt_customer;
DROP POLICY IF EXISTS apt_customer_admin_select ON public.trn_apt_customer;

-- ---------------------------------------------------------------------
-- 6. Data API 권한(Grant)
--    "Automatically expose new tables"를 OFF 했으므로 필요한 권한만 명시합니다.
-- ---------------------------------------------------------------------
revoke all on table public.md_apt_site from anon, authenticated;
revoke all on table public.trn_apt_customer from anon, authenticated;

-- 고객 홈페이지: 활성 현장 ID를 찾기 위한 SELECT
-- 관리자: 현장 목록 조회
grant select on table public.md_apt_site to anon, authenticated;

-- 고객 홈페이지: 관심고객 등록에 필요한 컬럼만 INSERT 허용
grant insert (
  apt_site_id,
  customer_name,
  mobile_no,
  visit_date,
  visit_time,
  privacy_agree_yn,
  marketing_agree_yn,
  source_channel,
  source_detail
) on table public.trn_apt_customer to anon;

-- 관리자: 현재 1차에서는 조회만 허용
grant select on table public.trn_apt_customer to authenticated;

-- Identity sequence 권한
-- anon INSERT 시 trn_apt_customer.id 자동생성에 필요합니다.
grant usage, select on sequence public.trn_apt_customer_id_seq to anon;

-- ---------------------------------------------------------------------
-- 7. RLS Policy
-- ---------------------------------------------------------------------

-- 비로그인 고객은 활성 분양현장만 조회 가능
create policy apt_site_anon_select_active
on public.md_apt_site
for select
to anon
using (active_yn = 'Y');

-- 로그인 관리자는 모든 분양현장 조회 가능
create policy apt_site_admin_select
on public.md_apt_site
for select
to authenticated
using (true);

-- 비로그인 고객은 개인정보동의 + 활성현장 + 홈페이지 유입일 때만 등록 가능
create policy apt_customer_anon_insert
on public.trn_apt_customer
for insert
to anon
with check (
  privacy_agree_yn = 'Y'
  and marketing_agree_yn in ('Y','N')
  and source_channel = 'HOMEPAGE'
  and customer_status = 'NEW'
  and contract_yn = 'N'
  and active_yn = 'Y'
  and exists (
    select 1
    from public.md_apt_site s
    where s.id = apt_site_id
      and s.active_yn = 'Y'
  )
);

-- 로그인 관리자만 관심고객 조회 가능
create policy apt_customer_admin_select
on public.trn_apt_customer
for select
to authenticated
using (true);

commit;

-- =====================================================================
-- 확인용 SQL
-- =====================================================================
-- select * from public.md_apt_site order by id;
-- select * from public.trn_apt_customer order by created_at desc;
