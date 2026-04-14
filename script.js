/* ── DATA: Real WH25 machines and supervisors ── */
const USERS = [
    {name:'Admin (WH25)',username:'admin',password:'admin123',role:'admin'},
    {name:'Justus Magata',username:'justus',password:'sup123',role:'supervisor',machines:['MCH-444','MCH-409','MCH-408'],initials:'JM',color:'av-p'},
    {name:'Samson Onyimbo',username:'samson',password:'sup123',role:'supervisor',machines:['MCH-444','MCH-409','MCH-408'],initials:'SO',color:'av-b'},
    {name:'Daniel Musango',username:'dmusango',password:'sup123',role:'supervisor',machines:['MCH-444','MCH-409','MCH-408'],initials:'DM',color:'av-a'},
];

const MACHINES = [
    {id:'MCH-444',name:'Machine 444',desc:'Armouring',status:'ok'},
    {id:'MCH-409',name:'Machine 409',desc:'Layup / Twisting',status:'ok'},
    {id:'MCH-408',name:'Machine 408',desc:'Insulation / Extrusion',status:'ok'},
    {id:'MCH-87',name:'Machine 87',desc:'Extrusion',status:'ok'},
    {id:'MCH-88',name:'Machine 88',desc:'Extrusion',status:'ok'},
    {id:'MCH-89',name:'Machine 89',desc:'Amouring',status:'ok'},
    {id:'MCH-90',name:'Machine 90',desc:'Amouring',status:'ok'},
    {id:'MCH-104',name:'Machine 104',desc:'Stranding',status:'ok'},
    {id:'MCH-113',name:'Machine 113',desc:'Tubular',status:'ok'},
    {id:'MCH-115',name:'Machine 115',desc:'Tubular',status:'ok'},
    {id:'MCH-116',name:'Machine 116',desc:'Tubular',status:'ok'},
    {id:'MCH-115',name:'Machine 155',desc:'Tubular',status:'ok'},
    {id:'MCH-207',name:'Machine 207',desc:'Amouring',status:'ok'},
    {id:'MCH-375',name:'Machine 375',desc:'Extrusion',status:'ok'},
    {id:'MCH-492',name:'Machine 492',desc:'Stranding',status:'ok'},
];

// 5 performance fields (from the spreadsheet columns)
const FIELDS = ['Planned (m)','Duration (hrs)','Actual (m)','% Completion','Plan Efficiency'];
const FIELD_KEYS = ['plan','dur','actual','pct','eff'];
const FIELD_COLORS = ['#60a5fa','#a78bfa','#22d3a0','#f59e0b','#f87171'];

/* ── STORAGE ── */
function save(k,v){try{localStorage.setItem('wh25_'+k,JSON.stringify(v))}catch(e){}}
function load(k,def){try{const v=localStorage.getItem('wh25_'+k);return v?JSON.parse(v):def}catch(e){return def}}

/* ── SEED DATA: pulled from real spreadsheet entries ── */
function initSeeds(){
    if(load('seeded',false)) return;

    // Machine 444 — Armouring
    const runs444=[ /* ... data ... */ ];
    save('log_MCH-444',runs444);

    // Machine 409 — Layup
    const runs409=[ /* ... data ... */ ];
    save('log_MCH-409',runs409);

    // Machine 408 — Insulation
    const runs408=[ /* ... data ... */ ];
    save('log_MCH-408',runs408);

    // Display tasks seeded from real sheet data
    const tasks=[ /* ... data ... */ ];
    save('tasks',tasks);
    save('seeded',true);
}

function rnd(a,b){return Math.round((Math.random()*(b-a)+a)*10)/10}
function fieldColor(val,field){
    // For % completion and plan efficiency — color by threshold
    if(field==='pct'||field==='eff'){
        if(val>=90)return'#22d3a0';
        if(val>=60)return'#f59e0b';
        return'#f87171';
    }
    return '#60a5fa';
}

/* ── AUTH ── */
let currentUser=null,trendChart=null,fleetChart=null;

function doLogin(){
    const u=document.getElementById('l-user').value.trim().toLowerCase();
    const p=document.getElementById('l-pass').value.trim();
    const user=USERS.find(x=>x.username===u&&x.password===p);
    if(!user){document.getElementById('l-err').classList.remove('hidden');return;}
    currentUser=user;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('l-err').classList.add('hidden');
    setupForRole();
}

function doLogout(){
    currentUser=null;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('l-user').value='';document.getElementById('l-pass').value='';
}

