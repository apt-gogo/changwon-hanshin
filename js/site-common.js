/* ============================================================
   APT-GOGO 공통 화면 바인딩
   ------------------------------------------------------------
   SITE_CONFIG 값을 화면에 연결하는 공통 로직입니다.

   [담당자(agent) 처리]
   - URL 예: ?agent=A001
   - agent 값에 따라 담당자 전화번호를 자동 적용합니다.
   - agent가 없거나 잘못된 경우 defaultCode 담당자를 사용합니다.

   [유지보수 원칙]
   - 현장정보 / 담당자정보 변경은 site-config.js에서 처리합니다.
   - 이 파일은 특별한 로직 변경이 없으면 수정하지 않습니다.
   ============================================================ */

(() => {

    if (typeof SITE_CONFIG === 'undefined') return;


    /* --------------------------------------------------------
       1. 공통 함수
       -------------------------------------------------------- */

    const setText = (selector, value) => {
        document.querySelectorAll(selector).forEach(el => {
            el.textContent = value;
        });
    };


    const setHref = (selector, value) => {
        document.querySelectorAll(selector).forEach(el => {
            el.setAttribute('href', value);
        });
    };


    /* --------------------------------------------------------
       2. 현재 담당자(agent) 조회
       --------------------------------------------------------
       예)
       ?agent=A001
       ?agent=A002

       agent가 없거나 등록되지 않은 코드이면
       SITE_CONFIG.agent.defaultCode를 사용합니다.
       -------------------------------------------------------- */

    const getCurrentAgent = () => {

        const params = new URLSearchParams(window.location.search);

        const requestedCode = params.get('agent');

        const defaultCode = SITE_CONFIG.agent.defaultCode;

        const agentCode =
            requestedCode &&
            SITE_CONFIG.agent.list[requestedCode]
                ? requestedCode
                : defaultCode;

        return {
            code: agentCode,
            info: SITE_CONFIG.agent.list[agentCode]
        };
    };


    /* --------------------------------------------------------
       3. 현재 agent 값을 다음 페이지 URL에도 유지
       --------------------------------------------------------
       홈페이지
       ?agent=A002

       ↓ 관심고객등록

       reservation.html?agent=A002
       -------------------------------------------------------- */

    const addAgentToUrl = (url, agentCode) => {

        const targetUrl = new URL(url, window.location.href);

        targetUrl.searchParams.set('agent', agentCode);

        return targetUrl.href;
    };


    /* --------------------------------------------------------
       4. 화면 바인딩
       -------------------------------------------------------- */

    const applySiteConfig = () => {

        const currentAgent = getCurrentAgent();

        const agentCode = currentAgent.code;
        const agent = currentAgent.info;


        /* ----------------------------------------------------
           현장 기본정보
           ---------------------------------------------------- */

        setText(
            '[data-site-name]',
            SITE_CONFIG.site.name
        );

        setText(
            '[data-site-address]',
            SITE_CONFIG.site.address
        );


        /* ----------------------------------------------------
           담당자 전화정보

           기존 SITE_CONFIG.contact.phoneDisplay / phoneTel 대신
           선택된 agent의 전화번호를 사용합니다.
           ---------------------------------------------------- */

        setText(
            '[data-contact-phone]',
            agent.phoneDisplay
        );

        setText(
            '[data-consultation-label]',
            SITE_CONFIG.contact.consultationLabel
        );

        setHref(
            '[data-contact-tel]',
            `tel:${agent.phoneTel}`
        );


        /* ----------------------------------------------------
           홈페이지 링크
           ---------------------------------------------------- */

        setHref(
            '[data-homepage-link]',
            addAgentToUrl(
                SITE_CONFIG.site.homepageUrl,
                agentCode
            )
        );


        /* ----------------------------------------------------
           관심고객등록 링크

           현재 담당자 agent를 그대로 전달합니다.
           ---------------------------------------------------- */

        setHref(
            '[data-reservation-link]',
            addAgentToUrl(
                SITE_CONFIG.site.reservationUrl,
                agentCode
            )
        );


        /* ----------------------------------------------------
           프로젝트 기본정보
           ---------------------------------------------------- */

        setText(
            '[data-total-households]',
            SITE_CONFIG.project.totalHouseholds
        );

        setText(
            '[data-building-count]',
            SITE_CONFIG.project.buildingCount
        );

        setText(
            '[data-area-range]',
            SITE_CONFIG.project.areaRange
        );

        setText(
            '[data-parking-per-household]',
            SITE_CONFIG.project.parkingPerHousehold
        );
    };


    /* --------------------------------------------------------
       5. 페이지 로딩 후 실행
       -------------------------------------------------------- */

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            applySiteConfig
        );

    } else {

        applySiteConfig();

    }

})();
