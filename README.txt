APT-GOGO / 창원 한신더휴 메가센텀
유지보수 안내 (V7)

1. 기본 원칙
- index.html : 문구/구조 변경 시 수정
- css/style.css : 기본 디자인 코드. 가급적 수정하지 않음
- css/custom.css : 크기/간격/위치/색상 등 미세조정 전용
- images/ : 사진 교체 시 동일 파일명으로 덮어쓰기

2. 가장 자주 수정할 파일
[css/custom.css]
파일 맨 위의 "A. 직접 수정 영역"만 수정하면 됩니다.
각 변수 바로 옆에 무엇이 바뀌는지 주석으로 설명되어 있습니다.

예)
--mobile-hero-top-gap: 28px;
=> 숫자를 크게 하면 HERO 제목/내용이 아래로 내려갑니다.

--mobile-hero-stats-bottom: 82px;
=> 숫자를 크게 하면 4개 통계가 위로 올라갑니다.

--mobile-community-card-height: 170px;
=> COMMUNITY 사진 높이를 조정합니다.

3. 문구 변경
[index.html]에서 현재 문구를 검색하여 직접 수정합니다.
모바일 HERO 핵심문구는 hero-copy-mobile 클래스로 별도 관리됩니다.

4. 사진 변경
같은 파일명으로 images 폴더에서 기존 파일을 교체하면 HTML 수정이 필요 없습니다.
예: hero.png / sky.jpg / pool.jpg / badminton.jpg / kids.jpg / location.jpg

5. GitHub에서 직접 수정
파일 선택 -> 연필(Edit this file) -> 수정 -> Commit changes
잠시 후 GitHub Pages 홈페이지에 자동 반영됩니다.

6. 고객정보 저장
현재 관심고객등록 화면은 UI까지만 구성되어 있습니다.
실제 고객정보 저장/조회 방식은 별도 CM 후 구현합니다.
