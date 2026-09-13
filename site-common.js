/* ============================================================
   APT-GOGO 공통 화면 바인딩
   ------------------------------------------------------------
   SITE_CONFIG 값을 화면에 연결하는 공통 로직입니다.
   현장값 변경 시 이 파일은 수정하지 않고 site-config.js만 수정합니다.
   ============================================================ */

(() => {
  if (typeof SITE_CONFIG === 'undefined') return;

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

  const applySiteConfig = () => {
    setText('[data-site-name]', SITE_CONFIG.site.name);
    setText('[data-site-address]', SITE_CONFIG.site.address);
    setText('[data-contact-phone]', SITE_CONFIG.contact.phoneDisplay);
    setText('[data-consultation-label]', SITE_CONFIG.contact.consultationLabel);

    setHref('[data-contact-tel]', `tel:${SITE_CONFIG.contact.phoneTel}`);
    setHref('[data-homepage-link]', SITE_CONFIG.site.homepageUrl);
    setHref('[data-reservation-link]', SITE_CONFIG.site.reservationUrl);

    setText('[data-total-households]', SITE_CONFIG.project.totalHouseholds);
    setText('[data-building-count]', SITE_CONFIG.project.buildingCount);
    setText('[data-area-range]', SITE_CONFIG.project.areaRange);
    setText('[data-parking-per-household]', SITE_CONFIG.project.parkingPerHousehold);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySiteConfig);
  } else {
    applySiteConfig();
  }
})();
