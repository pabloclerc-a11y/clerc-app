(function(){
'use strict';
const base='https://qmycdyktiyxlnnawbreb.supabase.co',pub='sb_publishable_NmFWm-EpRHZrOUSQF9BFfw_GcGW0xy9',sessionKey='clerc_cloud_session_v1';
const $=id=>document.getElementById(id);
const host=$('exportClients')?.closest('.transfer-box');if(!host)return;
const box=document.createElement('div');box.className='transfer-box';box.innerHTML='<strong>☁ Sincronización entre ordenador y móvil</strong><p>Utiliza la misma cuenta en ambos dispositivos. Tus clientes no se publican en GitHub.</p><div id="cloudLogin"><input id="cloudEmail" type="email" placeholder="Correo electrónico"><input id="cloudPass" type="password" placeholder="Contraseña"><button type="button" id="cloudEnter">Entrar</button> <button type="button" id="cloudSignup">Crear cuenta</button> <button type="button" id="cloudRecover">¿Olvidaste tu contraseña?</button></div><div id="cloudReset" hidden><input id="cloudNewPass" type="password" placeholder="Nueva contraseña"><button type="button" id="cloudChangePass">Guardar contraseña</button></div><div id="cloudActive" hidden><span id="cloudWho"></span> <button type="button" id="cloudSync">Sincronizar ahora</button> <button type="button" id="cloudLogout">Salir</button></div><p id="cloudStatus" role="status">Sin conectar. Los datos locales permanecen intactos.</p>';
host.parentNode.insertBefore(box,host);
let auth=null,busy=false,queued=false;
function status(s){$('cloudStatus').textContent=s}
function display(){let yes=!!auth?.access_token;$('cloudLogin').hidden=yes;$('cloudActive').hidden=!yes;$('cloudWho').textContent=yes?(auth.user?.email||'Cuenta conectada'):''}
async function req(path,options={}){let h={'apikey':pub,'Content-Type':'application/json',...(auth?.access_token?{'Authorization':'Bearer '+auth.access_token}:{}),...(options.headers||{})};let r=await fetch(base+path,{...options,headers:h}),t=await r.text(),d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.msg||d?.message||d?.error_description||d?.error||'Error '+r.status);return d}
function setAuth(d){auth=d;localStorage.setItem(sessionKey,JSON.stringify(d));display()}
async function ensure(){if(!auth)return false;if(auth.expires_at&&Date.now()<auth.expires_at*1000-60000)return true;if(!auth.refresh_token)return true;try{let d=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:auth.refresh_token})});d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);setAuth(d);return true}catch{auth=null;localStorage.removeItem(sessionKey);display();status('Sesión caducada. Volvé a entrar.');return false}}
const deletedKey='clerc_deleted_clients_v1';
function deleted(){try{return JSON.parse(localStorage.getItem(deletedKey)||'{}')}catch{return {}}}
function saveDeleted(d){localStorage.setItem(deletedKey,JSON.stringify(d))}
window.clercDeleteClient=async function(id){
 if(!auth){throw Error('Conectate a la nube antes de eliminar un cliente.')}
 if(!await ensure())throw Error('Volvé a iniciar sesión en la nube.');
 const user=await req('/auth/v1/user');
 if(!user?.id)throw Error('No se pudo comprobar la cuenta.');
 const a=load(),client=a.find(x=>String(x.id)===String(id));
 if(!client)throw Error('No se encontró el cliente.');
 const backupKey='clerc_before_delete_'+Date.now();
 localStorage.setItem(backupKey,JSON.stringify(a));
 const d=deleted();d[String(id)]=new Date().toISOString();saveDeleted(d);
 try{
  await req('/rest/v1/clerc_v18_sync?owner_id=eq.'+encodeURIComponent(user.id)+'&record_id=eq.'+encodeURIComponent(String(id)),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:{id:String(id),_deleted:true},updated_at:new Date().toISOString()})}).then(rows=>{if(!Array.isArray(rows)||rows.length!==1)throw Error('No se confirmó el borrado en la nube.')});
  const p=pending();delete p[String(id)];savePending(p);
  localStorage.setItem(KEY,JSON.stringify(a.filter(x=>String(x.id)!==String(id))));
  render();renderPending();document.dispatchEvent(new Event('clerc-client-changed'));
  return true;
 }catch(e){const next=deleted();delete next[String(id)];saveDeleted(next);throw e}
};
const dirtyKey='clerc_sync_pending_v2';
function pending(){try{return JSON.parse(localStorage.getItem(dirtyKey)||'{}')}catch{return {}}}
function savePending(p){localStorage.setItem(dirtyKey,JSON.stringify(p))}
const oldStore=store;
store=function(records){
 const before=new Map(load().filter(x=>x?.id).map(x=>[String(x.id),JSON.stringify(x)]));
 const p=pending();
 const removed=deleted();
 for(const x of records){if(!x?.id||removed[String(x.id)])continue;const id=String(x.id),value=JSON.stringify(x);if(before.get(id)!==value)p[id]=value}
 savePending(p);
 oldStore(records);
 if(auth)sync();
};
async function sync(){
 if(!auth)return;
 if(busy){queued=true;return}
 busy=true;
 try{
  if(!await ensure())return;
  status('Sincronizando…');
  const user=await req('/auth/v1/user');
  if(!user.id)throw Error('No se pudo identificar la cuenta');
  const remote=await req('/rest/v1/clerc_v18_sync?select=record_id,payload,updated_at&owner_id=eq.'+encodeURIComponent(user.id));
  const tombstones=deleted();for(const r of remote||[]){if(r.payload?._deleted)tombstones[String(r.record_id)]=r.updated_at||new Date().toISOString()}saveDeleted(tombstones);const remoteMap=new Map((remote||[]).filter(r=>r.payload?.id&&!r.payload?._deleted&&!tombstones[String(r.record_id)]).map(r=>[String(r.record_id),r.payload]));
  const local=load();
  const localMap=new Map(local.filter(x=>x?.id&&!tombstones[String(x.id)]).map(x=>[String(x.id),x]));
  const changes=pending();
  const uploads=[];
  for(const [id,x] of localMap){
   if(changes[id]){try{uploads.push(JSON.parse(changes[id]))}catch{uploads.push(x)}}
   else if(!remoteMap.has(id))uploads.push(x);
  }
  if(uploads.length){
   await req('/rest/v1/clerc_v18_sync?on_conflict=owner_id,record_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(uploads.map(x=>({owner_id:user.id,record_id:String(x.id),payload:x,updated_at:new Date().toISOString()})))});
   for(const x of uploads)remoteMap.set(String(x.id),x);
   const next=pending();
   for(const x of uploads){const id=String(x.id);if(next[id]===changes[id])delete next[id]}
   savePending(next);
  }
  const stillPending=pending();
  const merged=new Map(remoteMap);
  for(const [id,x] of localMap){if(stillPending[id])merged.set(id,x)}
  const result=[...merged.values()].filter(x=>!tombstones[String(x.id)]);
  if(JSON.stringify(result)!==JSON.stringify(local)){
   localStorage.setItem('clerc_sync_backup_'+new Date().toISOString().slice(0,10),JSON.stringify(local));
   localStorage.setItem(KEY,JSON.stringify(result));
   render();renderPending();
  }
  status('Sincronizados '+result.length+' clientes.');
 }catch(e){status('No se pudo sincronizar: '+e.message)}
 finally{busy=false;if(queued){queued=false;sync()}}
}
$('cloudEnter').onclick=async()=>{try{let d=await req('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('cloudEmail').value.trim(),password:$('cloudPass').value})});d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);setAuth(d);await sync()}catch(e){status('No se pudo entrar: '+e.message)}};
$('cloudSignup').onclick=async()=>{try{await req('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:$('cloudEmail').value.trim(),password:$('cloudPass').value})});status('Revisá tu correo para confirmar la cuenta.')}catch(e){status(e.message)}};
$('cloudRecover').onclick=async()=>{try{let email=$('cloudEmail').value.trim();if(!email)throw Error('Escribí tu correo primero');await req('/auth/v1/recover?redirect_to='+encodeURIComponent('https://pabloclerc-a11y.github.io/clerc-app/'),{method:'POST',body:JSON.stringify({email})});status('Revisá tu correo para recuperar la contraseña.')}catch(e){status(e.message)}};
$('cloudChangePass').onclick=async()=>{try{let password=$('cloudNewPass').value;if(password.length<6)throw Error('Mínimo 6 caracteres');await req('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})});$('cloudReset').hidden=true;status('Contraseña actualizada.');await sync()}catch(e){status(e.message)}};
$('cloudSync').onclick=sync;$('cloudLogout').onclick=()=>{auth=null;localStorage.removeItem(sessionKey);display();status('Sesión cerrada. Tus datos locales se conservan.')};
try{auth=JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{}
let hash=new URLSearchParams(location.hash.slice(1));if(hash.get('type')==='recovery'&&hash.get('access_token')){setAuth({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+3600});$('cloudReset').hidden=false;history.replaceState(null,'',location.pathname)}
display();if(auth)sync();window.addEventListener('focus',()=>{if(auth)sync()});
})();