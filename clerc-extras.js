(function(){
'use strict';
const $=id=>document.getElementById(id), notes=$('notesArea'),photos=$('photosArea'),canvas=$('clientCanvas'),ctx=canvas.getContext('2d');
const base='https://qmycdyktiyxlnnawbreb.supabase.co',pub='sb_publishable_NmFWm-EpRHZrOUSQF9BFfw_GcGW0xy9',bucket='clerc-client-photos';
let current=null,drawing=false,hasDrawing=false;
function record(){return typeof editId!=='undefined'&&editId?load().find(x=>x.id===editId):null}
function resetCanvas(){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#152d50';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';hasDrawing=false}
function showDrawing(src){resetCanvas();if(!src)return;const img=new Image();img.onload=()=>{ctx.drawImage(img,0,0,canvas.width,canvas.height);hasDrawing=true};img.src=src}
function refresh(){const x=record();if(x?.id!==current){if(typeof trashNotesList!=='undefined')trashNotesList.hidden=true;current=x?.id||null;$('clientNotes').value=x?.notasLibres||'';showDrawing(x?.croquis||null);notes.hidden=true;photos.hidden=true;$('clientPhotoList').replaceChildren()}return x}
function requireRecord(){const x=refresh();if(!x){alert('Primero guardá el cliente o abrí su ficha con Editar.');return null}return x}
$('openNotes').onclick=()=>{if(!requireRecord())return;notes.hidden=!notes.hidden;photos.hidden=true};
$('openPhotos').onclick=async()=>{const x=requireRecord();if(!x)return;photos.hidden=!photos.hidden;notes.hidden=true;if(!photos.hidden)await listPhotos(x)};
function coords(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height}}
canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const p=coords(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();hasDrawing=true});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=coords(e);ctx.lineTo(p.x,p.y);ctx.stroke()});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drawing=false);
resetCanvas();
$('eraseDrawing').onclick=()=>{if(confirm('¿Borrar el dibujo de esta ficha?'))resetCanvas()};
$('saveNotes').onclick=()=>{const x=requireRecord();if(!x)return;const a=load(),i=a.findIndex(y=>y.id===x.id);if(i<0)return;a[i]={...a[i],notasLibres:$('clientNotes').value,croquis:hasDrawing?canvas.toDataURL('image/png'):null,actualizado:new Date().toISOString()};try{store(a);render();$('notesStatus').textContent='Notas y dibujo guardados. Se sincronizarán con tu cuenta.'}catch(e){$('notesStatus').textContent='No se pudo guardar: '+e.message}};
function updateClient(change){const x=requireRecord();if(!x)return null;const a=load(),i=a.findIndex(y=>y.id===x.id);if(i<0)return null;a[i]={...a[i],...change,actualizado:new Date().toISOString()};store(a);render();return a[i]}
const trashNotesBtn=document.createElement('button');trashNotesBtn.type='button';trashNotesBtn.className='btn secondary';trashNotesBtn.textContent='♻️ Notas eliminadas';$('saveNotes').parentElement.append(trashNotesBtn);
const trashNotesList=document.createElement('div');trashNotesList.style='margin-top:12px';trashNotesList.hidden=true;$('notesArea').append(trashNotesList);
trashNotesBtn.onclick=()=>{
 const x=requireRecord();if(!x)return;trashNotesList.hidden=!trashNotesList.hidden;if(trashNotesList.hidden)return;trashNotesList.replaceChildren();
 const items=x.notasPapelera||[];
 if(!items.length){trashNotesList.textContent='No hay notas eliminadas para este cliente. Para probar, guardá una nota y después usá Borrar notas y dibujo.';return}
 for(const n of items){
  const item=document.createElement('div');item.style='padding:12px;border:1px solid #d5deea;border-radius:8px;margin-bottom:8px';
  const info=document.createElement('p');info.textContent=(n.fecha?new Date(n.fecha).toLocaleString('es-ES')+' — ':'')+(n.texto||'[Dibujo guardado]');
  const restore=document.createElement('button');restore.type='button';restore.className='btn secondary';restore.textContent='↩ Recuperar nota y dibujo';
  restore.onclick=()=>{if(n.hojaA4){if(!confirm('¿Recuperar esta hoja A4?'))return;try{const now=record();updateClient({hojasA4:[...(now.hojasA4||[]),{id:n.id,fecha:new Date().toISOString(),texto:n.texto||'',dibujo:n.croquis||null}],notasPapelera:(now.notasPapelera||[]).filter(v=>v.id!==n.id)});trashNotesList.hidden=true;a4Render();$('notesStatus').textContent='Hoja A4 recuperada.'}catch(e){alert(e.message)}return}if(!confirm('¿Recuperar esta nota? Sustituirá las notas y el dibujo actuales.'))return;try{const now=record();const rest=(now.notasPapelera||[]).filter(v=>v.id!==n.id);const previous=(now.notasLibres||now.croquis)?[{id:'n'+Date.now(),fecha:new Date().toISOString(),texto:now.notasLibres||'',croquis:now.croquis||null}]:[];updateClient({notasLibres:n.texto||'',croquis:n.croquis||null,notasPapelera:[...rest,...previous]});$('clientNotes').value=n.texto||'';showDrawing(n.croquis||null);trashNotesList.hidden=true;trashNotesBtn.click();$('notesStatus').textContent='Nota recuperada.'}catch(e){alert(e.message)}};
  item.append(info,restore);trashNotesList.append(item)
 }
};
const clearNotes=document.createElement('button');clearNotes.type='button';clearNotes.className='btn secondary';clearNotes.textContent='🗑️ Borrar notas y dibujo';clearNotes.style.color='#a21c22';$('saveNotes').parentElement.append(clearNotes);
clearNotes.onclick=()=>{const x=requireRecord();if(!x)return;if(!confirm('¿Borrar las notas y el dibujo de '+x.nombre+'? Se quitarán también de los otros dispositivos.'))return;try{updateClient({notasLibres:'',croquis:null,notasPapelera:[...(x.notasPapelera||[]),{id:'n'+Date.now(),fecha:new Date().toISOString(),texto:x.notasLibres||'',croquis:x.croquis||null}].filter(v=>v.texto||v.croquis)});$('clientNotes').value='';resetCanvas();$('notesStatus').textContent='Notas y dibujo borrados. Cambio pendiente de sincronizar.'}catch(e){$('notesStatus').textContent='No se pudo borrar: '+e.message}};

