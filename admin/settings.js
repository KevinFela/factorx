const client = window.factorxSupabase;
const fields = window.factorxContentFields;
const form = document.querySelector('#settingsForm');
const fieldset = document.querySelector('#settingsFields');
const groups = document.querySelector('#settingsGroups');
const saveButton = document.querySelector('#saveSettingsButton');
const message = document.querySelector('#pageMessage');
const changeCount = document.querySelector('#changeCount');
const initial = new Map();
const loaded = new Map();
let ready = false;
let saving = false;
const validLink = value => {
  if (!value) return true;
  if (/[\u0000-\u0020\\]/.test(value) || value.startsWith('//')) return false;
  try { return ['https:','http:','mailto:','tel:'].includes(new URL(value, location.origin + '/').protocol); } catch { return false; }
};
const inputValue = field => {
  const input = document.getElementById(field.key);
  return field.type === 'boolean' ? String(input.checked) : input.value.trim();
};
function setValue(field,value) {
  const input = document.getElementById(field.key);
  if (field.type === 'boolean') input.checked = value !== 'false'; else input.value = value;
}
function changedFields() { return fields.filter(field => inputValue(field) !== initial.get(field.key)); }
function updateChanges() {
  const count = ready ? changedFields().length : 0;
  changeCount.textContent = count ? `${count} unsaved ${count === 1 ? 'change' : 'changes'}` : 'No unsaved changes';
  saveButton.disabled = !ready || saving || !count;
}
function renderFields() {
  const sections = new Map();
  for (const field of fields) {
    if (!sections.has(field.group)) {
      const details = document.createElement('details'); details.className = 'panel content-group'; details.open = field.group === 'Business & branding';
      const summary = document.createElement('summary'); summary.textContent = field.group; details.append(summary); groups.append(details); sections.set(field.group,details);
    }
    const row = document.createElement('div'); row.className = 'content-field'; row.dataset.search = `${field.group} ${field.label} ${field.default}`.toLowerCase();
    const label = document.createElement('label'); label.htmlFor = field.key; label.textContent = field.label;
    const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input'); input.id = field.key; input.name = field.key;
    if (field.type === 'textarea') {input.rows = 3;input.maxLength = 5000;} else {input.type = field.type === 'boolean' ? 'checkbox' : ['email','color','number'].includes(field.type) ? field.type : 'text';input.maxLength = 2000;}
    if (field.type === 'number') {input.min = 1;input.max = 12;input.step = 1;}
    row.append(label,input);
    if (field.type === 'link') {const hint=document.createElement('small');hint.textContent='Use a page such as contact.html, or a complete https:// address.';row.append(hint);}
    if (field.type === 'image') {
      const upload = document.createElement('input'); upload.type='file'; upload.accept='image/png,image/jpeg,image/webp,image/gif';upload.setAttribute('aria-label',`Upload ${field.label.toLowerCase()}`);
      upload.addEventListener('change',()=>uploadImage(field,upload));row.append(upload);
    }
    sections.get(field.group).append(row);
  }
}
async function uploadImage(field,upload) {
  const file=upload.files[0];if (!file || !ready) return;
  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  if (!types[file.type] || file.size > 10485760) {message.textContent='Choose a PNG, JPG, WebP or GIF smaller than 10 MB.';upload.value='';return;}
  saving=true;fieldset.disabled=true;updateChanges();message.textContent='Uploading image…';
  try {
    const path=`branding/${crypto.randomUUID()}.${types[file.type]}`;
    const {error}=await client.storage.from('factorx-media').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;
    document.getElementById(field.key).value=client.storage.from('factorx-media').getPublicUrl(path).data.publicUrl;
    message.textContent='Image uploaded. Save changes to use it on the website.';
  } catch(error) {message.textContent=`Upload failed: ${error.message}`;}
  finally {saving=false;fieldset.disabled=false;upload.value='';updateChanges();}
}
async function connect() {
  ready=false;fieldset.disabled=true;saveButton.disabled=true;message.textContent='Connecting to your CMS…';
  try {
    if (!client) throw new Error('The CMS connection could not be loaded.');
    const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
    if(!session){location.href='index.html';return;}
    const {data:admin,error:adminError}=await client.from('admins').select('user_id,email').eq('user_id',session.user.id).maybeSingle();
    if(adminError)throw adminError;
    if(!admin){await client.auth.signOut();location.href='index.html';return;}
    document.querySelector('#adminEmail').textContent=admin.email || session.user.email;
    const {data,error}=await client.from('site_settings').select('setting_key,setting_value').in('setting_key',fields.map(field=>field.key));if(error)throw error;
    loaded.clear();initial.clear();for(const row of data || [])loaded.set(row.setting_key,row.setting_value);
    for(const field of fields){const value=loaded.has(field.key)?loaded.get(field.key):field.default;setValue(field,value);initial.set(field.key,inputValue(field));}
    ready=true;fieldset.disabled=false;message.textContent='Connected. Choose a section to edit its content.';updateChanges();
  } catch(error){message.textContent=`Could not load settings. Nothing has been changed. ${error.message}`;message.className='message error';}
}
form.addEventListener('input',event=>{if(event.target.id!=='settingsSearch')updateChanges();});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready || saving)return;
  const dirty=changedFields();if(!dirty.length)return;
  for(const field of dirty){const value=inputValue(field);if((field.type==='link'||field.type==='image')&&!validLink(value)){message.textContent=`Check the address for ${field.label}.`;document.getElementById(field.key).focus();return;}if(field.type==='image'&&value&&!/^(https?:\/\/|\/?assets\/)/i.test(value)){message.textContent='Use an https image address or upload an image.';return;}}
  saving=true;fieldset.disabled=true;updateChanges();message.textContent='Saving changes…';
  try {
    const keys=dirty.map(field=>field.key);
    const {data:current,error:readError}=await client.from('site_settings').select('setting_key,setting_value').in('setting_key',keys);if(readError)throw readError;
    const currentMap=new Map((current||[]).map(row=>[row.setting_key,row.setting_value]));
    if(keys.some(key=>currentMap.get(key)!==loaded.get(key)))throw new Error('These settings changed in another session. Copy your edits, then reload before saving.');
    const rows=dirty.map(field=>({setting_key:field.key,setting_value:inputValue(field)}));
    const {error}=await client.from('site_settings').upsert(rows,{onConflict:'setting_key'});if(error)throw error;
    for(const row of rows){loaded.set(row.setting_key,row.setting_value);initial.set(row.setting_key,row.setting_value);}
    message.textContent='Changes saved. Refresh the website to see them.';message.className='message success';
  } catch(error){message.textContent=`Could not save changes. ${error.message}`;message.className='message error';}
  finally {saving=false;fieldset.disabled=false;updateChanges();}
});
document.querySelector('#settingsSearch').addEventListener('input',event=>{
  const query=event.target.value.trim().toLowerCase();
  groups.querySelectorAll('.content-group').forEach(group=>{let visible=0;group.querySelectorAll('.content-field').forEach(row=>{row.hidden=!row.dataset.search.includes(query);if(!row.hidden)visible++;});group.hidden=!visible;if(query&&visible)group.open=true;});
});
document.querySelector('#retrySettingsButton').addEventListener('click',()=>{if(ready&&changedFields().length){message.textContent='Save or copy your unsaved changes before reconnecting.';return;}connect();});
document.querySelector('#logoutButton').addEventListener('click',async()=>{if(ready&&changedFields().length&&!confirm('Discard unsaved changes and sign out?'))return;await client.auth.signOut();location.href='index.html';});
window.addEventListener('beforeunload',event=>{if(ready&&changedFields().length){event.preventDefault();event.returnValue='';}});
renderFields();
connect();
