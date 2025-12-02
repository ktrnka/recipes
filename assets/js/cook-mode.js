// assets/js/cook-mode.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('cook-toggle');
  if (!btn) return;

  let wakeLock = null;

  async function requestWakeLock() {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        btn.classList.remove('cook-on');
        btn.classList.add('cook-off');
        btn.textContent = 'Cook mode: OFF';
      });
    } catch (err) {
      console.error('Wake Lock error:', err.name, err.message);
    }
  }

  async function releaseWakeLock() {
    if (!wakeLock) return;
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (err) {
      console.error('Release error:', err.name, err.message);
    }
  }

  btn.addEventListener('click', async () => {
    if (!('wakeLock' in navigator)) {
      alert('Screen Wake Lock is not supported in this browser.');
      return;
    }

    if (!wakeLock) {
      await requestWakeLock();
      if (wakeLock) {
        btn.classList.remove('cook-off');
        btn.classList.add('cook-on');
        btn.textContent = 'Cook mode: ON';
      }
    } else {
      await releaseWakeLock();
      btn.classList.remove('cook-on');
      btn.classList.add('cook-off');
      btn.textContent = 'Cook mode: OFF';
    }
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock) {
      await requestWakeLock();
    }
  });
});
