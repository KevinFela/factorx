const db=window.factorxSupabase;
const fields=['title','slug','parent_id','intro','body','image_path','image_alt','button_label','button_url','seo_description','published','show_in_nav','sort_order'];
const el=id=>document.getElementById(id);
let records=[],current=null,baseline='',busy=false,manualSlug=false;
const values=()=>Object.fromEntries(fields.map(key=>[key,key==='published'||key==='show_in_nav'?el('f_'+key).checked:key==='sort_order'?Number(el('f_'+key).value)||0:key==='parent_id'?el('f_'+key).value||null:el('f_'+key).value.trim()]));
const pageValues=values;
const payloadValues=()=>{const result=pageValues();const selected=result.parent_id;result.parent_route=selected?.startsWith('site:')?selected.slice(5):null;if(result.parent_route)result.parent_id=null;return result;};
const dirty=()=>baseline&&JSON.stringify(values())!==baseline;
const message=(text,error=false)=>{el('pageMessage').textContent=text;el('pageMessage').style.color=error?'#a52013':'';};
const lock=value=>{busy=value;el('pageFields').disabled=value;el('newPage').disabled=value;};
const canLeave=()=>!dirty()||confirm('Discard your unsaved changes?');
function imagePreview(){const value=el('f_image_path').value.trim();const image=el('imagePreview');image.hidden=!value;if(value)image.src=/^https?:\/\//i.test(value)?value:db.storage.from('factorx-media').getPublicUrl(value).data.publicUrl;}
function openPage(page=null){
 current=page;manualSlug=!!page;
 const select=el('f_parent_id');select.replaceChildren(new Option('None', ''));
 window.sitePageParents.forEach(p=>select.add(new Option(p.title+' (existing page)','site:'+p.route)));
 records.filter(p=>!p.parent_id&&!p.parent_route&&p.id!==page?.id).forEach(p=>select.add(new Option(p.title,p.id)));
 fields.forEach(key=>{const input=el('f_'+key);if(input.type==='checkbox')input.checked=page?!!page[key]:key==='show_in_nav';else input.value=page?.[key]??(key==='sort_order'?0:'');});
 if(page?.parent_route)select.value='site:'+page.parent_route;
 el('pageUpload').value='';el('deletePage').hidden=!page;el('previewPage').hidden=!page;
 if(page)el('previewPage').href='../page.html?slug='+encodeURIComponent(page.slug)+'&preview=1';
 baseline=JSON.stringify(values());imagePreview();renderList();
}
function renderList(){
 const list=el('pageList');list.replaceChildren();
 const add=(page,child)=>{const button=document.createElement('button');button.type='button';button.className='page-list-item'+(child?' child':'')+(page.id===current?.id?' selected':'');button.textContent=page.title+' · '+(page.published?'Published':'Draft');button.onclick=()=>{if(!busy&&canLeave()){openPage(page);message('Editing '+page.title);}};list.append(button);};
 window.sitePageParents.forEach(parent=>{const children=records.filter(p=>p.parent_route===parent.route);if(children.length){const heading=document.createElement('h3');heading.textContent=parent.title;list.append(heading);children.forEach(p=>add(p,true));}});
 records.filter(p=>!p.parent_id&&!p.parent_route).forEach(p=>{add(p,false);records.filter(c=>c.parent_id===p.id).forEach(c=>add(c,true));});
 if(!records.length){const p=document.createElement('p');p.textContent='No custom pages yet. Add your first page.';list.append(p);}
}
async function refresh(){const {data,error}=await db.from('pages').select('*').order('sort_order').order('title');if(error)throw error;records=data||[];}
function validLink(value){if(!value)return true;if(/[\u0000-\u0020\\]/.test(value)||value.startsWith('//'))return false;try{return ['https:','http:','mailto:','tel:'].includes(new URL(value,location.href).protocol);}catch{return false;}}
el('newPage').onclick=()=>{if(!busy&&canLeave()){openPage();message('New page. Save it as a draft or publish when ready.');el('f_title').focus();}};
el('f_title').addEventListener('input',()=>{if(!manualSlug)el('f_slug').value=el('f_title').value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,'');});
el('f_slug').addEventListener('input',()=>{manualSlug=true;});
el('f_image_path').addEventListener('change',imagePreview);
el('pageForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;const payload=payloadValues();
 if(!payload.title||!validLink(payload.button_url)||!!payload.button_label!==!!payload.button_url){message('Enter a title and a valid button link with matching button text.',true);return;}
 if(payload.image_path&&/^[a-z][a-z0-9+.-]*:/i.test(payload.image_path)&&!/^https?:\/\//i.test(payload.image_path)){message('Use an HTTP or HTTPS image address, or upload an image.',true);return;}
 if(!Number.isInteger(payload.sort_order)||Math.abs(payload.sort_order)>2147483647){message('Menu order must be a whole number within the supported range.',true);return;}
 lock(true);message('Saving page…');
 try{
 let query=current?db.from('pages').update(payload).eq('id',current.id).eq('updated_at',current.updated_at):db.from('pages').insert(payload);
 const {data,error}=await query.select().maybeSingle();if(error)throw error;if(!data)throw new Error('This page changed in another session. Reload before saving again.');
 current=data;baseline=JSON.stringify(values());await refresh();openPage(records.find(p=>p.id===data.id)||data);message(payload.published?'Page published.':'Draft saved.');
 }catch(error){message(error.code==='23505'?'That page address is already in use. Choose another.':error.message||'The page could not be saved.',true);}finally{lock(false);}
};
el('pageUpload').onchange=async()=>{
 const file=el('pageUpload').files[0];if(!file||busy)return;
 const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
 if(!types[file.type]||file.size>10*1024*1024){message('Choose a JPG, PNG, WebP or GIF image up to 10 MB.',true);el('pageUpload').value='';return;}
 lock(true);message('Uploading image…');
 try{const path='pages/'+crypto.randomUUID()+'.'+types[file.type];const {error}=await db.storage.from('factorx-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;el('f_image_path').value=path;imagePreview();message('Image uploaded. Save the page to use it.');}catch(error){message(error.message,true);}finally{lock(false);el('pageUpload').value='';}
};
el('deletePage').onclick=async()=>{
 if(busy||!current)return;
 if(records.some(p=>p.parent_id===current.id)){message('Move or delete this page’s subpages first.',true);return;}
 if(!confirm('Delete '+current.title+'? This cannot be undone.'))return;
 lock(true);
 try{const {data,error}=await db.from('pages').delete().eq('id',current.id).eq('updated_at',current.updated_at).select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('This page changed in another session. Reload before deleting.');baseline='';current=null;await refresh();openPage();message('Page deleted.');}catch(error){message(error.message,true);}finally{lock(false);}
};
el('logoutButton').onclick=async()=>{if(busy||!canLeave())return;const {error}=await db.auth.signOut();if(error){message(error.message,true);return;}baseline='';location.href='index.html';};
window.addEventListener('beforeunload',event=>{if(dirty()||busy){event.preventDefault();event.returnValue='';}});
(async()=>{try{const {data:{session},error}=await db.auth.getSession();if(error)throw error;if(!session){location.replace('index.html');return;}const {data:admin,error:adminError}=await db.from('admins').select('user_id').eq('user_id',session.user.id).maybeSingle();if(adminError)throw adminError;if(!admin)throw new Error('Administrator access is required.');el('adminEmail').textContent=session.user.email;await refresh();openPage();lock(false);message('Choose a page or add a new one.');}catch(error){lock(true);message(error.message||'Could not load pages. Please refresh.',true);}})();