function setupForRole(){
    const badge=document.getElementById('role-badge');
    const adminBtn=document.getElementById('nb-admin');
    document.getElementById('topbar-user').textContent=currentUser.name;
    if(currentUser.role==='admin'){
        badge.textContent='admin';badge.className='role-badge rb-admin';
        adminBtn.classList.remove('hidden');showView('admin');
    } else if(currentUser.role==='supervisor'){
        badge.textContent='supervisor';badge.className='role-badge rb-tester';
        adminBtn.classList.remove('hidden');showView('tester');
    } else {
        badge.textContent='operator';badge.className='role-badge rb-tester';
        adminBtn.classList.add('hidden');showView('tester');
    }
    populateMachSel();populateTaskMachSel();
}

function showView(v){
    ['tester','admin','display'].forEach(x=>{
        document.getElementById('view-'+x).classList.toggle('hidden',x!==v);
        const btn=document.getElementById('nb-'+x);
        if(btn)btn.classList.toggle('active',x===v);
    });
    if(v==='tester')loadMachine();
    if(v==='admin')renderAdmin();
    if(v==='display')renderDisplay();
}

/* ── MACHINE SELECTOR ── */
function populateMachSel(){
    const sel=document.getElementById('mach-sel');
    sel.innerHTML='';
    const machines=(currentUser.role==='admin'||currentUser.role==='supervisor')?MACHINES:MACHINES.filter(m=>currentUser.machines&&currentUser.machines.includes(m.id));
    machines.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name+' — '+m.desc;sel.appendChild(o);});
}
function populateTaskMachSel(){
    const sel=document.getElementById('t-mach');
    sel.innerHTML='';
    MACHINES.forEach(m=>{const o=document.createElement('option');o.value=m.name+' ('+m.desc.split('/')[0].trim().slice(0,3).toUpperCase()+')';o.textContent=o.value;sel.appendChild(o);});
}

/* ── SUPERVISOR VIEW ── */
function getLatestEntry(mid){const logs=load('log_'+mid,[]);return logs.length?logs[logs.length-1]:null;}

function calcEff(entry){
    if(!entry.plan||entry.plan===0)return 0;
    return Math.round((entry.actual/entry.plan)*100*10)/10;
}

function loadMachine(){
    const mid=document.getElementById('mach-sel').value;
    if(!mid)return;
    const mach=MACHINES.find(m=>m.id===mid);
    document.getElementById('mach-title').textContent=mach.name+' — '+mach.desc;
    const dot=document.getElementById('mach-sdot');
    const txt=document.getElementById('mach-stxt');
    dot.className='sdot '+(mach.status==='ok'?'s-ok':mach.status==='warn'?'s-warn':'s-err');
    txt.textContent=mach.status==='ok'?'Operational':mach.status==='warn'?'Warning':'Fault';

    const latest=getLatestEntry(mid);
    document.getElementById('mach-last').textContent=latest?'Last: '+latest.date+' — '+latest.wip:'No entries yet';

    const eff=latest?calcEff(latest):0;
    const vals={
        plan:latest?latest.plan:0,
        dur:latest?latest.dur:0,
        actual:latest?latest.actual:0,
        pct:latest?Math.round(latest.pct*10)/10:0,
        eff:eff
    };

    const labels=['Planned (m)','Duration','Actual (m)','% Complete','Plan Eff.'];
    const mg=document.getElementById('tester-metrics');
    mg.innerHTML='';
    FIELD_KEYS.forEach((k,i)=>{
        const v=vals[k];
        const isPct=(k==='pct'||k==='eff');
        const barPct=isPct?Math.min(v,100):0;
        const c=fieldColor(v,k);
        const display=isPct?v+'%':(k==='dur'?v+'h':v.toLocaleString());
        mg.innerHTML+=`<div class="metric">
            <div class="ml">${labels[i]}</div>
            <div class="mv" style="color:${isPct?c:FIELD_COLORS[i]}">${display}</div>
            ${isPct?`<div class="mbar"><div class="mfill" style="width:${barPct}%;background:${c}"></div></div>`:''}
        </div>`;
    });

    renderTrendChart(mid);
    renderLog(mid);
    renderTesterEmps(mid);
}

