/* ============================================================
   APT-GOGO 현장 공통 설정
   ------------------------------------------------------------
   현장별 또는 운영 중 변경될 가능성이 있는 값은 이 파일에서 관리합니다.
   전화번호, 현장명, 사이트코드, URL, 예약시간, 고객상태 등을
   HTML/업무 JS에 직접 반복 기입하지 않습니다.
   ============================================================ */

const SITE_CONFIG = Object.freeze({
  site: {
    code: 'changwon-hanshin',
    name: '창원 한신더휴 메가센텀',
    address: '경상남도 창원시 마산회원구 회원2동 480-31번지 일대',
    homepageUrl: 'https://apt-gogo.github.io/changwon-hanshin/',
    reservationUrl: 'https://apt-gogo.github.io/changwon-hanshin/reservation.html',
    adminUrl: 'https://apt-gogo.github.io/changwon-hanshin/admin/'
  },

  contact: {
    phoneDisplay: '055-602-0287',
    phoneTel: '0556020287',
    consultationLabel: '모델하우스 방문예약 상담'
  },

  project: {
    totalHouseholds: '2,016',
    buildingCount: '21',
    areaRange: '38~136㎡',
    parkingCount: '3,223',
    parkingPerHousehold: '약 1.6대',
    generalSaleHouseholds: '1,139'
  },

  reservation: {
    startTime: '10:00',
    endTime: '19:00',
    intervalMinutes: 30,
    successRedirectDelayMs: 2000
  },

  customer: {
    statusNew: 'NEW',
    statusConfirmed: 'CONFIRMED',
    sourceChannel: 'HOMEPAGE',
    defaultListLimit: 500
  },

  ui: {
    locale: 'ko-KR',
    timeZone: 'Asia/Seoul'
  }
});
