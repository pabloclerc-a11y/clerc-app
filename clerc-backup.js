(function(){
'use strict';
const $=id=>document.getElementById(id);
const status=$('backupDailyStatus'),choose=$('backupChooseFolder'),now=$('backupNow');
if(!status||!choose||!now)return;
const DB='clerc_backup_folder_v1',STORE='settings',HANDLE='directory',LAST='clerc_last_daily_backup_v1';
let busy=false,folder=null;
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function readHandle(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(HANDLE);r.onsuccess=()=>{resolve(r.result||null);d.close()};r.onerror=()=>{reject(r.error);d.close()}})}
async function saveHandle(h){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(h,HANDLE);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(tx.error)}})}
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function snapshot(){const keys=['clerc_nueva_llamada_v18_20261015','clerc_crew_blocks_v1'];const records={};for(const k of keys){try{records[k]=JSON.parse(localStorage.getItem(k)||'[]')}catch{records[k]=[]}}return {format:'CLERC_BACKUP_COMPLETO',version:1,createdAt:new Date().toISOString(),date:date(),data:records}}
async function backup(force=false){if(busy)return;const today=date(),hour=new Date().getHours();if(!force&&(hour<20||localStorage.getItem(LAST)===today))return;if(!folder){status.textContent='Copia diaria pendiente: elegí la carpeta con «Activar copia diaria».';return}
busy=true;try{
const permission=await folder.queryPermission({mode:'readwrite'});
if(permission!=='granted'){status.textContent='Para guardar la copia de hoy, pulsá «Activar copia diaria» y autorizá la carpeta.';return}
const file=await folder.getFileHandle('CLERC_copia_'+today+'.json',{create:true}),writer=await file.createWritable();
await writer.write(JSON.stringify(snapshot(),null,2));await writer.close();localStorage.setItem(LAST,today);
status.textContent='Última copia guardada: '+today+' en '+folder.name+'. Google Drive la sincronizará cuando termine de subirla.';
}catch(e){status.textContent='No se pudo guardar la copia: '+e.message}finally{busy=false}}
choose.addEventListener('click',async()=>{if(!window.showDirectoryPicker){status.textContent='Esta función necesita Chrome en el ordenador. En móvil usá Exportar clientes.';return}try{
folder=await window.showDirectoryPicker({mode:'readwrite',id:'clerc-backups'});
if(folder.name!=='COPIAS SEGURIDAD APP'&&!confirm('Elegiste «'+folder.name+'». ¿Querés guardar las copias ahí?'))return;
await saveHandle(folder);const p=await folder.requestPermission({mode:'readwrite'});if(p!=='granted')throw Error('Falta autorizar la carpeta');
status.textContent='Carpeta autorizada: '+folder.name+'. Copia diaria programada a las 20:00.';
await backup(true);
}catch(e){if(e.name!=='AbortError')status.textContent='No se pudo activar: '+e.message}});
now.addEventListener('click',async()=>{if(!folder){status.textContent='Primero pulsá «Activar copia diaria» para elegir la carpeta.';return}if(await folder.queryPermission({mode:'readwrite'})!=='granted'){const p=await folder.requestPermission({mode:'readwrite'});if(p!=='granted'){status.textContent='No se autorizó la carpeta.';return}}await backup(true)});
(async()=>{try{folder=await readHandle();if(folder){status.textContent='Carpeta configurada: '+folder.name+'. Última copia: '+(localStorage.getItem(LAST)||'todavía ninguna')+'.';await backup()}else status.textContent='Pendiente: pulsá «Activar copia diaria» una sola vez.'}catch(e){status.textContent='Para activar las copias, pulsá «Activar copia diaria».'}})();
setInterval(()=>backup(),60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)backup()});
})();