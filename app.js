(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const groups = ['Pecho','Espalda','Piernas','Brazos','Hombros','Fullbody'];
  const exercises = {
    Pecho:['Press plano','Press inclinado','Aperturas','Cruce de poleas','Fondos'],
    Espalda:['Jalón al pecho','Remo con barra','Remo con mancuerna','Remo en polea','Dominadas'],
    Piernas:['Sentadilla','Prensa','Extensiones','Curl femoral','Peso muerto rumano','Gemelos'],
    Brazos:['Curl de bíceps','Curl martillo','Tríceps en polea','Press francés'],
    Hombros:['Press militar','Elevaciones laterales','Pájaros','Face pull'],
    Fullbody:['Sentadilla','Press plano','Remo','Press militar','Peso muerto']
  };
  let db, chosenDate='', group='', exercise='', weight=0, reps=0, sets=0, toastTimer;
  const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const dateLabel=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});};
  const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('gym-personal-v1',1);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains('workouts'))d.createObjectStore('workouts',{keyPath:'id'});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function screen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));$('#'+id).classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2000);}
  function makeButtons(container,items,handler){const el=$(container);el.innerHTML='';items.forEach(item=>{const b=document.createElement('button');b.className='choice-btn';b.textContent=item;b.addEventListener('click',()=>handler(item));el.append(b);});}
  function startDate(date){chosenDate=date;$('#chosenDate').textContent=dateLabel(date);screen('muscleScreen');}
  function chooseGroup(value){group=value;$('#chosenMuscle').textContent=group;makeButtons('#exerciseButtons',exercises[group],chooseExercise);screen('exerciseScreen');}
  function chooseExercise(value){exercise=value;weight=0;$('#chosenExerciseWeight').textContent=exercise;$('#weightTotal').textContent='0';screen('weightScreen');}
  function addWeight(value){weight+=Number(value);$('#weightTotal').textContent=weight;}
  async function saveExercise(){
    if(!db){toast('No se pudo guardar.');return;}
    const tx=db.transaction('workouts','readwrite'),os=tx.objectStore('workouts');
    const all=await request(os.getAll());
    let workout=all.find(w=>w.date===chosenDate&&w.group===group);
    if(!workout)workout={id:'w_'+chosenDate+'_'+group.toLowerCase(),date:chosenDate,group,exercises:[]};
    workout.exercises.push({name:exercise,sets:Array.from({length:sets},()=>({weight:String(weight),reps:String(reps)}))});
    os.put(workout);
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    $('#loadedSummary').textContent=group+' · '+exercise+'\n'+weight+' kg · '+reps+' repeticiones · '+sets+' series';
    screen('loadedScreen');
  }
  function init(){
    $('#otherDate').max=todayISO();
    $('#todayBtn').addEventListener('click',()=>startDate(todayISO()));
    $('#otherDayBtn').addEventListener('click',()=>$('#otherDateWrap').classList.remove('hidden'));
    $('#confirmDateBtn').addEventListener('click',()=>{const d=$('#otherDate').value;if(!d){toast('Elegí una fecha.');return;}startDate(d);});
    makeButtons('#muscleButtons',groups,chooseGroup);
    makeButtons('#weightButtons',[10,20,30,40,50],addWeight);
    $('#weightContinue').addEventListener('click',()=>{if(weight<=0){toast('Sumá el peso primero.');return;}makeButtons('#repsButtons',[1,2,3,4,5,6,8,10,12,14],v=>{reps=Number(v);screen('setsScreen');});screen('repsScreen');});
    makeButtons('#setsButtons',[1,2,3,4],v=>{sets=Number(v);saveExercise().catch(err=>{console.error(err);toast('No se pudo guardar el entrenamiento.');});});
    $('#nextExerciseBtn').addEventListener('click',()=>screen('exerciseScreen'));
    $('#finishBtn').addEventListener('click',()=>{group='';exercise='';weight=0;reps=0;sets=0;screen('startScreen');});
    document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.back)));
  }
  openDB().then(d=>{db=d;init();}).catch(err=>{console.error(err);toast('Error al iniciar el almacenamiento.');});
})();