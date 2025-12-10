/* script.js - Verbali 15.23 Final (Preview, Absents, PDF Fixes) */

function applyConfig() {
    const nameEl = document.getElementById('sidebarSchoolName');
    const logoEl = document.getElementById('sidebarLogo');
    if (typeof SCHOOL_CONFIG !== 'undefined') {
        if(nameEl) nameEl.textContent = SCHOOL_CONFIG.nomeIstituto;
        if(logoEl) logoEl.src = SCHOOL_CONFIG.logoPath;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = SCHOOL_CONFIG.logoPath;
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const x = c.getContext('2d');
            x.drawImage(img, 0, 0);
            schoolLogoBase64 = c.toDataURL("image/png");
        };
    }
}

let appData = {
    type: 'consiglio',
    general: { seduta: '', scope: '', data: '', oraInizio: '', oraFine: '', presidente: '', segretario: '', titoloAgg: '', closingText: '' },
    participants: { docenti: { presenti: [], assenti: [] }, genitori: { presenti: [], assenti: [] } },
    agenda: [], minutes: {}, extra: { sintesi: '', decisioni: '', allegati: '' },
    labels: {}, hiddenFields: [],
    sections: { general: true, people: true, agenda: true, minutes: true, extra: true },
    customSections: []
};

let schoolLogoBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
    try { applyConfig(); } catch(e) { console.error("Config Error", e); }

    const raw = localStorage.getItem('verbale_v15_23'); 
    if (raw) {
        document.getElementById('typeModal').classList.add('hidden');
        try {
            const loaded = JSON.parse(raw);
            appData = { ...appData, ...loaded };
            if(!appData.sections) appData.sections = { general: true, people: true, agenda: true, minutes: true, extra: true };
            if(!appData.customSections) appData.customSections = [];
            restoreData();
        } catch(e) { console.error(e); }
    } else {
        document.getElementById('typeModal').classList.remove('hidden');
    }
    
    document.body.addEventListener('input', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            updateModel(e.target);
            saveData();
        }
    });
});