function renderTrendChart(mid){
    const logs=load('log_'+mid,[]).slice(-8);
    const labels=logs.map(l=>l.date);
    const datasets=[
        {label:'Planned (m)',data:logs.map(l=>l.plan),borderColor:'#60a5fa',backgroundColor:'transparent',tension:.3,pointRadius:3,borderWidth:1.5},
        {label:'Actual (m)',data:logs.map(l=>l.actual),borderColor:'#22d3a0',backgroundColor:'rgba(34,211,160,0.07)',fill:true,tension:.3,pointRadius:3,borderWidth:1.5},
        {label:'% Complete',data:logs.map(l=>l.pct),borderColor:'#f59e0b',backgroundColor:'transparent',tension:.3,pointRadius:3,borderWidth:1.5,yAxisID:'y2'},
    ];
    const leg=document.getElementById('trend-legend');
    leg.innerHTML=[['#60a5fa','Planned (m)'],['#22d3a0','Actual (m)'],['#f59e0b','% Complete']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:${c};font-family:'JetBrains Mono',monospace"><span style="width:20px;height:2px;background:${c};border-radius:1px;display:inline-block"></span>${l}</span>`).join('');
    if(trendChart){trendChart.destroy();trendChart=null;}
    const ctx=document.getElementById('trend-chart');
    if(!ctx)return;
    trendChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2538',titleColor:'#8b90a0',bodyColor:'#e8eaf0',borderColor:'rgba(255,255,255,0.08)',borderWidth:1}},scales:{x:{ticks:{font:{size:11},color:'#5a5f70'},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{font:{size:11},color:'#5a5f70',callback:v=>v.toLocaleString()},grid:{color:'rgba(255,255,255,0.04)'}},y2:{position:'right',ticks:{font:{size:11},color:'#f59e0b',callback:v=>v+'%'},grid:{display:false}}}}});
}

function renderLog(mid){
    const logs=load('log_'+mid,[]);
    const el=document.getElementById('tester-log');
    if(!logs.length){el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:8px 0">No entries logged yet.</div>';return;}
    el.innerHTML=logs.slice().reverse().slice(0,15).map(l=>{
        const eff=l.plan?Math.round((l.actual/l.plan)*100)+'%':'—';
        const c=l.pct>=90?'var(--green)':l.pct>=60?'var(--amber)':'var(--red)';
        const notes=l.notes?`<span style="color:var(--text3)"> — ${l.notes}</span>`:'';
        return `<div class="log-row">
            <span class="log-date">${l.date}</span>
            <div class="log-body">
                <span style="color:var(--text)">${l.wip}</span> <span style="color:var(--text2)">${l.desc}</span>
                &nbsp;·&nbsp;Plan: ${(l.plan||0).toLocaleString()}m
                &nbsp;·&nbsp;Actual: ${(l.actual||0).toLocaleString()}m
                &nbsp;·&nbsp;<span style="color:${c}">${l.pct||0}%</span>
                &nbsp;·&nbsp;${l.dur}h [${l.shift}] <span style="color:var(--text3)">(${l.user})</span>${notes}
            </div>
        </div>`;
    }).join('');
}

function renderTesterEmps(mid){
    const logs=load('log_'+mid,[]);
    const usedNames=new Set();
    logs.forEach(l=>{if(l.user&&l.user.trim()&&l.user!=='System')usedNames.add(l.user.trim().toLowerCase())});
    const matched=USERS.filter(u=>usedNames.has(u.name.toLowerCase()));
    const el=document.getElementById('tester-emps');
    if(!matched.length){el.innerHTML='<div style="font-size:13px;color:var(--text3)">No operators recorded for this machine yet.</div>';return;}
    el.innerHTML=matched.map(e=>`<div class="emp-row"><div class="avatar ${e.color}">${e.initials}</div><div style="flex:1"><div style="font-size:13px;font-weight:500">${e.name}</div></div></div>`).join('');
}

function saveEntry(){
    const mid=document.getElementById('mach-sel').value;
    const wip=document.getElementById('i-wip').value.trim();
    const desc=document.getElementById('i-desc').value.trim();
    const plan=parseFloat(document.getElementById('i-plan').value);
    const dur=parseFloat(document.getElementById('i-dur').value);
    const actual=parseFloat(document.getElementById('i-actual').value)||0;
    const shift=document.getElementById('i-shift').value;
    const operator=document.getElementById('i-operator').value.trim(); // New operator field
    const notes=document.getElementById('i-notes').value.trim();
    if(!wip||isNaN(plan)||isNaN(dur)||!operator) return; // Ensure operator is filled
    const pct=plan>0?Math.round((actual/plan)*1000)/10:0;
    const now=new Date();
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const date=months[now.getMonth()]+' '+now.getDate();
    const entry={date,wip,desc,plan,dur,actual,pct,shift,notes,user:operator}; // Save operator as user
    const logs=load('log_'+mid,[]);
    logs.push(entry);
    save('log_'+mid,logs);
    ['i-wip','i-desc','i-plan','i-dur','i-actual','i-operator','i-notes'].forEach(id=>document.getElementById(id).value='');
    const ok=document.getElementById('save-ok');
    ok.classList.remove('hidden');
    setTimeout(()=>ok.classList.add('hidden'),2500);
    loadMachine();
}

/* ── ADMIN VIEW ── */
function renderAdmin(){
    const active=MACHINES.filter(m=>m.status!=='err').length;
    const allOpsSet=new Set();
    MACHINES.forEach(m=>{load('log_'+m.id,[]).forEach(l=>{if(l.user&&l.user!=='System')allOpsSet.add(l.user.trim());})});
    document.getElementById('adm-active').textContent=active+' / '+MACHINES.length;
    document.getElementById('adm-staff').textContent=allOpsSet.size||'—';

    // Fleet list
    document.getElementById('fleet-list').innerHTML=MACHINES.map(m=>{
        const l=getLatestEntry(m.id);
        const pct=l?l.pct:0;
        const c=pct>=90?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
        const dc=m.status==='ok'?'s-ok':m.status==='warn'?'s-warn':'s-err';
        const desc=l?`${l.wip} — ${l.desc} [${l.shift}]`:'No data';
        return `<div class="field-row">
            <div class="sdot ${dc}"></div>
            <span class="fn">${m.name}</span>
            <div style="flex:1">
                <div style="font-size:12px;color:var(--text2);margin-bottom:4px;font-family:'JetBrains Mono',monospace">${desc}</div>
                <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
            </div>
            <span class="fv" style="color:${c}">${pct}%</span>
        </div>`;
    }).join('');

    // Fleet averages across 5 fields — using latest entry per machine
    const allLogs=MACHINES.map(m=>getLatestEntry(m.id)).filter(Boolean);
    const avgPlan=allLogs.length?Math.round(allLogs.reduce((s,l)=>s+l.plan,0)/allLogs.length):0;
    const avgDur=allLogs.length?Math.round(allLogs.reduce((s,l)=>s+l.dur,0)/allLogs.length*10)/10:0;
    const avgActual=allLogs.length?Math.round(allLogs.reduce((s,l)=>s+l.actual,0)/allLogs.length):0;
    const avgPct=allLogs.length?Math.round(allLogs.reduce((s,l)=>s+l.pct,0)/allLogs.length*10)/10:0;
    const avgEff=allLogs.length?Math.round(allLogs.map(l=>calcEff(l)).reduce((s,v)=>s+v,0)/allLogs.length*10)/10:0;
    const avgs=[{l:'Planned (m)',v:avgPlan,raw:Math.min(100,avgPlan/100)+'%',c:'#60a5fa'},{l:'Duration (hrs)',v:avgDur,raw:Math.min(100,avgDur/50*100)+'%',c:'#a78bfa'},{l:'Actual (m)',v:avgActual,raw:Math.min(100,avgActual/100)+'%',c:'#22d3a0'},{l:'% Completion',v:avgPct+'%',raw:Math.min(100,avgPct)+'%',c:avgPct>=90?'#22d3a0':avgPct>=60?'#f59e0b':'#f87171'},{l:'Plan Efficiency',v:avgEff+'%',raw:Math.min(100,avgEff)+'%',c:avgEff>=90?'#22d3a0':avgEff>=60?'#f59e0b':'#f87171'}];
    document.getElementById('fleet-avg').innerHTML=avgs.map(a=>`<div class="field-row"><span class="fn">${a.l}</span><div class="bar-bg"><div class="bar-fill" style="width:${a.raw};background:${a.c}"></div></div><span class="fv" style="color:${a.c}">${a.v}</span></div>`).join('');

    if(fleetChart){fleetChart.destroy();fleetChart=null;}
    const fc=document.getElementById('fleet-chart');
    if(fc){
        fleetChart=new Chart(fc,{type:'bar',data:{labels:['Planned','Duration','Actual','% Complete','Plan Eff.'],datasets:[{data:[avgPlan/50,avgDur,avgActual/50,avgPct,avgEff],backgroundColor:['#60a5fa','#a78bfa','#22d3a0','#f59e0b',avgEff>=90?'#22d3a0':avgEff>=60?'#f59e0b':'#f87171'],borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2538',titleColor:'#8b90a0',bodyColor:'#e8eaf0',borderColor:'rgba(255,255,255,0.08)',borderWidth:1,callbacks:{label:ctx=>{const labels=['Planned (÷50)','Duration (hrs)','Actual (÷50)','% Completion','Plan Efficiency'];return labels[ctx.dataIndex]+': '+[avgPlan,avgDur,avgActual,avgPct,avgEff][ctx.dataIndex]+(ctx.dataIndex>=3?'%':'')}}}},scales:{x:{ticks:{font:{size:11},color:'#5a5f70'},grid:{display:false}},y:{ticks:{font:{size:11},color:'#5a5f70'},grid:{color:'rgba(255,255,255,0.04)'}}}}});
    }

    // All operators — built from actual log entries across all machines
    const opMachMap={};
    MACHINES.forEach(m=>{
        const logs=load('log_'+m.id,[]);
        logs.forEach(l=>{
            if(!l.user||l.user==='System')return;
            const key=l.user.trim();
            if(!opMachMap[key])opMachMap[key]=new Set();
            opMachMap[key].add(m.name+' ('+m.desc+')');
        });
    });
    const opEntries=Object.entries(opMachMap);
    if(!opEntries.length){document.getElementById('all-emps').innerHTML='<div style="font-size:13px;color:var(--text3)">No operator log entries yet.</div>';return;}
    document.getElementById('all-emps').innerHTML=opEntries.map(([name,machSet])=>{
        const op=USERS.find(u=>name.toLowerCase().includes(u.name.toLowerCase().split(' ')[0])||u.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
        const ini=op?op.initials:(name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2));
        const color=op?op.color:'av-g';
        const machStr=Array.from(machSet).join(', ');
        return `<div class="emp-row"><div class="avatar ${color}">${ini}</div><div style="flex:1"><div style="font-size:13px;font-weight:500">${name}</div><div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">${machStr}</div></div></div>`;
    }).join('');
}

/* ── DISPLAY VIEW ── */
function renderDisplay(){
    const now=new Date();
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('d-date-title').textContent=months[now.getMonth()]+' '+now.getDate()+', '+now.getFullYear();
    const tasks=load('tasks',[]);
    const el=document.getElementById('d-tasks');
    el.innerHTML=tasks.map((t,i)=>`<div class="dtask${t.done?' done':''}" onclick="toggleTask(${i})">
        <span class="dt-time">${t.time}</span>
        <span class="dt-text">${t.desc}</span>
        <span style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">${t.wip||''}</span>
        <span class="dt-mach">${t.machine}</span>
        <span class="dt-shift shift-${t.shift==='N'?'n':'d'}">${t.shift}</span>
        ${t.done?'<span class="tick">&#10003;</span>':''}
    </div>`).join('');
}

function toggleTask(i){
    const tasks=load('tasks',[]);
    if(tasks[i])tasks[i].done=!tasks[i].done;
    save('tasks',tasks);renderDisplay();
}

function addTask(){
    const time=document.getElementById('t-time').value;
    const machine=document.getElementById('t-mach').value;
    const shift=document.getElementById('t-shift').value;
    const wip=document.getElementById('t-wip').value.trim();
    const desc=document.getElementById('t-desc').value.trim();
    if(!desc)return;
    const tasks=load('tasks',[]);
    tasks.push({time,machine,shift,wip,desc,done:false});
    tasks.sort((a,b)=>a.time.localeCompare(b.time));
    save('tasks',tasks);
    document.getElementById('t-desc').value='';document.getElementById('t-wip').value='';
    renderDisplay();
    const ok=document.getElementById('task-ok');
    ok.classList.remove('hidden');setTimeout(()=>ok.classList.add('hidden'),2000);
}

/* ── QUICK PILLS ── */
function buildPills(){
    const el=document.getElementById('user-pills');
    USERS.forEach(u=>{
        const b=document.createElement('button');
        const label=u.role==='admin'?'admin':u.role==='supervisor'?'supervisor':'op';
        b.className='pill';b.textContent=u.name.split(' ')[0]+' ('+label+')';
        b.onclick=()=>{document.getElementById('l-user').value=u.username;document.getElementById('l-pass').value=u.password;};
        el.appendChild(b);
    });
}

initSeeds();buildPills();
