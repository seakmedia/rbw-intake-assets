/* Rainforest Bodyworks new-client intake · v1.1.0
   Standalone (opened directly): preview mode, nothing is sent.
   Embedded (inside the Wix page): on submit, the PDF + answers go to the parent Wix page by postMessage; Wix page code calls
   backend/intake.web.js, which files them in the practice's private Microsoft 365 folder. A receipt is shown only after the
   backend confirms the upload. Answers stay in memory only (no cookies, no browser storage, nothing in URLs or analytics). */
const FORM_VERSION='1.1.0';
const RBW_EMBED=(()=>{try{return window.self!==window.top||new URLSearchParams(location.search).has('embed');}catch(e){return true;}})();
if(RBW_EMBED)document.documentElement.classList.add('rbw-embedded');
// Only hand answers to a parent page we trust (the practice's own site, its Wix staging site, or the Wix editor preview).
const TRUSTED_PARENT=/^https:\/\/((www\.)?rainforestbodyworks\.com|rainforestbodyworks\.wixstudio\.com|rainforestbodyworks[a-z0-9-]*\.editor\.wix\.com)$/i;
function parentIsTrusted(){try{const anc=location.ancestorOrigins;if(anc&&anc.length)return TRUSTED_PARENT.test(anc[anc.length-1]);/* top-level page; Wix may wrap the embed in its own frame */if(document.referrer)return TRUSTED_PARENT.test(new URL(document.referrer).origin);}catch(e){}return false;}
const form=document.getElementById('intake');
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const names={visit:'Your visit',areas:'Focus areas',health:'Health & comfort',about:'About you',review:'Review'};
const goals={relax:'Rest & relaxation',relief:'Relief in specific areas',both:'A little of both'};
const conditions=['Recent cancer treatment','Fibromyalgia','Headaches / migraines','Arthritis','Diabetes','Heart attack / stroke','Kidney condition','Blood clots','Joint replacement','High / low blood pressure','Neuropathy','Numbness / tingling','Sprain / strain','Herniated disc','Liver condition','Blood-thinning medication','Sciatica','Current infection or skin concern','Another condition'];
const parts=['Head','Neck','Left shoulder','Right shoulder','Chest','Upper back','Mid back','Lower back','Abdomen','Lower abdomen','Left torso','Right torso','Left upper arm','Right upper arm','Left elbow','Right elbow','Left forearm','Right forearm','Left wrist','Right wrist','Left hand','Right hand','Left hip','Right hip','Left thigh','Right thigh','Left knee','Right knee','Left lower leg','Right lower leg','Left ankle','Right ankle','Left foot','Right foot'];
let step='visit',visited=new Set(['visit']),areas=[],areaId=0;
const markerColors=['#7952a1','#167e86','#b84f78','#b36c18','#3970bd'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=name=>new FormData(form).get(name)||'';
const route=()=>value('goal')==='relax'?['visit','health','about','review']:['visit','areas','health','about','review'];
$('#condition-list').innerHTML=conditions.map(c=>`<label class="check-row"><input type="checkbox" name="conditions" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('');
$('#area-select').innerHTML=parts.map(p=>`<option>${esc(p)}</option>`).join('');
const today=new Date();form.elements.dob.max=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
function error(message,el){$('#form-error').hidden=false;$('#form-error').textContent=message;if(el){el.focus();el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}return false;}
function show(id,focus=true){step=id;visited.add(id);$$('.step').forEach(s=>s.hidden=s.dataset.step!==id);$('#form-error').hidden=true;const r=route(),i=r.indexOf(id);$('#step-caption').textContent=`Step ${i+1} of ${r.length}`;$('#step-category').textContent=names[id];$('#progress-fill').style.width=`${(i+1)/r.length*100}%`;$('#back').hidden=i===0;$('#next').innerHTML=id==='review'?(RBW_EMBED?'Submit intake <span>✓</span>':'Finish preview <span>✓</span>'):'Continue <span>→</span>';$('#next-hint').textContent=id==='review'?(RBW_EMBED?'Sent privately to your therapist':'Nothing will be sent'):`Next: ${names[r[i+1]].toLowerCase()}`;$('#steps').innerHTML=r.map((s,n)=>`<li><button type="button" class="step-nav ${n<i?'done':''}" data-nav="${s}" ${visited.has(s)?'':'disabled'} ${s===id?'aria-current="step"':''}><span class="step-number">${n<i?'✓':n+1}</span><span>${names[s]}</span></button></li>`).join('');if(id==='review')renderReview();if(id==='areas')requestAnimationFrame(()=>{map.draw();map.introduce();});if(focus){const heading=$(`[data-step="${id}"] h2`);heading.focus({preventScroll:true});$('.form-shell').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}}
function conditional(){const toggles=[['health','health-details'],['medications','medication-details'],['recentMedicine','recent-details'],['allergies','allergy-details'],['pregnant','pregnancy-details']];for(const [name,id] of toggles){const visible=value(name)==='Yes',el=document.getElementById(id);el.hidden=!visible;el.querySelectorAll('input,textarea,select').forEach(input=>input.disabled=!visible);}$('#relax-note').hidden=value('goal')!=='relax';}
form.addEventListener('change',e=>{if(['goal','health','medications','recentMedicine','allergies','pregnant'].includes(e.target.name)){conditional();if(e.target.name==='goal')show('visit',false);}});
function validate(){if(step==='visit'){for(const name of ['goal','pressure'])if(!value(name))return error(name==='goal'?'Please choose your main goal.':'Please choose a pressure preference, or decide together.',form.querySelector(`[name="${name}"]`));}
 if(step==='areas'&&!areas.length){$('.list-alternative').open=true;return error('Please select at least one focus area. You can choose up to five.',$('#area-select'));}
 if(step==='health'){const messages={health:'Please tell us whether there are health details to share.',medications:'Please answer the medications question.',recentMedicine:'Please answer the ibuprofen or aspirin question.',allergies:'Please answer the allergies question.',pregnant:'Please answer the pregnancy question.'};for(const name of Object.keys(messages))if(!value(name))return error(messages[name],form.querySelector(`[name="${name}"]`));if(value('medications')==='Yes'&&!value('medicationList').trim())return error('List your medications, or select “Discuss privately.”',form.elements.medicationList);if(value('allergies')==='Yes'&&!value('allergyDetails').trim())return error('Tell us what to avoid, or select “Discuss privately.”',form.elements.allergyDetails);}
 if(step==='about'){if(!value('fullName').trim())return error('Please enter your full name.',form.elements.fullName);if(!value('email').trim()&&!value('phone').trim())return error('Please provide an email address or phone number.',form.elements.email);if(value('phone')&&value('phone').replace(/\D/g,'').length<7)return error('Please check the phone number.',form.elements.phone);}
 if(step==='review'){if(!form.elements.accuracy.checked)return error('Please confirm you’ve reviewed your answers.',form.elements.accuracy);if(!form.elements.policy.checked)return error('Please confirm you’ve read the appointment policy.',form.elements.policy);}
 for(const input of $(`[data-step="${step}"]`).querySelectorAll('input,select,textarea')){if(input.disabled||input.closest('[hidden]'))continue;if(!input.checkValidity())return error(input.validationMessage,input);}return true;
}
form.addEventListener('submit',e=>{e.preventDefault();if(!validate())return;const r=route();if(step==='review'){for(const s of r){show(s,false);if(!validate())return;}show('review',false);if(RBW_EMBED){submitToPractice();return;}form.hidden=true;$('#complete').hidden=false;$('#complete h2').focus();return;}show(r[r.indexOf(step)+1]);});
$('#back').onclick=()=>show(route()[route().indexOf(step)-1]);
$('#steps').onclick=e=>{const b=e.target.closest('[data-nav]');if(!b)return;const r=route();if(r.indexOf(b.dataset.nav)>r.indexOf(step)&&!validate())return;show(b.dataset.nav);};
$('#return-review').onclick=()=>{form.hidden=false;$('#complete').hidden=true;show('review');};
function addArea(item){if(areas.some(a=>a.part===item.part&&a.surface===item.surface&&Math.hypot(...a.anchor.map((v,i)=>v-item.anchor[i]))<.08)){$('#map-status').textContent='That spot is already selected. Add a note below it.';return;}if(areas.length>=5){$('#map-status').textContent='You’ve selected five areas. Remove one before adding another.';return;}const color=markerColors.find(c=>!areas.some(a=>a.color===c));areas.forEach(a=>a.expanded=false);areas.push({...item,color,expanded:true,id:++areaId,note:'',severity:''});$('#map-status').textContent=`Added ${item.part.toLowerCase()}, ${item.surface.toLowerCase()}.`;renderAreas();}
function moveArea(id,item,finished){const area=areas.find(a=>a.id===id);if(!area)return;Object.assign(area,item);const card=$(`[data-id="${id}"]`);if(card){card.querySelector('[data-area-name]').textContent=area.part;card.querySelector('[data-area-surface]').textContent=area.surface;card.querySelector('[data-remove]').setAttribute('aria-label',`Remove ${area.part}, ${area.surface}`);}map.setMarkers(areas);if(finished)$('#map-status').textContent=`Spot ${areas.indexOf(area)+1} moved to ${area.part.toLowerCase()}, ${area.surface.toLowerCase()}. Your note stays with it.`;}
const map=new IntakeBodyMap($('#body-canvas'),{onSelect:addArea,onMove:moveArea,onRotate:angle=>{$('#rotation').value=angle;$('#angle-value').textContent=angle+'°';const facing=angle<45||angle>=315?'Front':angle<135?'Left side':angle<225?'Back':'Right side';$('#body-facing').textContent=facing+' view';$$('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',Math.abs((Number(b.dataset.angle)-angle+540)%360-180)<10?'true':'false'));}});
$('#rotation').oninput=e=>map.rotate(Number(e.target.value),false);$$('[data-angle]').forEach(b=>b.onclick=()=>map.rotate(Number(b.dataset.angle)));
$('#add-area').onclick=()=>{const part=$('#area-select').value,surface=$('#surface-select').value;addArea({part,surface,anchor:map.anchorFor(part,surface)});};
$('#area-select').onchange=()=>{const part=$('#area-select').value;if(part.includes('torso'))$('#surface-select').value='Side';else if(part.includes('back'))$('#surface-select').value='Back';else if(['Chest','Abdomen','Lower abdomen'].includes(part))$('#surface-select').value='Front';};
function renderAreas(){const container=$('#area-cards');container.innerHTML=areas.map((a,i)=>`<details class="area-card" data-id="${a.id}" style="--marker-color:${a.color}" ${a.expanded?'open':''}><summary class="area-card-head"><span class="area-number" style="background:${a.color}">${i+1}</span><span><span data-area-name>${esc(a.part)}</span><small data-area-surface style="display:block;color:#9986a6;font-weight:400">${esc(a.surface)}</small></span><button type="button" class="remove-area" data-remove="${a.id}" aria-label="Remove ${esc(a.part)}, ${esc(a.surface)}">×</button></summary><div class="area-card-content"><label class="field">What do you feel? Please provide details. <span class="optional">Optional</span><textarea data-note="${a.id}" rows="2" maxlength="600" placeholder="What it feels like, how long, or what changes it.">${esc(a.note)}</textarea></label><div class="discomfort-field"><div id="rating-label-${a.id}">Discomfort level <span class="optional">Optional</span></div><div class="rating-stepper" role="group" aria-labelledby="rating-label-${a.id}"><button type="button" data-rating="${a.id}" data-delta="-1" aria-label="Decrease discomfort for spot ${i+1}" ${a.severity===1?'disabled':''}>‹</button><output data-severity="${a.id}" aria-live="polite">${a.severity?`${a.severity}<small> / 10</small>`:'<span class="rating-unset">Not set</span>'}</output><button type="button" data-rating="${a.id}" data-delta="1" aria-label="Increase discomfort for spot ${i+1}" ${a.severity===10?'disabled':''}>›</button></div><div class="rating-ends"><span>1 · Mild</span><span>10 · Worst imaginable</span></div><button type="button" class="clear-rating" data-clear-rating="${a.id}" ${a.severity?'':'hidden'}>Clear rating</button></div></div></details>`).join('');$('#empty-areas').hidden=areas.length>0;$('#area-count').textContent=`${areas.length} of 5 selected`;map.setMarkers(areas);}
$('#area-cards').addEventListener('input',e=>{const id=Number(e.target.dataset.note||e.target.dataset.severity),a=areas.find(a=>a.id===id);if(a){if(e.target.dataset.note)a.note=e.target.value;else a.severity=e.target.value;}});
$('#area-cards').onclick=e=>{const rating=e.target.closest('[data-rating],[data-clear-rating]');if(rating){const id=Number(rating.dataset.rating||rating.dataset.clearRating),a=areas.find(a=>a.id===id);if(!a)return;a.severity=rating.dataset.clearRating?'':a.severity?Math.max(1,Math.min(10,Number(a.severity)+Number(rating.dataset.delta))):1;const card=$(`[data-id="${id}"]`),output=card.querySelector('[data-severity]');output.innerHTML=a.severity?`${a.severity}<small> / 10</small>`:'<span class="rating-unset">Not set</span>';card.querySelector('[data-delta="-1"]').disabled=a.severity===1;card.querySelector('[data-delta="1"]').disabled=a.severity===10;card.querySelector('[data-clear-rating]').hidden=!a.severity;return;}const b=e.target.closest('[data-remove]');if(!b)return;e.preventDefault();e.stopPropagation();areas=areas.filter(a=>a.id!==Number(b.dataset.remove));renderAreas();$('#map-status').textContent='Area removed.';$('#add-area').focus();};
const row=(label,text)=>text?`<dt>${esc(label)}</dt><dd>${esc(text)}</dd>`:'';
const block=(title,id,contents)=>`<section class="review-block"><div class="review-head"><h3>${title}</h3><button type="button" class="edit-link" data-edit="${id}">Edit<span class="sr-only"> ${title}</span></button></div>${contents}</section>`;
function renderReview(){const data=new FormData(form),list=data.getAll('conditions');let html=block('Your visit','visit',`<dl>${row('Goal',goals[value('goal')])}${row('Pressure',value('pressure'))}${row('Visit notes',value('visitNotes'))}</dl>`);
 if(value('goal')!=='relax')html+=block('Focus areas','areas',`<ol class="review-areas">${areas.map(a=>`<li><strong>${esc(a.part)} · ${esc(a.surface)}</strong>${a.severity?`<br>Discomfort: ${esc(a.severity)} / 10`:''}${a.note?`<br>${esc(a.note)}`:''}</li>`).join('')}</ol>`);else html+=block('Focus areas','visit','<p class="hint">Skipped for a relaxation-only visit.</p>');
 html+=block('Health & comfort','health',`<dl>${row('Health details',value('health'))}${value('health')==='Yes'?row('Conditions',list.join(', '))+row('Other details',value('healthNotes')):''}${row('Medications',value('medications'))}${row('Medication list',value('medicationList'))}${row('Recent ibuprofen or aspirin',value('recentMedicine'))}${row('When / what was taken',value('recentDetails'))}${row('Allergies / sensitivities',value('allergies'))}${row('Avoid these ingredients',value('allergyDetails'))}${row('Pregnancy',value('pregnant'))}${row('Weeks',value('pregnancyWeeks'))}${row('Comfort / areas to avoid',value('comfort'))}${row('Previous deep-tissue massage',value('deepBefore'))}${row('Previous cupping',value('cuppingBefore'))}</dl>`);
 html+=block('About you','about',`<dl>${row('Full name',value('fullName'))}${row('Preferred name',value('preferredName'))}${row('Email',value('email'))}${row('Phone',value('phone'))}${row('Date of birth',value('dob'))}${row('Mailing address',[value('address'),value('city'),value('state'),value('zip')].filter(Boolean).join(', '))}${row('Occupation',value('occupation'))}${row('Referred by',value('referral'))}</dl>`);$('#review-content').innerHTML=html;
}
$('#review-content').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)show(b.dataset.edit);};
conditional();show('visit',false);




$('#area-cards').addEventListener('toggle',e=>{if(!e.target.matches('.area-card')||!e.target.isConnected)return;const a=areas.find(a=>a.id===Number(e.target.dataset.id));if(a)a.expanded=e.target.open;},true);

/* ===== v1.1 submission (embedded mode only) ===== */
function collectAnswers(){const fd=new FormData(form),o={};for(const [k,v] of fd.entries()){if(typeof v!=='string'||k==='conditions')continue;o[k]=v;}o.conditions=fd.getAll('conditions');o.accuracy=form.elements.accuracy.checked;o.policy=form.elements.policy.checked;return o;}
function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);}
function postToParent(payload){return new Promise((resolve,reject)=>{const nonce=Array.from(crypto.getRandomValues(new Uint32Array(3))).join('-');let timer;
 const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',onMsg);};
 function onMsg(e){if(e.source!==window.parent)return;const d=e.data||{};if(d.type!=='rbw-intake-receipt'||d.nonce!==nonce)return;cleanup();d.ok?resolve(d):reject({userMessage:d.message});}
 timer=setTimeout(()=>{cleanup();reject({userMessage:'The connection timed out. Your answers are still here, so please try again.'});},90000);
 window.addEventListener('message',onMsg);window.parent.postMessage({type:'rbw-intake-submit',nonce,payload},'*');});}
let sending=false;
async function submitToPractice(){
 if(sending)return;
 if(!parentIsTrusted())return error('This form can only be sent from the Rainforest Bodyworks website. Please open it there.');
 sending=true;const btn=$('#next');btn.disabled=true;btn.innerHTML='Sending securely…';$('#form-error').hidden=true;
 try{
  const bytes=await createIntakePdf({submitted:true,version:FORM_VERSION});
  const payload={formVersion:FORM_VERSION,submittedAt:new Date().toISOString(),answers:collectAnswers(),
   areas:value('goal')==='relax'?[]:areas.map(({part,surface,severity,note,color})=>({part,surface,severity:severity?Number(severity):null,note,color})),
   policyText:[...document.querySelectorAll('.policy-copy li')].map(li=>li.textContent.trim()),pdfBase64:toBase64(bytes)};
  const receipt=await postToParent(payload);
  window.rbwLastPdfBytes=bytes;
  form.hidden=true;$('#complete').hidden=false;
  $('#complete h2').textContent='Thank you. We’ve received your intake.';
  const ps=$('#complete').querySelectorAll('p');
  ps[0].innerHTML='Your therapist will review it before your visit. If anything changes, just let her know when you arrive.'+(receipt.reference?`<br><span class="receipt-ref">Reference ${esc(receipt.reference)}</span>`:'');
  ps[1].textContent='Your form was sent privately and isn’t stored in this browser.';
  $('#download-pdf').textContent='Save a copy for yourself';$('#return-review').hidden=true;
  $('#pdf-status').textContent='Optional: keep a copy of what you sent.';
  $('#complete h2').focus();
 }catch(err){console.error('RBW intake send failed:',err&&(err.message||err.userMessage));error((err&&err.userMessage)||'We couldn’t send your form just now. Your answers are still here. Please try again in a moment.');}
 finally{sending=false;btn.disabled=false;btn.innerHTML='Submit intake <span>✓</span>';}
}
// Parent → form messages: configuration (test mode banner) after the form says it's ready.
window.addEventListener('message',e=>{if(!RBW_EMBED||e.source!==window.parent)return;const d=e.data||{};if(d.type==='rbw-intake-config'){$('#test-banner').hidden=!d.testMode;}});
if(RBW_EMBED)window.parent.postMessage({type:'rbw-intake-ready',version:FORM_VERSION},'*');

