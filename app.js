(() => {
'use strict';
const $=s=>document.querySelector(s);
const groups=['Pecho','Espalda','Piernas','Brazos','Hombros','Fullbody'];
const exercises={Pecho:['Press plano','Press inclinado','Aperturas','Cruce de poleas','Fondos'],Espalda:['Jalón al pecho','Remo con barra','Remo con mancuerna','Remo en polea','Dominadas'],Piernas:['Sentadilla','Prensa','Extensiones','Curl femoral','Peso muerto rumano','Gemelos'],Brazos:['Curl de bíceps','Curl martillo','Tríceps en polea','Press francés'],Hombros:['Press militar','Elevaciones laterales','Pájaros','Face pull'],Fullbody:['Sentadilla','Press plano','Remo','Press militar','Peso muerto']};
let db,chosenDate='',group='',exercise='',weight=0,reps=0,sets=0,toastTimer,workouts=[];
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dateLabel=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('gym-personal-v1',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('workouts'))d.createObjectStore('workouts',{keyPath:'id'});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function loadWorkouts(){
 workouts=(await req(db.transaction('workouts').objectStore('workouts').getAll()));
 let migrated=false;
 workouts.forEach(w=>(w.exercises||[]).forEach((e,ei)=>{
  if(!e.id){e.id='e_legacy_'+w.id+'_'+ei;migrated=true}
  (e.sets||[]).forEach((s,si)=>{if(!s.id){s.id='s_legacy_'+w.id+'_'+ei+'_'+si;migrated=true}})
 }));
 if(migrated){const tx=db.transaction('workouts','readwrite'),os=tx.objectStore('workouts');workouts.forEach(w=>os.put(w));await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
 workouts.sort((a,b)=>b.date.localeCompare(a.date))
}
function screen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));$('#'+id).classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='savedScreen')renderSaved();if(id==='progressScreen')renderProgress()}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100)}
function makeButtons(selector,items,handler){const el=$(selector);el.innerHTML='';items.forEach(item=>{const b=document.createElement('button');b.className='choice-btn';b.textContent=item;b.addEventListener('click',()=>handler(item));el.append(b)})}
function startDate(date){chosenDate=date;$('#chosenDate').textContent=dateLabel(date);screen('muscleScreen')}
function chooseGroup(value){group=value;$('#chosenMuscle').textContent=group;makeButtons('#exerciseButtons',exercises[group],chooseExercise);screen('exerciseScreen')}
function chooseExercise(value){exercise=value;weight=0;$('#chosenExerciseWeight').textContent=exercise;$('#weightTotal').textContent='0';screen('weightScreen')}
function addWeight(value){weight+=Number(value);$('#weightTotal').textContent=weight}
async function saveExercise(){
 const existing=workouts.find(w=>w.date===chosenDate&&w.group===group);
 const workout=existing?{...existing,exercises:[...existing.exercises]}:{id:'w_'+chosenDate+'_'+group.toLowerCase(),date:chosenDate,group,exercises:[]};
 workout.exercises.push({id:'e_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:exercise,sets:Array.from({length:sets},(_,i)=>({id:'s_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2,4),weight:String(weight),reps:String(reps)}))});
 await req(db.transaction('workouts','readwrite').objectStore('workouts').put(workout));await loadWorkouts();
 $('#loadedSummary').textContent=group+' · '+exercise+'\n'+weight+' kg · '+reps+' repeticiones · '+sets+' series';screen('loadedScreen')
}
function renderSaved(){
 const root=$('#savedList');if(!workouts.length){root.innerHTML='<div class="empty">Todavía no hay entrenamientos guardados.<br>Cuando cargues uno, aparecerá acá.</div>';return}
 root.innerHTML=workouts.map(w=>'<article class="saved-day" data-workout="'+w.id+'"><div class="saved-day-head"><strong>'+dateLabel(w.date)+'</strong><span>'+w.group+'</span></div>'+w.exercises.map((e,ei)=>'<div class="saved-exercise" data-exercise="'+e.id+'"><div class="saved-exercise-title"><span>'+e.name+'</span><button class="mini-btn delete" data-action="delete-exercise">BORRAR</button></div>'+e.sets.map((s,si)=>'<div class="set-edit-row" data-set="'+s.id+'"><span>S'+(si+1)+'</span><input type="number" min="0" step="0.5" aria-label="Peso en kg" value="'+escapeAttr(s.weight)+'" data-field="weight"><input type="number" min="0" step="1" aria-label="Repeticiones" value="'+escapeAttr(s.reps)+'" data-field="reps"><button class="mini-btn delete" data-action="delete-set" aria-label="Borrar serie">×</button></div>').join('')+'<div class="exercise-actions"><button class="mini-btn" data-action="add-set">+ SERIE</button><button class="mini-btn" data-action="save-exercise">GUARDAR CAMBIOS</button></div></div>').join('')+'<div class="saved-day-actions"><button class="mini-btn delete" data-action="delete-workout">BORRAR ENTRENAMIENTO</button></div></article>').join('');
 root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>savedAction(b)));
 root.querySelectorAll('input[data-field]').forEach(inp=>inp.addEventListener('change',()=>updateSetField(inp)));
}
function escapeAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
async function updateSetField(input){const card=input.closest('[data-workout]'),exEl=input.closest('[data-exercise]'),setEl=input.closest('[data-set]');const w=workouts.find(x=>x.id===card.dataset.workout),e=w?.exercises.find(x=>x.id===exEl.dataset.exercise),s=e?.sets.find(x=>x.id===setEl.dataset.set);if(!s)return;s[input.dataset.field]=input.value;await saveWorkoutObject(w);toast('Cambio guardado')}
async function saveWorkoutObject(w){await req(db.transaction('workouts','readwrite').objectStore('workouts').put(w));await loadWorkouts()}
async function savedAction(button){
 const action=button.dataset.action,card=button.closest('[data-workout]'),w=workouts.find(x=>x.id===card.dataset.workout);if(!w)return;
 if(action==='delete-workout'){if(!confirm('¿Borrar todo este entrenamiento?'))return;await req(db.transaction('workouts','readwrite').objectStore('workouts').delete(w.id));await loadWorkouts();renderSaved();toast('Entrenamiento borrado');return}
 const exEl=button.closest('[data-exercise]'),e=w.exercises.find(x=>x.id===exEl?.dataset.exercise);if(!e)return;
 if(action==='delete-exercise'){if(!confirm('¿Borrar este ejercicio y todas sus series?'))return;w.exercises=w.exercises.filter(x=>x.id!==e.id);if(!w.exercises.length)await req(db.transaction('workouts','readwrite').objectStore('workouts').delete(w.id));else await saveWorkoutObject(w);await loadWorkouts();renderSaved();toast('Ejercicio borrado');return}
 if(action==='delete-set'){if(e.sets.length===1){toast('No se puede dejar un ejercicio sin series. Borrá el ejercicio completo.');return}const setEl=button.closest('[data-set]');e.sets=e.sets.filter(s=>s.id!==setEl.dataset.set);await saveWorkoutObject(w);renderSaved();toast('Serie borrada');return}
 if(action==='add-set'){const last=e.sets[e.sets.length-1]||{weight:'',reps:''};e.sets.push({id:'s_'+Date.now(),weight:last.weight,reps:last.reps});await saveWorkoutObject(w);renderSaved();toast('Serie agregada');return}
 if(action==='save-exercise'){const rows=[...exEl.querySelectorAll('[data-set]')];for(const row of rows){const s=e.sets.find(x=>x.id===row.dataset.set);if(s){s.weight=row.querySelector('[data-field="weight"]').value;s.reps=row.querySelector('[data-field="reps"]').value}}await saveWorkoutObject(w);renderSaved();toast('Cambios guardados')}
}
function renderProgress(){
 const allSets=workouts.flatMap(w=>w.exercises.flatMap(e=>e.sets.map(s=>({...s,name:e.name,date:w.date}))));
 const total=workouts.length,series=allSets.length,best=allSets.reduce((m,s)=>Math.max(m,Number(s.weight)||0),0);
 $('#progressSummary').innerHTML='<div class="metric"><span>ENTRENAMIENTOS</span><strong>'+total+'</strong></div><div class="metric"><span>SERIES REGISTRADAS</span><strong>'+series+'</strong></div><div class="metric"><span>MAYOR PESO</span><strong>'+best+' kg</strong></div><div class="metric"><span>EJERCICIOS</span><strong>'+new Set(allSets.map(s=>s.name)).size+'</strong></div>';
 const byExercise={};allSets.forEach(s=>{const key=s.name;if(!byExercise[key])byExercise[key]={best:0,last:0,date:'',reps:0};const n=Number(s.weight)||0;if(n>=byExercise[key].best)byExercise[key].best=n;if(!byExercise[key].date||s.date>byExercise[key].date){byExercise[key].date=s.date;byExercise[key].last=n;byExercise[key].reps=Number(s.reps)||0}});
 const entries=Object.entries(byExercise).sort((a,b)=>a[0].localeCompare(b[0]));
 $('#progressList').innerHTML=entries.length?entries.map(([name,v])=>'<article class="progress-card"><div><strong>'+name+'</strong><p>Último registro: '+dateLabel(v.date)+' · '+v.last+' kg × '+v.reps+'</p></div><div class="best">'+v.best+' kg</div></article>').join(''):'<div class="empty">Todavía no hay datos para mostrar.<br>Empezá a cargar tus entrenamientos.</div>'
}
function init(){
 $('#otherDate').max=todayISO();$('#todayBtn').addEventListener('click',()=>startDate(todayISO()));$('#otherDayBtn').addEventListener('click',()=>$('#otherDateWrap').classList.remove('hidden'));$('#confirmDateBtn').addEventListener('click',()=>{const d=$('#otherDate').value;if(!d){toast('Elegí una fecha');return}startDate(d)});
 makeButtons('#muscleButtons',groups,chooseGroup);makeButtons('#weightButtons',[10,20,30,40,50],addWeight);
 $('#weightContinue').addEventListener('click',()=>{if(weight<=0){toast('Sumá el peso primero');return}makeButtons('#repsButtons',[1,2,3,4,5,6,8,10,12,14],v=>{reps=Number(v);screen('setsScreen')});screen('repsScreen')});
 makeButtons('#setsButtons',[1,2,3,4],v=>{sets=Number(v);saveExercise().catch(err=>{console.error(err);toast('No se pudo guardar')})});
 $('#nextExerciseBtn').addEventListener('click',()=>screen('exerciseScreen'));$('#seeSavedBtn').addEventListener('click',()=>screen('savedScreen'));
 $('#finishBtn').addEventListener('click',()=>{group='';exercise='';weight=0;reps=0;sets=0;screen('startScreen')});
 document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.back)));
 document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.screen)));
}
openDB().then(async d=>{db=d;await loadWorkouts();init()}).catch(err=>{console.error(err);toast('Error al iniciar el almacenamiento')});
})();