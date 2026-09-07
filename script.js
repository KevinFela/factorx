const toggle = document.getElementById('menu-toggle');
const menu = document.getElementById('nav-menu');
function closeMenu() { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation'); }
toggle.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); toggle.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.nav-inner')) closeMenu(); });
const service = document.getElementById('service');
const details = document.getElementById('project-details');
if (service && details) {
  function updateEnquiry() {
    const message = 'Hi FactorX, I am interested in ' + service.value + '.' + (details.value.trim() ? '\n\n' + details.value.trim() : '') + '\n\nPlease send me more information and a quote.';
    document.getElementById('whatsapp-enquiry').href = 'https://wa.me/27764267368?text=' + encodeURIComponent(message);
    document.getElementById('selection').textContent = service.value + ' will be included in your WhatsApp message.';
  }
  service.addEventListener('change', updateEnquiry);
  details.addEventListener('input', updateEnquiry);
  updateEnquiry();
}
document.getElementById('year').textContent = new Date().getFullYear();