window.goToTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        el.classList.add('text-slate-500', 'hover:bg-slate-50');
    });
    const targetContent = document.getElementById(tabId);
    if(targetContent) targetContent.classList.add('active');
    const btn = document.getElementById(`nav-${tabId}`);
    if(btn) {
        btn.classList.remove('text-slate-500', 'hover:bg-slate-50');
        btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
    }
    if(tabId === 'minutes') renderMinutes();
    if(tabId === 'preview') renderPreview(); 
    if (window.innerWidth < 768) {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('mobileOverlay');
        if(sb) sb.classList.add('-translate-x-full');
        if(ov) { ov.classList.remove('opacity-100', 'pointer-events-auto'); ov.classList.add('opacity-0', 'pointer-events-none'); }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.closeSectionsModalAndNavigate = function() {
    document.getElementById('sections-modal').classList.add('hidden');
    const activeKeys = Object.keys(appData.sections).filter(k => appData.sections[k]);
    if(activeKeys.length > 0) goToTab(activeKeys[0]); 
    else if (appData.customSections.length > 0) goToTab(appData.customSections[0].id); 
    else goToTab('preview'); 
}

function showToast(m){const c=document.getElementById('toast-container');const t=document.createElement('div');t.className=`toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white text-slate-700 border-slate-200 min-w-[200px] z-[100]`;t.innerHTML=`<i class="ph ph-check-circle text-emerald-500 text-lg"></i> <span class="text-sm font-semibold">${m}</span>`;c.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(10px)';setTimeout(()=>t.remove(),300)},2500)}
function showConfirm(t,m){return new Promise(r=>{const el=document.getElementById('custom-modal');document.getElementById('modal-title').textContent=t;document.getElementById('modal-message').textContent=m;el.classList.remove('hidden');const c=v=>{el.classList.add('hidden');r(v)};const y=document.getElementById('modal-confirm'),n=document.getElementById('modal-cancel');const ny=y.cloneNode(true),nn=n.cloneNode(true);y.replaceWith(ny);n.replaceWith(nn);ny.onclick=()=>c(true);nn.onclick=()=>c(false)})}
function showEditModal(v){return new Promise(r=>{const el=document.getElementById('edit-modal'),i=document.getElementById('edit-input');i.value=v;el.classList.remove('hidden');setTimeout(()=>i.focus(),100);const c=x=>{el.classList.add('hidden');r(x)};const y=document.getElementById('edit-confirm'),n=document.getElementById('edit-cancel');const ny=y.cloneNode(true),nn=n.cloneNode(true);y.replaceWith(ny);n.replaceWith(nn);ny.onclick=()=>c(i.value);nn.onclick=()=>c(null);i.onkeydown=e=>{if(e.key==='Enter')c(i.value)}})}

window.handleEditLabel=async function(id){const l=document.getElementById(id);if(!l)return;const t=await showEditModal(l.innerText);if(t&&t!==l.innerText){l.innerText=t; appData.labels[id]=t; saveData(); showToast("Etichetta aggiornata");}}
window.handleHideField=async function(id){const e=document.getElementById(id);if(e){e.classList.add('field-hidden');if(!appData.hiddenFields.includes(id)){appData.hiddenFields.push(id);saveData();showToast("Campo nascosto"); updateRestoreButton();}}}
window.handleRestoreFields=async function(){if(await showConfirm("Ripristina","Resettare tutto?")){document.querySelectorAll('.field-hidden').forEach(e=>e.classList.remove('field-hidden'));appData.hiddenFields=[];appData.labels={};restoreData();saveData();showToast("Ripristinato")}}
window.handleFullReset=async function(){if(await showConfirm("Nuova Sessione","Cancellare tutto?")){localStorage.removeItem('verbale_v15_23');location.reload()}}
function updateRestoreButton(){const b=document.getElementById('restoreBtnContainer');if(b)(appData.hiddenFields.length>0||Object.keys(appData.labels).length>0)?(b.classList.remove('hidden'),b.classList.add('visible')):(b.classList.remove('visible'),b.classList.add('hidden'))}

window.openSectionsModal = function() { Object.keys(appData.sections).forEach(key => { const cb = document.getElementById(`toggle-${key}`); if(cb) cb.checked = appData.sections[key]; }); renderCustomSectionsList(); document.getElementById('sections-modal').classList.remove('hidden'); }
window.toggleSection = function(sectionKey) { const cb = document.getElementById(`toggle-${sectionKey}`); appData.sections[sectionKey] = cb.checked; syncNavVisibility(); saveData(); }
function syncNavVisibility() { Object.keys(appData.sections).forEach(k => { const navBtn = document.getElementById(`nav-${k}`); if(navBtn) (appData.sections[k]) ? navBtn.classList.remove('hidden') : navBtn.classList.add('hidden'); }); }

window.addCustomSection = function() {
    const titleInp = document.getElementById('new-section-title'); const typeInp = document.getElementById('new-section-type');
    const colorInp = document.getElementById('new-section-color'); const alignInp = document.getElementById('new-section-align');
    const sizeInp = document.getElementById('new-section-size'); const underlineInp = document.getElementById('new-section-underline');
    const title = titleInp.value.trim(); if(!title) return showToast("Inserisci un titolo");
    let content = ''; if(typeInp.value === 'list') content = []; if(typeInp.value === 'table') content = { cols: ['Voce', 'Dettaglio'], rows: [['', '']] };
    const newSec = { 
        id: 'cust_' + Date.now(), title: title, type: typeInp.value, content: content,
        style: { color: colorInp.value||'#000', align: alignInp.value||'left', size: sizeInp.value||'11', underline: underlineInp.checked||false }
    };
    appData.customSections.push(newSec); titleInp.value = '';
    renderCustomSectionsList(); renderCustomSectionsUI(); saveData(); showToast("Sezione Aggiunta");
}

window.removeCustomSection = async function(id) { if(await showConfirm("Elimina Sezione", "Sei sicuro?")){ appData.customSections = appData.customSections.filter(s => s.id !== id); renderCustomSectionsList(); renderCustomSectionsUI(); saveData(); } }

window.moveSection = function(id, direction) {
    const idx = appData.customSections.findIndex(s => s.id === id); if(idx < 0) return;
    if(direction === -1 && idx > 0) { [appData.customSections[idx], appData.customSections[idx-1]] = [appData.customSections[idx-1], appData.customSections[idx]]; } 
    else if(direction === 1 && idx < appData.customSections.length - 1) { [appData.customSections[idx], appData.customSections[idx+1]] = [appData.customSections[idx+1], appData.customSections[idx]]; }
    renderCustomSectionsList(); renderCustomSectionsUI(); saveData();
}

function renderCustomSectionsList() {
    const list = document.getElementById('custom-sections-list'); list.innerHTML = '';
    appData.customSections.forEach((s, idx) => {
        let icon = 'ph-text-t'; if(s.type==='list') icon='ph-list-checks'; if(s.type==='table') icon='ph-table';
        list.innerHTML += `<div class="flex items-center justify-between p-2 bg-orange-50/50 border border-orange-100 rounded-lg"><div class="flex items-center gap-2"><i class="ph ${icon} text-orange-400"></i><span class="text-sm font-bold text-slate-700" style="color:${s.style?.color||'#000'}">${s.title}</span></div><div class="flex gap-1">${idx > 0 ? `<button onclick="moveSection('${s.id}', -1)" class="p-1 text-slate-400 hover:text-slate-600"><i class="ph ph-caret-up"></i></button>` : ''}${idx < appData.customSections.length - 1 ? `<button onclick="moveSection('${s.id}', 1)" class="p-1 text-slate-400 hover:text-slate-600"><i class="ph ph-caret-down"></i></button>` : ''}<button onclick="removeCustomSection('${s.id}')" class="text-red-400 hover:text-red-600 p-1 ml-2"><i class="ph ph-trash"></i></button></div></div>`;
    });
}

window.formatDoc = function(cmd, value=null) {
    document.execCommand(cmd, false, value);
    const activeTab = document.querySelector('.tab-content.active');
    if(activeTab) { const editor = activeTab.querySelector('.rich-editor'); if(editor) { const secId = activeTab.id; const sec = appData.customSections.find(s => s.id === secId); if(sec) { sec.content = editor.innerHTML; saveData(); } } }
}

window.updateTableStructure = function(secId, action, idx, val) {
    const sec = appData.customSections.find(s => s.id === secId); if(!sec || sec.type !== 'table') return;
    if(action === 'addCol') { sec.content.cols.push('Nuova Colonna'); sec.content.rows.forEach(r => r.push('')); }
    else if(action === 'remCol') { if(sec.content.cols.length > 1) { sec.content.cols.splice(idx, 1); sec.content.rows.forEach(r => r.splice(idx, 1)); } }
    else if(action === 'editCol') { sec.content.cols[idx] = val; }
    else if(action === 'addRow') { sec.content.rows.push(new Array(sec.content.cols.length).fill('')); }
    else if(action === 'remRow') { sec.content.rows.splice(idx, 1); }
    else if(action === 'editCell') { const [rIdx, cIdx] = idx; sec.content.rows[rIdx][cIdx] = val; }
    renderCustomSectionsUI(); setTimeout(()=> { document.getElementById(secId).classList.add('active'); document.getElementById('nav-'+secId).classList.remove('text-slate-500', 'hover:bg-slate-50'); document.getElementById('nav-'+secId).classList.add('bg-white', 'text-slate-800', 'shadow-sm'); }, 50); saveData();
}

function renderCustomSectionsUI() {
    const navCont = document.getElementById('custom-nav-container'); const mainCont = document.getElementById('custom-sections-container');
    if(!navCont || !mainCont) return;
    navCont.innerHTML = ''; mainCont.innerHTML = '';
    if(appData.customSections.length > 0) navCont.classList.remove('hidden'); else navCont.classList.add('hidden');

    appData.customSections.forEach(s => {
        let icon = 'ph-text-t'; if(s.type==='list') icon='ph-list-checks'; if(s.type==='table') icon='ph-table';
        navCont.innerHTML += `<button onclick="goToTab('${s.id}')" id="nav-${s.id}" class="nav-btn group w-full flex items-center gap-4 px-5 py-3.5 text-sm font-bold rounded-2xl transition-all hover:bg-white text-slate-500 hover:text-slate-900 active:scale-95"><i class="ph ${icon} text-xl group-hover:scale-110 transition-transform text-orange-500"></i> ${s.title}</button>`;

        let contentHTML = '';
        if(s.type === 'text') {
            contentHTML = `
                <div class="mb-3 flex flex-wrap gap-1 p-2 bg-slate-100 rounded-xl border border-slate-200 items-center sticky top-0 z-10 shadow-sm">
                    <select onchange="formatDoc('fontName', this.value)" class="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"><option value="Arial">Arial</option><option value="Courier New">Courier</option><option value="Times New Roman">Times</option></select>
                    <select onchange="formatDoc('fontSize', this.value)" class="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none w-16"><option value="3">Norm</option><option value="5">Big</option><option value="1">Small</option></select>
                    <input type="color" onchange="formatDoc('foreColor', this.value)" class="h-8 w-8 p-0 border-0 rounded cursor-pointer" title="Colore Testo">
                    <div class="w-px h-6 bg-slate-300 mx-1"></div>
                    <button onclick="formatDoc('bold')" class="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50">B</button>
                    <button onclick="formatDoc('italic')" class="w-8 h-8 bg-white border border-slate-200 rounded-lg italic text-slate-700 hover:bg-slate-50">I</button>
                    <button onclick="formatDoc('underline')" class="w-8 h-8 bg-white border border-slate-200 rounded-lg underline text-slate-700 hover:bg-slate-50">U</button>
                    <div class="w-px h-6 bg-slate-300 mx-1"></div>
                    <button onclick="formatDoc('insertUnorderedList')" class="w-8 h-8 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"><i class="ph ph-list-bullets"></i></button>
                    <button onclick="formatDoc('insertOrderedList')" class="w-8 h-8 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"><i class="ph ph-list-numbers"></i></button>
                    <div class="flex-1"></div>
                    <button onclick="formatDoc('removeFormat')" class="px-2 h-8 bg-white border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50">Reset</button>
                </div>
                <div id="editor-${s.id}" class="rich-editor w-full p-6 rounded-[2rem] input-glass shadow-sm border border-slate-200 focus:border-orange-400 font-sans text-slate-800" contenteditable="true" oninput="saveRichText('${s.id}')">${s.content || ''}</div>`;
        } 
        else if (s.type === 'table') {
            contentHTML = `<div class="card-pro p-6 md:p-8 rounded-[2.5rem] overflow-x-auto"><div class="flex gap-2 mb-4"><button onclick="updateTableStructure('${s.id}', 'addCol')" class="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold">+ Colonna</button><button onclick="updateTableStructure('${s.id}', 'addRow')" class="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold">+ Riga</button></div><table class="w-full text-sm text-left border-collapse"><thead><tr>${s.content.cols.map((col, cIdx) => `<th class="p-2 border border-slate-200 bg-slate-50 min-w-[100px]"><div class="flex justify-between items-center"><input type="text" value="${col}" onchange="updateTableStructure('${s.id}', 'editCol', ${cIdx}, this.value)" class="bg-transparent font-bold w-full outline-none"><button onclick="updateTableStructure('${s.id}', 'remCol', ${cIdx})" class="text-red-400 hover:text-red-600 ml-1 text-xs">x</button></div></th>`).join('')}<th class="w-10"></th></tr></thead><tbody>${s.content.rows.map((row, rIdx) => `<tr>${row.map((cell, cIdx) => `<td class="p-2 border border-slate-200"><input type="text" value="${cell}" onchange="updateTableStructure('${s.id}', 'editCell', [${rIdx}, ${cIdx}], this.value)" class="w-full outline-none bg-transparent"></td>`).join('')}<td class="text-center"><button onclick="updateTableStructure('${s.id}', 'remRow', ${rIdx})" class="text-red-400 hover:text-red-600"><i class="ph ph-trash"></i></button></td></tr>`).join('')}</tbody></table></div>`;
        } 
        else {
            contentHTML = `<div class="card-pro p-6 md:p-8 rounded-[2.5rem]"><div class="flex gap-3 mb-6 bg-orange-50 p-2 rounded-xl"><input type="text" id="add-list-sub-${s.id}" class="flex-1 p-3 rounded-lg bg-white border border-orange-100 text-sm" placeholder="Azione / Punto..." onkeypress="if(event.key==='Enter') document.getElementById('add-list-note-${s.id}').focus()"><input type="text" id="add-list-note-${s.id}" class="flex-1 p-3 rounded-lg bg-white border border-orange-100 text-sm" placeholder="Esito / Responsabile..." onkeypress="if(event.key==='Enter') addListPoint('${s.id}')"><button onclick="addListPoint('${s.id}')" class="bg-orange-500 text-white px-4 rounded-lg font-bold hover:bg-orange-600 shadow-md">+</button></div><ul id="ul-${s.id}" class="space-y-2">${(s.content || []).map((item, idx) => `<li class="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 animate-fade-in shadow-sm"><span class="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold mt-1 shadow-sm">${idx+1}</span><input type="text" value="${item.sub || ''}" onchange="updateListPoint('${s.id}', ${idx}, 'sub', this.value)" class="flex-1 bg-transparent border-b border-transparent focus:border-orange-300 focus:bg-orange-50/50 outline-none transition-all px-2 py-1 text-sm font-medium text-slate-800" placeholder="Descrizione..."><input type="text" value="${item.note || ''}" onchange="updateListPoint('${s.id}', ${idx}, 'note', this.value)" class="flex-1 bg-transparent border-b border-transparent focus:border-orange-300 focus:bg-orange-50/50 outline-none transition-all px-2 py-1 text-sm text-slate-600" placeholder="Note..."><button onclick="removeListPoint('${s.id}', ${idx})" class="text-slate-300 hover:text-red-500 shrink-0"><i class="ph ph-trash"></i></button></li>`).join('')}</ul></div>`;
        }
        
        let titleStyle = '';
        if(s.style) {
            if(s.style.color) titleStyle += `color:${s.style.color};`;
            if(s.style.underline) titleStyle += `text-decoration:underline;`;
            if(s.style.size) { 
                let sz = '1.875rem'; 
                if(s.style.size == '10') sz = '1rem';
                if(s.style.size == '11') sz = '1.25rem';
                if(s.style.size == '14') sz = '1.5rem';
                if(s.style.size == '18') sz = '2.25rem';
                titleStyle += `font-size:${sz};`;
            }
        }
        mainCont.innerHTML += `<div id="${s.id}" class="tab-content max-w-4xl mx-auto pb-24"><header class="mb-8 flex justify-between items-center"><h2 class="font-black tracking-tight" style="${titleStyle}">${s.title}</h2><span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase">${s.type === 'table' ? 'Tabella' : (s.type === 'list' ? 'Piano Azioni' : 'Editor')}</span></header>${contentHTML}</div>`;
    });
}

window.saveRichText = function(secId) { const editor = document.getElementById('editor-' + secId); const sec = appData.customSections.find(s => s.id === secId); if(sec && editor) { sec.content = editor.innerHTML; saveData(); } }
window.addListPoint = function(secId) { const sub = document.getElementById(`add-list-sub-${secId}`); const note = document.getElementById(`add-list-note-${secId}`); if(!sub || !sub.value.trim()) return; const sec = appData.customSections.find(s => s.id === secId); if(sec) { if(!Array.isArray(sec.content)) sec.content = []; sec.content.push({ sub: sub.value.trim(), note: note.value.trim() }); sub.value = ''; note.value = ''; renderCustomSectionsUI(); setTimeout(()=> goToTab(secId), 50); saveData(); } }
window.updateListPoint = function(secId, idx, field, val) { const sec = appData.customSections.find(s => s.id === secId); if(sec && Array.isArray(sec.content)) { sec.content[idx][field] = val; saveData(); } }
window.removeListPoint = function(secId, idx) { const sec = appData.customSections.find(s => s.id === secId); if(sec && Array.isArray(sec.content)) { sec.content.splice(idx, 1); renderCustomSectionsUI(); setTimeout(()=> goToTab(secId), 50); saveData(); } }

window.selectType = function(type) {
    appData.type = type; document.getElementById('typeModal').classList.add('hidden');
    if (type === 'libero') { appData.sections = { general: false, people: false, agenda: false, minutes: false, extra: false }; openSectionsModal(); } 
    else { appData.sections = { general: true, people: true, agenda: true, minutes: true, extra: true }; }
    if(appData.general.closingText === undefined) appData.general.closingText = "La seduta è tolta alle ore {oraFine}. Letto, confermato e sottoscritto.";
    configureUIByType(); renderCustomSectionsUI(); syncNavVisibility(); saveData();
}

function configureUIByType() {
    const isDept = appData.type === 'dipartimento'; const isFree = appData.type === 'libero'; const badge = document.getElementById('typeBadge');
    if(badge) {
        if(isDept) { badge.textContent = 'Dipartimento'; badge.className = "mt-4 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold uppercase border border-teal-200"; } 
        else if (isFree) { badge.textContent = 'Verbale Libero'; badge.className = "mt-4 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-[10px] font-bold uppercase border border-orange-200"; } 
        else { badge.textContent = 'Consiglio di Classe'; badge.className = "mt-4 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold uppercase border border-indigo-200"; }
    }
    const btnManage = document.getElementById('btn-manage-sections'); if(btnManage) isFree ? btnManage.classList.remove('hidden') : btnManage.classList.add('hidden');
    const cardGenitori = document.getElementById('cardGenitori'); if(cardGenitori) (isDept || isFree) ? cardGenitori.classList.add('hidden') : cardGenitori.classList.remove('hidden');
    const cardDocenti = document.getElementById('cardDocenti'); if(cardDocenti) (isDept || isFree) ? cardDocenti.classList.add('xl:col-span-2') : cardDocenti.classList.remove('xl:col-span-2');
    const docHeader = document.getElementById('lbl-docenti-header'); if(docHeader) docHeader.innerText = isFree ? "Partecipanti" : "Docenti";
    const sigSection = document.getElementById('signatures-section'); if(sigSection) isDept ? sigSection.classList.add('hidden') : sigSection.classList.remove('hidden');
    const fieldTitolo = document.getElementById('field-titoloAgg'); if(fieldTitolo) (isDept || isFree) ? fieldTitolo.classList.remove('hidden') : fieldTitolo.classList.add('hidden');
    const lblScope = document.getElementById('lbl-scope'); if(lblScope && !appData.labels['lbl-scope']) lblScope.innerText = isFree ? 'Oggetto / Gruppo' : (isDept ? 'Materia / Dipartimento' : 'Classe / Sezione');
    const lblPres = document.getElementById('lbl-pres'); if(lblPres && !appData.labels['lbl-pres']) lblPres.innerText = isFree ? 'Presiede / Coordina' : (isDept ? 'Presidente' : 'Coordinatore');
    const lblSegr = document.getElementById('lbl-segr'); if(lblSegr && !appData.labels['lbl-segr'] && isFree) lblSegr.innerText = 'Verbalizzante';
    const closingEl = document.getElementById('closingText'); if(closingEl) closingEl.value = appData.general.closingText || '';
}

function updateModel(t){
    const id=t.id;
    if(id.startsWith('inp-cust_')) { return; }
    if(id in appData.general) appData.general[id]=t.value;
    else if(id==='numeroSeduta') appData.general.seduta=t.value;
    else if(id==='scopeValue') appData.general.scope=t.value;
    else if(id==='dataRiunione') appData.general.data=t.value;
    else if(id==='oraInizio') appData.general.oraInizio=t.value;
    else if(id==='oraFine') appData.general.oraFine=t.value;
    else if(id==='presidente') appData.general.presidente=t.value;
    else if(id==='segretario') appData.general.segretario=t.value;
    else if(id==='titoloAggiuntivo') appData.general.titoloAgg=t.value;
    else if(id==='closingText') appData.general.closingText=t.value;
    else if(id.startsWith('varie')) appData.extra[id.replace('varie','').toLowerCase()]=t.value;
    else if(id.startsWith('agenda-title-')){const x=appData.agenda.find(a=>a.id===id.replace('agenda-title-',''));if(x)x.title=t.value}
    else if(id.startsWith('agenda-desc-')){const x=appData.agenda.find(a=>a.id===id.replace('agenda-desc-',''));if(x)x.description=t.value}
    else if(id.startsWith('min-sintesi-')){const m=id.replace('min-sintesi-','');if(!appData.minutes[m])appData.minutes[m]={};appData.minutes[m].sintesi=t.value}
    else if(id.startsWith('min-decisioni-')){const m=id.replace('min-decisioni-','');if(!appData.minutes[m])appData.minutes[m]={};appData.minutes[m].decisioni=t.value}
}

function saveData(){localStorage.setItem('verbale_v15_19',JSON.stringify(appData))}

function restoreData(){
    configureUIByType(); renderCustomSectionsUI(); applyCustomizations(); syncNavVisibility();
    Object.keys(appData.general).forEach(k=>{
        let id=k;
        if(k==='seduta')id='numeroSeduta'; if(k==='scope')id='scopeValue'; if(k==='data')id='dataRiunione'; if(k==='titoloAgg')id='titoloAggiuntivo'; if(k==='closingText')id='closingText';
        const e=document.getElementById(id); if(e)e.value=appData.general[k]
    });
    if(appData.general.closingText === undefined) {
        appData.general.closingText = "La seduta è tolta alle ore {oraFine}. Letto, confermato e sottoscritto.";
        document.getElementById('closingText').value = appData.general.closingText;
    }
    document.getElementById('varieSintesi').value=appData.extra.sintesi||''; document.getElementById('varieDecisioni').value=appData.extra.decisioni||''; document.getElementById('varieAllegati').value=appData.extra.allegati||'';
    renderParticipants(); renderAgenda(); updateRestoreButton();
}

function applyCustomizations(){for(const[i,t]of Object.entries(appData.labels)){const e=document.getElementById(i);if(e)e.innerText=t}appData.hiddenFields.forEach(i=>{const e=document.getElementById(i);if(e)e.classList.add('field-hidden')})}
window.handleEnter=(e,f,...a)=>{if(e.key==='Enter')window[f](...a)}
window.addParticipant=(t,s)=>{const i=document.getElementById(`new${t==='docenti'?'Docente':'Genitore'}${s==='assenti'?'Assente':''}`);if(i&&i.value.trim()){appData.participants[t][s].push(i.value.trim());i.value='';renderParticipants();saveData()}}
window.removeParticipant=(t,s,i)=>{appData.participants[t][s].splice(i,1);renderParticipants();saveData()}
function renderParticipants(){['docenti','genitori'].forEach(t=>{['presenti','assenti'].forEach(s=>{const c=document.getElementById(`list-${t}-${s}`);if(!c)return;c.innerHTML='';const cl=s==='assenti'?'bg-red-50 text-red-700 border-red-100':(t==='docenti'?'bg-indigo-50 text-indigo-700 border-indigo-100':'bg-teal-50 text-teal-700 border-teal-100');appData.participants[t][s].forEach((n,i)=>{c.innerHTML+=`<div class="px-3 py-1.5 rounded-lg border ${cl} text-sm font-medium flex items-center gap-2 animate-fade-in">${n}<button onclick="removeParticipant('${t}','${s}',${i})" class="hover:text-red-900 font-bold ml-1 opacity-60 hover:opacity-100 transition-opacity">&times;</button></div>`})})})}
window.addAgendaItem=()=>{const id=Date.now().toString(36);appData.agenda.push({id,title:"",description:""});renderAgenda();saveData();checkEmptyAgenda()}
window.removeAgendaItem=async(id)=>{if(await showConfirm("Rimuovi","Eliminare?")){appData.agenda=appData.agenda.filter(x=>x.id!==id);delete appData.minutes[id];renderAgenda();saveData();checkEmptyAgenda()}}
function checkEmptyAgenda(){const e=document.getElementById('emptyAgendaMsg');if(e)e.style.display=appData.agenda.length===0?'flex':'none'}

function renderAgenda(){const c=document.getElementById('agendaContainer');if(!c)return;c.innerHTML='';appData.agenda.forEach((x,i)=>{c.innerHTML+=`<div class="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in"><div class="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-1 shadow-md">${i+1}</div><div class="flex-1 space-y-3"><input type="text" id="agenda-title-${x.id}" value="${x.title}" class="w-full font-bold text-lg bg-transparent border-b border-slate-300 focus:border-indigo-600 outline-none text-slate-800 placeholder-slate-400 pb-1 transition-colors" placeholder="Titolo..."><textarea id="agenda-desc-${x.id}" rows="2" class="w-full text-sm bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none text-slate-600 resize-y placeholder-slate-300 shadow-sm" placeholder="Note / Dettagli (saranno piccoli in stampa)...">${x.description}</textarea></div><button onclick="removeAgendaItem('${x.id}')" class="text-slate-300 hover:text-red-600 p-2 transition-colors bg-white hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"><i class="ph ph-trash text-xl"></i></button></div>`})}
function renderMinutes(){const c=document.getElementById('minutesContainer'); if(!c)return; c.innerHTML=''; if(appData.agenda.length===0){c.innerHTML='<div class="text-center text-slate-400 py-10">Definisci prima l\'Ordine del Giorno.</div>';return} appData.agenda.forEach((x,i)=>{const m = appData.minutes[x.id]||{sintesi:'',decisioni:''}; const deliberaId = `lbl-min-dec-${x.id}`; const deliberaLabel = appData.labels[deliberaId] || 'Delibera'; c.innerHTML+=`<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"><div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100"><span class="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 text-sm">Punto ${i+1}</span><h3 class="font-bold text-slate-800 text-lg">${x.title||'Senza titolo'}</h3></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="block text-xs font-bold uppercase text-slate-400 mb-2">Discussione</label><textarea id="min-sintesi-${x.id}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-48 input-glass text-sm leading-relaxed shadow-inner" placeholder="Sintesi...">${m.sintesi}</textarea></div><div><div class="flex items-center gap-2 mb-2"><label id="${deliberaId}" class="block text-xs font-bold uppercase text-slate-400">${deliberaLabel}</label><i class="ph ph-pencil-simple text-indigo-500 cursor-pointer hover:text-indigo-700" onclick="handleEditLabel('${deliberaId}')" title="Modifica etichetta"></i></div><textarea id="min-decisioni-${x.id}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-48 input-glass text-sm leading-relaxed shadow-inner" placeholder="Decisioni...">${m.decisioni}</textarea></div></div></div>`});}

// FIX: PREVIEW WITH ABSENTS (Same logic as PDF)
window.renderPreview = function() {
    const container = document.getElementById('preview-content'); if(!container) return;
    const isDept = appData.type === 'dipartimento'; const isFree = appData.type === 'libero';
    
    // Check Visibility
    const showGen = appData.sections.general; const showPeo = appData.sections.people; const showAge = appData.sections.agenda; const showMin = appData.sections.minutes; const showExt = appData.sections.extra;
    const isVisible = (id) => { const el = document.getElementById(id); return el && !el.classList.contains('hidden') && !el.classList.contains('field-hidden'); };
    const getLabel = (id) => document.getElementById(id)?.innerText || ''; const getVal = (id) => document.getElementById(id)?.value || '';

    let html = `<div class="flex items-start gap-6 border-b border-slate-800 pb-4 mb-6">`;
    if(schoolLogoBase64) html += `<img src="${schoolLogoBase64}" class="w-20 h-auto object-contain shrink-0">`;
    html += `<div class="flex-1 text-left pt-1"><h1 class="text-xl font-bold uppercase leading-tight">${SCHOOL_CONFIG.nomeIstituto}</h1><p class="text-xs text-slate-600 mt-1">${SCHOOL_CONFIG.rigaIndirizzo} - ${SCHOOL_CONFIG.rigaContatti}</p></div></div>`;

    if(showGen) {
        let mainTitle = 'VERBALE CONSIGLIO DI CLASSE'; if(isDept) mainTitle = 'VERBALE DI DIPARTIMENTO'; if(isFree) mainTitle = 'VERBALE DI RIUNIONE';
        html += `<div class="text-center mb-8"><h2 class="text-2xl font-bold uppercase mb-2">${mainTitle}</h2>${isVisible('field-scope') ? `<h3 class="text-xl font-bold uppercase my-2">${getLabel('lbl-scope')}: ${getVal('scopeValue').toUpperCase()}</h3>` : ''}${isVisible('field-titoloAgg') && getVal('titoloAggiuntivo') ? `<h3 class="text-lg font-bold uppercase my-2 text-slate-700">${getVal('titoloAggiuntivo').toUpperCase()}</h3>` : ''}${isVisible('field-seduta') ? `<p class="font-bold text-slate-500">Seduta N. ${getVal('numeroSeduta')}</p>` : ''}</div>`;
        let dateLine = []; if(isVisible('field-data') && getVal('dataRiunione')) dateLine.push(new Date(getVal('dataRiunione')).toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric'})); if(isVisible('field-start') && getVal('oraInizio')) dateLine.push(`dalle ${getVal('oraInizio')}`); if(isVisible('field-end') && getVal('oraFine')) dateLine.push(`alle ${getVal('oraFine')}`); if(dateLine.length) html += `<p class="text-center mb-8 font-medium">${dateLine.join(' ')}</p>`;
    }

    if(showPeo) {
        const labelPart = isFree ? "PARTECIPANTI" : (getLabel('lbl-sec-people') || 'PRESENTI'); html += `<div class="mb-6"><h4 class="font-bold text-sm uppercase mb-2 border-b border-slate-300 pb-1">${labelPart}</h4>`;
        
        // Presenti
        html += `<p class="mb-1"><strong>${isFree ? "Presenti:" : "Docenti:"}</strong> ${appData.participants.docenti.presenti.join(', ') || 'Nessuno'}</p>`;
        
        // Assenti (Docenti)
        if(appData.participants.docenti.assenti.length > 0) {
            html += `<p class="mb-1 text-slate-500"><strong>Assenti:</strong> ${appData.participants.docenti.assenti.join(', ')}</p>`;
        }
        
        if(!isDept && !isFree) { 
            html += `<p class="mt-2"><strong>Genitori:</strong> ${appData.participants.genitori.presenti.join(', ') || 'Nessuno'}</p>`;
            // Assenti (Genitori)
            if(appData.participants.genitori.assenti.length > 0) {
                html += `<p class="mb-1 text-slate-500"><strong>Assenti:</strong> ${appData.participants.genitori.assenti.join(', ')}</p>`;
            }
        }
        html += `</div>`;
    }

    if(showAge) {
        html += `<div class="mb-6"><h4 class="font-bold text-sm uppercase mb-2 border-b border-slate-300 pb-1">${getLabel('lbl-sec-agenda') || 'ORDINE DEL GIORNO'}</h4><ol class="list-decimal pl-5 space-y-1">`; appData.agenda.forEach(a => { html += `<li><span class="font-bold">${a.title}</span>`; if(a.description) html += `<br><span class="italic text-xs text-slate-500">${a.description}</span>`; html += `</li>`; }); html += `</ol></div>`;
    }

    if(showMin) {
        html += `<div class="mb-6"><h4 class="font-bold text-sm uppercase mb-2 border-b border-slate-300 pb-1">${getLabel('lbl-sec-minutes') || 'SVOLGIMENTO'}</h4>`; appData.agenda.forEach((a, i) => { const m = appData.minutes[a.id] || {}; const labelText = appData.labels[`lbl-min-dec-${a.id}`] || 'Delibera'; html += `<div class="mb-4"><p class="font-bold bg-slate-100 p-1 mb-1">${i+1}. ${a.title}</p>`; if(m.sintesi) html += `<p class="text-justify mb-1 text-sm">${m.sintesi}</p>`; if(m.decisioni) html += `<p class="font-bold text-sm">${labelText}: <span class="font-normal">${m.decisioni}</span></p>`; html += `</div>`; }); html += `</div>`;
    }

    if(showExt) {
        const hasVarie = (appData.extra.sintesi || appData.extra.decisioni || appData.extra.allegati) && isVisible('field-varie-sint');
        if(hasVarie) { html += `<div class="mb-6"><h4 class="font-bold text-sm uppercase mb-2 border-b border-slate-300 pb-1">${getLabel('lbl-sec-extra') || 'VARIE ED EVENTUALI'}</h4>`; if(appData.extra.sintesi) html += `<p class="text-justify mb-2 text-sm">${appData.extra.sintesi}</p>`; if(appData.extra.decisioni) html += `<p class="font-bold mb-2 text-sm">Decisioni: ${appData.extra.decisioni}</p>`; if(appData.extra.allegati) html += `<p class="italic text-sm">Allegati: ${appData.extra.allegati}</p>`; html += `</div>`; }
    }

    appData.customSections.forEach(s => {
        let titleStyle = '';
        if(s.style) {
            if(s.style.color) titleStyle += `color:${s.style.color};`;
            if(s.style.underline) titleStyle += `text-decoration:underline;`;
            if(s.style.size) { // UI approximation
                let sz = '1.1rem'; 
                if(s.style.size == '10') sz = '0.9rem';
                if(s.style.size == '14') sz = '1.3rem';
                if(s.style.size == '18') sz = '1.6rem';
                titleStyle += `font-size:${sz};`;
            }
            if(s.style.align) titleStyle += `text-align:${s.style.align};`;
        }

        html += `<div class="mb-6"><h4 class="font-bold text-sm uppercase mb-2 border-b border-slate-300 pb-1" style="${titleStyle}">${s.title}</h4>`;
        if(s.type === 'text') { 
            // PREVIEW RICH TEXT (HTML is safe here)
            html += `<div class="text-justify text-sm rich-content">${s.content || ''}</div>`; 
        } 
        else if (s.type === 'table') {
            html += `<table class="w-full text-sm border-collapse mb-2 border border-slate-300"><thead><tr class="bg-slate-100">${s.content.cols.map(c=>`<th class="border border-slate-300 p-1">${c}</th>`).join('')}</tr></thead><tbody>${s.content.rows.map(r=>`<tr>${r.map(c=>`<td class="border border-slate-300 p-1">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        }
        else { 
            html += `<ul class="space-y-1 text-sm pl-4 list-disc">`; (s.content || []).forEach(li => html += `<li><span class="font-bold">${li.sub || '...'}</span>: ${li.note || ''}</li>`); html += `</ul>`; 
        }
        html += `</div>`;
    });

    if(showGen) {
        if(appData.general.closingText && appData.general.closingText.trim() !== "") {
            const closingTxt = appData.general.closingText.replace('{oraFine}', getVal('oraFine') || '...');
            html += `<p class="mt-8 mb-16 text-sm">${closingTxt}</p>`;
        }
        
        if(isDept) { html += `<h4 class="font-bold text-sm uppercase mb-4">FIRME DOCENTI:</h4><div class="space-y-4">`; appData.participants.docenti.presenti.forEach(d => html += `<div class="flex justify-between border-b border-slate-300 pb-1 text-sm"><span>${d}</span><span class="w-32"></span></div>`); html += `</div>`; } else { if(isVisible('field-pres') || isVisible('field-segr')) { html += `<div class="flex justify-between mt-10 px-10 text-sm"><div class="text-center font-bold">IL ${getLabel('lbl-segr').toUpperCase()}<br><br><span class="font-normal">${getVal('segretario')}</span></div><div class="text-center font-bold">IL ${getLabel('lbl-pres').toUpperCase()}<br><br><span class="font-normal">${getVal('presidente')}</span></div></div>`; } }
    }
    container.innerHTML = html;
}

// --- PDF STAMPA (Official Logic) ---
window.stampaVerbale = async function() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const MARGIN = 20; const PAGE_W = doc.internal.pageSize.width; const PAGE_H = doc.internal.pageSize.height;
    const PRINT_WIDTH = PAGE_W - (MARGIN * 2);
    let cursorY = 15; 
    
    const checkPage = (h) => { if (cursorY + h > PAGE_H - MARGIN) { doc.addPage(); cursorY = 20; } };
    const isVisible = (id) => { const el = document.getElementById(id); return el && !el.classList.contains('hidden') && !el.classList.contains('field-hidden'); };
    const getLabel = (id) => document.getElementById(id)?.innerText || ''; const getVal = (id) => document.getElementById(id.replace('field-','').replace('seduta','numeroSeduta').replace('scope','scopeValue').replace('data','dataRiunione').replace('start','oraInizio').replace('end','oraFine').replace('titoloAgg','titoloAggiuntivo'))?.value || '';
    const showGen = appData.sections.general; const showPeo = appData.sections.people; const showAge = appData.sections.agenda; const showMin = appData.sections.minutes; const showExt = appData.sections.extra;

    // Header
    if(schoolLogoBase64) { const p = doc.getImageProperties(schoolLogoBase64); const r = Math.min(25/p.width, 25/p.height); doc.addImage(schoolLogoBase64, 'PNG', MARGIN, cursorY, p.width*r, p.height*r); }
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(SCHOOL_CONFIG.nomeIstituto, MARGIN + 30, cursorY + 6);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text(SCHOOL_CONFIG.rigaIndirizzo, MARGIN + 30, cursorY + 12); doc.text(SCHOOL_CONFIG.rigaContatti, MARGIN + 30, cursorY + 16);
    cursorY += 30; doc.setLineWidth(0.5); doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY); cursorY += 15;

    // Standard Sections
    if(showGen) {
        let typeV = 'VERBALE CONSIGLIO DI CLASSE'; if(appData.type === 'dipartimento') typeV = 'VERBALE DI DIPARTIMENTO'; if(appData.type === 'libero') typeV = 'VERBALE DI RIUNIONE';
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text(typeV, PAGE_W/2, cursorY, {align: "center"}); cursorY += 10;
        if(isVisible('field-scope')) { doc.setFontSize(16); doc.text(`${getLabel('lbl-scope').toUpperCase()}: ${getVal('scopeValue').toUpperCase()}`, PAGE_W/2, cursorY, {align: "center"}); cursorY += 10; }
        if(isVisible('field-titoloAgg') && getVal('titoloAggiuntivo')) { doc.setFontSize(14); doc.text(getVal('titoloAggiuntivo').toUpperCase(), PAGE_W/2, cursorY, {align: "center"}); cursorY += 10; }
        if(isVisible('field-seduta')) { doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Seduta N. ${getVal('numeroSeduta') || '___'}`, PAGE_W/2, cursorY, {align: "center"}); cursorY += 8; }
        doc.setFontSize(11); let info = []; if(isVisible('field-data') && appData.general.data) info.push(new Date(appData.general.data).toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric'})); if(isVisible('field-start') && appData.general.oraInizio) info.push(`dalle ${appData.general.oraInizio}`); if(isVisible('field-end') && appData.general.oraFine) info.push(`alle ${appData.general.oraFine}`); if(info.length > 0) { doc.text(info.join(" "), PAGE_W/2, cursorY, {align: "center"}); cursorY += 15; } else { cursorY += 5; }
    }

    if(showPeo) {
        const lp = appData.type === 'libero' ? "PARTECIPANTI" : (getLabel('lbl-sec-people')||"PRESENTI"); doc.setFont("helvetica", "bold"); doc.text(lp.toUpperCase() + ":", MARGIN, cursorY); cursorY += 6; doc.setFont("helvetica", "normal");
        const ld = appData.type === 'libero' ? "Presenti: " : "Docenti: "; const dTxt = ld + (appData.participants.docenti.presenti.join(", ") || "Nessuno"); const dL = doc.splitTextToSize(dTxt, PAGE_W - (MARGIN*2)); doc.text(dL, MARGIN, cursorY); cursorY += (dL.length * 5) + 3;
        
        // FIX: Add Absents to PDF
        if(appData.participants.docenti.assenti.length > 0) {
            const daTxt = "Assenti: " + appData.participants.docenti.assenti.join(", ");
            const daL = doc.splitTextToSize(daTxt, PAGE_W - (MARGIN*2));
            checkPage(daL.length * 5);
            doc.text(daL, MARGIN, cursorY);
            cursorY += (daL.length * 5) + 3;
        }

        if(appData.type !== 'dipartimento' && appData.type !== 'libero') { 
            const gTxt = "Genitori: " + (appData.participants.genitori.presenti.join(", ") || "Nessuno"); const gL = doc.splitTextToSize(gTxt, PAGE_W - (MARGIN*2)); doc.text(gL, MARGIN, cursorY); cursorY += (gL.length * 5) + 3;
            if(appData.participants.genitori.assenti.length > 0) {
                const gaTxt = "Assenti: " + appData.participants.genitori.assenti.join(", ");
                const gaL = doc.splitTextToSize(gaTxt, PAGE_W - (MARGIN*2));
                checkPage(gaL.length * 5);
                doc.text(gaL, MARGIN, cursorY);
                cursorY += (gaL.length * 5) + 3;
            }
        } 
        cursorY += 5;
    }
    
    if(showAge) { checkPage(20); doc.setFont("helvetica", "bold"); doc.text((getLabel('lbl-sec-agenda')||"ORDINE DEL GIORNO").toUpperCase() + ":", MARGIN, cursorY); cursorY += 6; doc.setFont("helvetica", "normal"); appData.agenda.forEach((x, i) => { checkPage(12); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`${i+1}. ${x.title}`, MARGIN + 5, cursorY); cursorY += 5; if(x.description) { doc.setFont("helvetica", "italic"); doc.setFontSize(9); const dL = doc.splitTextToSize(x.description, PAGE_W - (MARGIN*2) - 10); doc.text(dL, MARGIN + 10, cursorY); cursorY += (dL.length * 4) + 2; } else { cursorY += 2; } }); cursorY += 8; }
    if(showMin) { appData.agenda.forEach((x, i) => { const m = appData.minutes[x.id] || {}; checkPage(30); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`${i+1}. ${x.title}`, MARGIN, cursorY); cursorY += 6; doc.setFont("helvetica", "normal"); if(m.sintesi) { const l = doc.splitTextToSize(m.sintesi, PAGE_W - (MARGIN*2)); checkPage(l.length * 5); doc.text(l, MARGIN, cursorY); cursorY += (l.length * 5) + 4; } if(m.decisioni) { checkPage(20); const lT = appData.labels[`lbl-min-dec-${x.id}`] || 'Delibera'; doc.setFont("helvetica", "bold"); doc.text(lT + ":", MARGIN, cursorY); cursorY += 5; doc.setFont("helvetica", "normal"); const l = doc.splitTextToSize(m.decisioni, PAGE_W - (MARGIN*2)); checkPage(l.length * 5); doc.text(l, MARGIN, cursorY); cursorY += (l.length * 5) + 6; } cursorY += 2; }); }
    if(showExt) { const hasS = isVisible('field-varie-sint') && appData.extra.sintesi.trim().length > 0; const hasD = isVisible('field-varie-dec') && appData.extra.decisioni.trim().length > 0; const hasA = isVisible('field-allegati') && appData.extra.allegati.trim().length > 0; if(hasS || hasD || hasA) { checkPage(20); doc.setFont("helvetica", "bold"); doc.text((getLabel('lbl-sec-extra')||"VARIE ED EVENTUALI").toUpperCase() + ":", MARGIN, cursorY); cursorY += 7; doc.setFont("helvetica", "normal"); if(hasS) { const l = doc.splitTextToSize(appData.extra.sintesi, PAGE_W - (MARGIN*2)); checkPage(l.length * 5); doc.text(l, MARGIN, cursorY); cursorY += (l.length * 5) + 5; } } }

    for (const s of appData.customSections) {
        checkPage(30); doc.setFontSize(11); 
        
        // TITLE STYLE IN PDF
        doc.setFont("helvetica", "bold");
        if(s.style?.color) doc.setTextColor(s.style.color); else doc.setTextColor(0,0,0);
        let titleSize = s.style?.size ? parseInt(s.style.size) : 11;
        doc.setFontSize(titleSize);

        let titleX = MARGIN;
        let titleAlign = "left";
        if(s.style?.align === 'center') { titleX = PAGE_W / 2; titleAlign = "center"; }
        if(s.style?.align === 'right') { titleX = PAGE_W - MARGIN; titleAlign = "right"; }
        
        doc.text(s.title.toUpperCase(), titleX, cursorY, {align: titleAlign});
        
        if(s.style?.underline) {
            const textWidth = doc.getTextWidth(s.title.toUpperCase());
            let lineStart = MARGIN;
            if(s.style.align === 'center') lineStart = (PAGE_W - textWidth) / 2;
            if(s.style.align === 'right') lineStart = PAGE_W - MARGIN - textWidth;
            doc.setLineWidth(0.5);
            doc.line(lineStart, cursorY + 1, lineStart + textWidth, cursorY + 1);
        }
        
        doc.setTextColor(0,0,0); 
        cursorY += (titleSize * 0.5); 
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11); 

        if (s.type === 'text') {
            const container = document.getElementById('pdf-offscreen-renderer');
            if (!s.content || s.content.trim() === '') { cursorY += 5; continue; }
            container.innerHTML = s.content;
            
            try {
                const canvas = await html2canvas(container, { scale: 2, width: 600, windowWidth: 800 });
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * PRINT_WIDTH) / canvas.width;
                
                checkPage(imgHeight);
                doc.addImage(imgData, 'PNG', MARGIN, cursorY, PRINT_WIDTH, imgHeight);
                cursorY += imgHeight + 4; 
            } catch (e) {
                console.error("Canvas error", e);
            }
            container.innerHTML = '';
        } 
        else if (s.type === 'table') {
            const colWidth = PRINT_WIDTH / s.content.cols.length;
            doc.setFont("helvetica", "bold"); doc.setFillColor(240, 240, 240);
            doc.rect(MARGIN, cursorY, PRINT_WIDTH, 8, 'F');
            s.content.cols.forEach((c, idx) => { doc.text(c, MARGIN + (idx * colWidth) + 2, cursorY + 5); });
            cursorY += 8; doc.setFont("helvetica", "normal");
            s.content.rows.forEach(row => {
                let maxH = 0;
                const cellTexts = row.map(cell => { const lines = doc.splitTextToSize(cell, colWidth - 4); const h = lines.length * 5 + 4; if(h > maxH) maxH = h; return lines; });
                checkPage(maxH);
                row.forEach((_, idx) => { doc.rect(MARGIN + (idx * colWidth), cursorY, colWidth, maxH); doc.text(cellTexts[idx], MARGIN + (idx * colWidth) + 2, cursorY + 5); });
                cursorY += maxH;
            });
            cursorY += 5;
        } 
        else if (s.type === 'list' && Array.isArray(s.content)) {
            s.content.forEach(li => { const txt = `• ${li.sub || '...'}: ${li.note || ''}`; const l = doc.splitTextToSize(txt, PRINT_WIDTH); checkPage(l.length * 5); doc.text(l, MARGIN, cursorY); cursorY += (l.length * 5) + 2; }); cursorY += 5;
        }
    }

    if(showGen) {
        cursorY += 10; checkPage(20);
        if(appData.general.closingText && appData.general.closingText.trim() !== "") {
            const closingTxt = appData.general.closingText.replace('{oraFine}', getVal('oraFine') || '...');
            doc.text(closingTxt, MARGIN, cursorY); cursorY += 20; 
        }
        checkPage(50);
        if(appData.type === 'dipartimento') {
            cursorY += 10; doc.setFont("helvetica", "bold"); doc.text("DOCENTI PRESENTI (Firma):", MARGIN, cursorY); cursorY += 10; doc.setFont("helvetica", "normal");
            appData.participants.docenti.presenti.forEach(d => { checkPage(15); doc.text(d, MARGIN, cursorY); doc.setLineWidth(0.1); doc.line(PAGE_W - MARGIN - 70, cursorY, PAGE_W - MARGIN, cursorY); cursorY += 12; });
        } else {
            if(isVisible('field-pres') || isVisible('field-segr')) { const cL = MARGIN + 20; const cR = PAGE_W - MARGIN - 60; doc.setFont("helvetica", "bold"); if(isVisible('field-segr')) doc.text("IL " + getLabel('lbl-segr').toUpperCase(), cL, cursorY); if(isVisible('field-pres')) doc.text("IL " + getLabel('lbl-pres').toUpperCase(), cR, cursorY); cursorY += 15; doc.setFont("helvetica", "normal"); if(isVisible('field-segr')) doc.text(appData.general.segretario || '', cL, cursorY); if(isVisible('field-pres')) doc.text(appData.general.presidente || '', cR, cursorY); }
        }
    }
    doc.save(`Verbale_${appData.general.seduta || 'Draft'}.pdf`);
}
