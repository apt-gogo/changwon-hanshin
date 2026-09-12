(() => {
  const form = document.getElementById('interestForm');
  const mobile = document.getElementById('mobileNo');
  const time = document.getElementById('visitTime');

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

  if (mobile) {
    mobile.addEventListener('input', () => {
      mobile.value = mobile.value.replace(/\D/g, '').slice(0, 11);
    });
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      alert('관심고객 등록 화면이 완성되었습니다. 데이터 저장 기능은 추후 연결 예정입니다.\n전화상담 1555-4940을 이용해 주세요.');
    });
  }
})();
