const client = window.factorxSupabase;

const keys = [
  'business_name',
  'country',
  'whatsapp',
  'phone',
  'email',
  'homepage_eyebrow',
  'homepage_heading',
  'homepage_intro',
  'services_eyebrow',
  'services_heading',
  'services_intro',
  'about_eyebrow',
  'about_heading',
  'about_intro',
  'about_story_heading',
  'about_story_p1',
  'about_story_p2',
  'contact_eyebrow',
  'contact_heading',
  'contact_intro',
  'contact_form_heading',
  'contact_form_intro'
];

const defaults = {
  business_name: 'FactorX Studios',
  country: 'South Africa',
  whatsapp: '+27 76 426 7368',
  phone: '+27 76 426 7368',
  email: '',
  homepage_eyebrow: 'WEB DESIGN & DEVELOPMENT, SOLVED.',
  homepage_heading: 'Your business. Your next digital step.',
  homepage_intro: 'Websites that bring your brand to life, with support to keep it moving.',
  services_eyebrow: 'WHAT WE DO',
  services_heading: 'Websites. Systems. Support.',
  services_intro: "Choose a starting point. We'll shape the details around your business.",
  about_eyebrow: 'MEET FACTORX',
  about_heading: 'Design meets development.',
  about_intro: 'An independent South African studio helping businesses build their place online.',
  about_story_heading: 'Web design & development, solved.',
  about_story_p1: 'FactorX Studios brings design and development together to turn business ideas into useful digital experiences. From your first website to a custom business tool, the starting point is understanding what you need.',
  about_story_p2: 'We believe a good website should tell your story clearly, help people find what they need, and make it easy to take the next step.',
  contact_eyebrow: "LET'S TALK",
  contact_heading: 'Your next project starts here.',
  contact_intro: 'Get in touch with FactorX Studios on WhatsApp.',
  contact_form_heading: 'Tell us what you have in mind.',
  contact_form_intro: 'Choose a service and tell us about your idea. Your enquiry will be saved first, then WhatsApp will open so you can continue the conversation.'
};

const form = document.getElementById('settingsForm');
const saveButton = document.getElementById('saveSettingsButton');
const message = document.getElementById('pageMessage');
const adminEmail = document.getElementById('adminEmail');
const logoutButton = document.getElementById('logoutButton');

async function requireAdmin() {
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: adminRow, error } = await client
    .from('admins')
    .select('user_id,email')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !adminRow) {
    await client.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  adminEmail.textContent = adminRow.email || session.user.email;
  return session;
}

async function loadSettings() {
  keys.forEach(key => {
    const input = document.getElementById(key);
    if (input) input.value = defaults[key] ?? '';
  });

  const { data, error } = await client
    .from('site_settings')
    .select('setting_key,setting_value')
    .in('setting_key', keys);

  if (error) throw error;

  (data || []).forEach(row => {
    const input = document.getElementById(row.setting_key);
    if (input) input.value = row.setting_value ?? '';
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  message.textContent = '';

  const rows = keys.map(key => ({
    setting_key: key,
    setting_value: document.getElementById(key)?.value.trim() || ''
  }));

  const { error } = await client
    .from('site_settings')
    .upsert(rows, { onConflict: 'setting_key' });

  saveButton.disabled = false;
  saveButton.textContent = 'Save Settings';

  if (error) {
    message.textContent = error.message;
    message.className = 'message error';
    return;
  }

  message.textContent = 'Settings saved. Refresh the public website to see the changes.';
  message.className = 'message success';
});

logoutButton.addEventListener('click', async () => {
  await client.auth.signOut();
  window.location.href = 'index.html';
});

(async () => {
  const session = await requireAdmin();
  if (!session) return;

  try {
    await loadSettings();
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
  }
})();
