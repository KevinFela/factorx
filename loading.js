document.documentElement.classList.add('cms-loading');
window.finishCmsLoading=function(success){
  clearTimeout(window.cmsLoadingTimer);
  document.documentElement.classList.remove('cms-loading');
  document.documentElement.classList.toggle('cms-failed',!success);
  if(!success){
    const message=document.getElementById('cms-loading-message');
    const retry=document.getElementById('cms-retry');
    if(message)message.textContent='The latest website content could not be loaded. Please try again.';
    if(retry){retry.hidden=false;retry.onclick=()=>location.reload();}
  }
};
window.cmsLoadingTimer=setTimeout(()=>window.finishCmsLoading(false),15000);