const a4Open=document.createElement('button');a4Open.type='button';a4Open.className='btn primary';a4Open.textContent='＋ Nota nueva';$('notesArea').insertBefore(a4Open,$('clientNotes').previousElementSibling);
const a4List=document.createElement('div');a4List.style='margin:12px 0';$('notesArea').insertBefore(a4List,$('clientNotes').previousElementSibling);
const a4Wrap=document.createElement('div');a4Wrap.hidden=true;a4Wrap.style='margin:16px auto;padding:20px;background:#fff;border:1px solid #b8c4d5;box-shadow:0 3px 12px #0002;width:100%;max-width:794px';
a4Wrap.innerHTML='<div style="font-weight:800;font-size:19px">CLERC · Pinturas y Reformas Alicante</div><p id="a4Client" style="font-size:13px"></p><label>Escribir nota</label><textarea id="a4Text" style="width:100%;min-height:170px" placeholder="Escribí aquí..."></textarea><label>Dibujar con lápiz, dedo o ratón</label><canvas id="a4Canvas" width="700" height="780" style="width:100%;height:auto;display:block;touch-action:none;border:1px solid #aebbd0;background:white"></canvas><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn primary" id="a4Save">Guardar hoja</button><button type="button" class="btn secondary" id="a4Print">Imprimir A4</button><button type="button" class="btn secondary" id="a4Close">Cerrar</button></div><p id="a4Status" role="status"></p>';
$('notesArea').insertBefore(a4Wrap,$('clientNotes').previousElementSibling);
const ac=$('a4Canvas'),actx=ac.getContext('2d');let a4Id=null,a4Drawing=false,a4Dirty=false;
function a4Blank(){actx.fillStyle='white';actx.fillRect(0,0,ac.width,ac.height);actx.strokeStyle='#152d50';actx.lineWidth=2.5;actx.lineCap='round';actx.lineJoin='round';a4Dirty=false}
function a4LoadDrawing(src){a4Blank();if(!src)return;const im=new Image();im.onload=()=>{actx.drawImage(im,0,0,ac.width,ac.height);a4Dirty=true};im.src=src}
function a4Show(n){const x=requireRecord();if(!x)return;a4Id=n?.id||null;$('a4Text').value=n?.texto||'';$('a4Client').textContent='Cliente: '+[x.nombre,x.apellidos].filter(Boolean).join(' ')+' · Fecha: '+new Date(n?.fecha||Date.now()).toLocaleDateString('es-ES');a4LoadDrawing(n?.dibujo);a4Wrap.hidden=false;a4Wrap.scrollIntoView({behavior:'smooth',block:'start'})}
a4Open.onclick=()=>a4Show(null);
function a4Position(e){const r=ac.getBoundingClientRect();return{x:(e.clientX-r.left)*ac.width/r.width,y:(e.clientY-r.top)*ac.height/r.height}}
ac.addEventListener('pointerdown',e=>{a4Drawing=true;ac.setPointerCapture(e.pointerId);const p=a4Position(e);actx.beginPath();actx.moveTo(p.x,p.y);actx.lineTo(p.x+.1,p.y+.1);actx.stroke();a4Dirty=true});
ac.addEventListener('pointermove',e=>{if(!a4Drawing)return;const p=a4Position(e);actx.lineTo(p.x,p.y);actx.stroke()});
for(const ev of ['pointerup','pointercancel'])ac.addEventListener(ev,()=>{a4Drawing=false});
$('a4Close').onclick=()=>{a4Wrap.hidden=true};
function a4Render(){const x=record();a4List.replaceChildren();if(!x)return;const sheets=x.hojasA4||[];if(!sheets.length){a4List.textContent='Todavía no hay hojas A4 guardadas.';return}for(const n of sheets){const row=document.createElement('div');row.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0';const label=document.createElement('span');label.textContent='Hoja A4 · '+new Date(n.fecha).toLocaleDateString('es-ES')+' · '+(n.texto||'Dibujo').slice(0,40);const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';edit.textContent='Abrir';edit.onclick=()=>a4Show(n);const del=document.createElement('button');del.type='button';del.className='btn secondary';del.textContent='🗑️ Papelera';del.onclick=()=>{if(!confirm('¿Enviar esta hoja A4 a notas eliminadas?'))return;const now=record();updateClient({hojasA4:(now.hojasA4||[]).filter(y=>y.id!==n.id),notasPapelera:[...(now.notasPapelera||[]),{id:n.id,fecha:new Date().toISOString(),texto:n.texto||'',croquis:n.dibujo||null,hojaA4:true}]});a4Wrap.hidden=true;a4Render()};row.append(label,edit,del);a4List.append(row)}}
$('a4Save').onclick=()=>{const x=requireRecord();if(!x)return;try{const n={id:a4Id||'a4'+Date.now(),fecha:new Date().toISOString(),texto:$('a4Text').value,dibujo:a4Dirty?ac.toDataURL('image/png'):null};const sheets=[...(x.hojasA4||[])];const idx=sheets.findIndex(y=>y.id===n.id);if(idx>=0)sheets[idx]=n;else sheets.push(n);updateClient({hojasA4:sheets});a4Id=n.id;$('a4Status').textContent='Hoja A4 guardada. Se sincronizará con tus dispositivos.';a4Render()}catch(e){$('a4Status').textContent='Error: '+e.message}};
$('a4Print').onclick=()=>{const x=requireRecord();if(!x)return;const w=window.open('','_blank');if(!w){$('a4Status').textContent='Permití ventanas emergentes para imprimir.';return}const escapeHtml=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const name=[x.nombre,x.apellidos].filter(Boolean).join(' ');w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Nota A4 CLERC</title><style>@page{size:A4;margin:14mm}body{font:14px Arial}h2{margin-bottom:4px}pre{font:14px Arial;white-space:pre-wrap;overflow-wrap:anywhere}img{width:100%;height:auto;max-height:195mm;object-fit:contain}</style></head><body><h2>CLERC · Pinturas y Reformas Alicante</h2><p>Cliente: '+escapeHtml(name)+' · '+new Date().toLocaleDateString('es-ES')+'</p><hr><pre>'+escapeHtml($('a4Text').value)+'</pre><img src="'+ac.toDataURL('image/png')+'"></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),400)};
document.addEventListener('clerc-client-changed',()=>{a4Wrap.hidden=true;setTimeout(a4Render,0)});
a4Render();
function session(){try{return JSON.parse(localStorage.getItem('clerc_cloud_session_v1')||'null')}catch{return null}}
async function api(path,options={}){const a=session();if(!a?.access_token)throw Error('Entrá en tu cuenta de sincronización primero.');const h={apikey:pub,Authorization:'Bearer '+a.access_token,...options.headers};const r=await fetch(base+path,{...options,headers:h});if(!r.ok){let t=await r.text();throw Error('Error '+r.status+': '+t.slice(0,140))}return r}
async function listPhotos(x){
 const list=$('clientPhotoList');list.replaceChildren();$('photosStatus').textContent='Cargando fotos…';
 try{
  const a=session();if(!a?.user?.id)throw Error('Iniciá sesión en la nube.');
  const prefix=a.user.id+'/'+x.id;
  const r=await api('/storage/v1/object/list/'+bucket,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:100,sortBy:{column:'created_at',order:'desc'}})});
  const files=await r.json();let shown=0;
  for(const f of files){
   if(!f.name||f.id===null)continue;
   const path=prefix+'/'+f.name;
   const latest=load().find(c=>c.id===x.id)||x;
   if((latest.fotosOcultas||[]).includes(path))continue;
   const signed=await api('/storage/v1/object/sign/'+bucket+'/'+encodeURIComponent(path).replaceAll('%2F','/'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
   const d=await signed.json();
   const tile=document.createElement('div');tile.style='display:flex;flex-direction:column;gap:6px;align-items:center';
   const img=document.createElement('img');img.src=base+'/storage/v1'+d.signedURL;img.alt='Foto del cliente';img.style='width:130px;height:130px;object-fit:cover;border-radius:8px;cursor:pointer';img.onclick=()=>window.open(img.src,'_blank');
   const remove=document.createElement('button');remove.type='button';remove.className='btn secondary';remove.style='padding:8px;color:#a21c22';remove.textContent='🗑️ Quitar foto';
   remove.onclick=async()=>{
    if(!confirm('¿Quitar esta foto de la ficha de '+x.nombre+'? La foto seguirá almacenada en la nube.'))return;
    remove.disabled=true;
    try{const now=load().find(c=>c.id===x.id);if(!now)throw Error('No se encontró el cliente');updateClient({fotosOcultas:[...new Set([...(now.fotosOcultas||[]),path])]});tile.remove();$('photosStatus').textContent='Foto quitada de la ficha. El archivo permanece guardado en la nube.'}
    catch(e){remove.disabled=false;$('photosStatus').textContent='No se pudo quitar: '+e.message}
   };
   const save=document.createElement('button');save.type='button';save.className='btn secondary';save.style='padding:8px';save.textContent='⬇ Guardar en dispositivo';save.onclick=async()=>{try{const res=await fetch(img.src);if(!res.ok)throw Error('No se pudo descargar');const blob=await res.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=f.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('photosStatus').textContent='Foto descargada. En Android puede aparecer en Descargas; desde allí podés moverla a la galería.'}catch(e){$('photosStatus').textContent='No se pudo descargar: '+e.message}};tile.append(img,remove,save);list.append(tile);shown++;
  }
  $('photosStatus').textContent=shown?shown+' foto(s) visibles.':'Todavía no hay fotos visibles.';
 }catch(e){$('photosStatus').textContent='No se pudieron cargar las fotos: '+e.message}
}
const trashPhotosBtn=document.createElement('button');trashPhotosBtn.type='button';trashPhotosBtn.className='btn secondary';trashPhotosBtn.textContent='♻️ Fotos eliminadas';$('photosArea').insertBefore(trashPhotosBtn,$('clientPhotoList'));
const trashPhotosList=document.createElement('div');trashPhotosList.style='display:flex;gap:12px;flex-wrap:wrap;margin:12px 0';$('photosArea').insertBefore(trashPhotosList,$('clientPhotoList'));
trashPhotosBtn.onclick=async()=>{
 const x=requireRecord();if(!x)return;trashPhotosList.replaceChildren();const hidden=x.fotosOcultas||[];
 if(!hidden.length){trashPhotosList.textContent='No hay fotos eliminadas.';return}
 for(const path of hidden){
  const tile=document.createElement('div');tile.style='display:flex;flex-direction:column;gap:6px;align-items:center';
  try{
   const signed=await api('/storage/v1/object/sign/'+bucket+'/'+encodeURIComponent(path).replaceAll('%2F','/'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
   const d=await signed.json();const img=document.createElement('img');img.src=base+'/storage/v1'+d.signedURL;img.alt='Foto eliminada';img.style='width:130px;height:130px;object-fit:cover;border-radius:8px';
   const restore=document.createElement('button');restore.type='button';restore.className='btn secondary';restore.textContent='↩ Recuperar foto';restore.onclick=async()=>{try{const now=record();updateClient({fotosOcultas:(now.fotosOcultas||[]).filter(p=>p!==path)});tile.remove();await listPhotos(record())}catch(e){alert('No se pudo recuperar: '+e.message)}};
   tile.append(img,restore)
  }catch(e){tile.textContent='Foto no disponible: '+e.message}
  trashPhotosList.append(tile)
 }
};
async function handlePhotoChange(e){const x=requireRecord();if(!x)return;const a=session();if(!a?.user?.id){$('photosStatus').textContent='Iniciá sesión en la nube primero.';return}for(const file of e.target.files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){$('photosStatus').textContent='Usá JPG, PNG o WEBP de hasta 10 MB.';continue}const name=a.user.id+'/'+x.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+file.type.split('/')[1];try{$('photosStatus').textContent='Guardando foto…';await api('/storage/v1/object/'+bucket+'/'+name,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});$('photosStatus').textContent='Foto guardada en la nube.'}catch(err){$('photosStatus').textContent='Error al guardar: '+err.message}}e.target.value='';await listPhotos(x)}
$('clientPhotoInput').addEventListener('change',handlePhotoChange);
$('clientPhotoCamera').addEventListener('change',handlePhotoChange);
document.addEventListener('clerc-client-changed',()=>{current=null;refresh();$('notesStatus').textContent='';$('photosStatus').textContent=''});
})();