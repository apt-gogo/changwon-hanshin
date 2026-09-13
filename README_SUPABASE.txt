APT-GOGO 관심고객 등록 + 관리자 조회 / V8
============================================================

[이번 V8에서 완성한 범위]
1단계 고객 등록
- reservation.html 입력 -> Supabase trn_apt_customer 자동 INSERT
- 고객은 기존 데이터 SELECT/UPDATE/DELETE 불가

2단계 관리자 조회
- /admin/ 접속 -> Supabase Auth 이메일/비밀번호 로그인
- 로그인 성공 -> 관심고객 목록 조회
- 현장/등록기간/고객명/전화번호 검색
- 휴대폰에서는 전화번호 터치 시 바로 전화 가능

------------------------------------------------------------
1. Supabase SQL 실행
------------------------------------------------------------
Supabase Dashboard > SQL Editor에서 아래 파일 전체를 실행합니다.

supabase/01_apt_gogo_schema.sql

생성되는 Table
- md_apt_site
- trn_apt_customer

------------------------------------------------------------
2. Supabase 연결정보 입력
------------------------------------------------------------
파일:
js/supabase-config.js

아래 2개만 실제 프로젝트 값으로 변경합니다.

const APT_GOGO_SUPABASE_URL = '...';
const APT_GOGO_SUPABASE_PUBLISHABLE_KEY = '...';

주의
- Publishable Key 사용
- service_role / secret key 절대 사용 금지

------------------------------------------------------------
3. 관리자 계정 준비
------------------------------------------------------------
Supabase Dashboard > Authentication > Users에서
관리자로 사용할 이메일 사용자를 생성합니다.

현재 1차 RLS 기준:
- anon          : 관심고객 INSERT만
- authenticated : 관심고객 SELECT만

따라서 일반 사용자가 관리자 계정을 자유롭게 가입하지 못하도록
Auth의 공개 Sign Up은 사용하지 않는 것을 권장합니다.
관리자 계정은 Dashboard에서 직접 생성하는 방식으로 운영합니다.

------------------------------------------------------------
4. GitHub 업로드
------------------------------------------------------------
기존 changwon-hanshin Repository에 V8 전체 파일을 덮어쓰기/추가합니다.

새로 추가되는 주요 파일
- js/supabase-config.js
- admin/index.html
- admin/customers.html
- admin/css/admin.css
- admin/js/login.js
- admin/js/customers.js
- supabase/01_apt_gogo_schema.sql

고객용
https://apt-gogo.github.io/changwon-hanshin/reservation.html

관리자용
https://apt-gogo.github.io/changwon-hanshin/admin/

------------------------------------------------------------
5. 실사용 Test 순서
------------------------------------------------------------
① reservation.html에서 테스트 고객 1건 등록
② Supabase Table Editor > trn_apt_customer에서 INSERT 확인
③ /admin/에서 관리자 로그인
④ 등록된 고객 조회 확인
⑤ 휴대폰에서 전화번호 터치 -> 전화 연결 확인

------------------------------------------------------------
6. 현재 의도적으로 제외한 기능
------------------------------------------------------------
- 고객 수정/삭제
- 상담결과 등록
- 다음 연락일
- 방문완료
- 계약관리
- trn_apt_customer_contact

위 기능은 3단계 상담관리에서 확장합니다.
