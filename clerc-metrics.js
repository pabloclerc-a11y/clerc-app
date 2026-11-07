(function(){
'use strict';
const host=document.getElementById('clercMetricsOrigin');if(!host)return;
const colors=['#2563eb','#16a34a','#f59e0b','#a855f7','#ef4444','#64748b'];
const names=['Google','Boca a boca','Cliente anterior','Redes sociales','Otros','Sin especificar'];
const pad=n=>String(n).padStart(2,'0');
const localDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=new Date(),year=today.getFullYear();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
host.innerHTML='<div style="text-align:left;border-top:1px solid #d8e1ed;padding-top:14px"><h3 style="margin:4px 0 12px">🌐 ¿Cómo nos conocieron?</h3><label>Período <select id="metricPeriod" style="width:100%;padding:10px;margin:5px 0 10px"><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="year">Año</option><option value="range">Rango de fechas</option></select></label><div id="metricPeriodOptions" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div><div id="metricOriginResults" aria-live="polite"></div></div>';
const $=id=>document.getElementById(id),period=$('metricPeriod'),opts=$('metricPeriodOptions'),result=$('metricOriginResults');
function yearInput(){return '<label>Año <input id="metricYear" type="number" min="2000" max="2100" value="'+year+'" style="width:95px;padding:8px"></label>'}
function renderOptions(){
const mode=period.value;
if(mode==='month')opts.innerHTML=yearInput()+'<label>Mes <select id="metricMonth" style="padding:8px">'+Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'" '+(i===today.getMonth()?'selected':'')+'>'+new Date(2026,i,1).toLocaleDateString('es-ES',{month:'long'})+'</option>').join('')+'</select></label>';
else if(mode==='quarter')opts.innerHTML=yearInput()+'<label>Trimestre <select id="metricQuarter" style="padding:8px">'+[1,2,3,4].map(q=>'<option value="'+q+'" '+(q===Math.floor(today.getMonth()/3)+1?'selected':'')+'>'+q+'º trimestre</option>').join('')+'</select></label>';
else if(mode==='year')opts.innerHTML=yearInput();
else opts.innerHTML='<label>Desde <input id="metricFrom" type="date" value="'+year+'-01-01" style="padding:8px"></label><label>Hasta <input id="metricTo" type="date" value="'+localDate(today)+'" style="padding:8px"></label>';
opts.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',draw));draw();
}
function dates(){
const mode=period.value,y=Number($('metricYear')?.value||year);
if(mode==='range')return [$('metricFrom').value,$('metricTo').value];
if(!Number.isInteger(y)||y<2000||y>2100)return ['',''];
if(mode==='year')return [y+'-01-01',y+'-12-31'];
if(mode==='month'){const m=Number($('metricMonth').value);return [y+'-'+pad(m)+'-01',localDate(new Date(y,m,0))]}
const q=Number($('metricQuarter').value),m=(q-1)*3+1;return [y+'-'+pad(m)+'-01',localDate(new Date(y,m+2,0))];
}
function draw(){
const [from,to]=dates();if(!from||!to||from>to){result.textContent='Revisá las fechas del período.';return}
let records=[];try{records=JSON.parse(localStorage.getItem('clerc_nueva_llamada_v18_20261015')||'[]')}catch{}
if(!Array.isArray(records))records=[];
const counts=names.map(()=>0);
for(const x of records){if(!x||!x.creado)continue;const d=String(x.creado).slice(0,10);if(d<from||d>to)continue;let idx=names.indexOf(String(x.origen||'').trim());if(idx<0)idx=x.origen?4:5;counts[idx]++}
const outcomes=['ACEPTADO','RECHAZADO','NO SABE NO CONTESTA','SIN DEFINIR'];
const outcomeColors=['#16a34a','#dc2626','#7c3aed','#f59e0b'];
const outcomeCounts=[0,0,0,0];
for(const x of records){if(!x||!x.creado)continue;const d=String(x.creado).slice(0,10);if(d<from||d>to)continue;let ix=outcomes.indexOf(String(x.resultadoPresupuesto||'SIN DEFINIR').trim());if(ix<0)ix=3;outcomeCounts[ix]++}
const total=counts.reduce((a,b)=>a+b,0);
if(!total){result.innerHTML='<p style="padding:15px;background:#f4f7fb;border-radius:8px">No hay llamadas registradas entre '+esc(from)+' y '+esc(to)+'.</p>';return}
let start=0;const stops=[];counts.forEach((n,i)=>{if(!n)return;const end=start+n/total*100;stops.push(colors[i]+' '+start.toFixed(4)+'% '+end.toFixed(4)+'%');start=end});
const rows=counts.map((n,i)=>n?'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #e2e8f0"><span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+colors[i]+';margin-right:8px"></span>'+esc(names[i])+'</span><strong>'+n+' · '+(n/total*100).toLocaleString('es-ES',{maximumFractionDigits:1})+' %</strong></div>':'').join('');
result.innerHTML='<p><strong>'+total+' llamadas</strong> · '+esc(from)+' a '+esc(to)+'</p><div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:24px"><div role="img" aria-label="Gráfico circular de origen de llamadas" style="width:min(240px,75vw);height:min(240px,75vw);border-radius:50%;background:conic-gradient('+stops.join(',')+');flex-shrink:0"></div><div style="flex:1;min-width:200px">'+rows+'</div></div>';
let offset=0;const outcomeStops=[];
outcomeCounts.forEach((n,i)=>{if(!n)return;const end=offset+n/total*100;outcomeStops.push(outcomeColors[i]+' '+offset.toFixed(4)+'% '+end.toFixed(4)+'%');offset=end});
const outcomeRows=outcomeCounts.map((n,i)=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #e2e8f0"><span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+outcomeColors[i]+';margin-right:8px"></span>'+esc(outcomes[i])+'</span><strong>'+n+' · '+(n/total*100).toLocaleString('es-ES',{maximumFractionDigits:1})+' %</strong></div>').join('');
result.innerHTML+='<section style="margin-top:28px;padding-top:15px;border-top:1px solid #d8e1ed"><h3>📋 Resultado de los presupuestos</h3><p><strong>'+total+' clientes</strong> · mismo período seleccionado arriba</p><div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:24px"><div role="img" aria-label="Gráfico circular de resultados de presupuestos" style="width:min(240px,75vw);height:min(240px,75vw);border-radius:50%;background:conic-gradient('+outcomeStops.join(',')+');flex-shrink:0"></div><div style="flex:1;min-width:200px">'+outcomeRows+'</div></div></section>';
}
period.addEventListener('change',renderOptions);document.addEventListener('clerc-client-changed',draw);renderOptions();
})();