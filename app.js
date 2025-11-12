// ================== 유틸 ==================
const $ = (q, el=document)=>el.querySelector(q);
const $$ = (q, el=document)=>[...el.querySelectorAll(q)];
const fmt = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = new Date();
let view = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today);

const STORAGE_KEY = 'dailymyday.v1';
const loadAll = ()=> JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
const saveAll = (obj)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));



const MOODS = [
  {id:'happy', em:'😊', name:'행복'},
  {id:'calm', em:'😌', name:'차분'},
  {id:'love', em:'🥰', name:'사랑'},
  {id:'okay', em:'🙂', name:'보통'},
  {id:'tired', em:'🥱', name:'피곤'},
  {id:'sad', em:'😢', name:'슬픔'},
  {id:'angry', em:'😡', name:'화남'},
  {id:'anx', em:'😟', name:'불안'},
  {id:'proud', em:'😎', name:'뿌듯'},
  {id:'grateful', em:'🙏', name:'감사'},
  {id:'excited', em:'🤩', name:'설렘'},
  {id:'sick', em:'🤒', name:'아픔'}
];
const MOOD_EMO = Object.fromEntries(MOODS.map(m=>[m.id,m.em]));
const MOOD_NAME = Object.fromEntries(MOODS.map(m=>[m.id,m.name]));

// 오늘 표시
$('#todayPill').textContent = `오늘 ${fmt(today)}`;

// 탭 전환 
function showTab(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $(`#view${name}`)?.classList.add('active');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
  if(name==='Diary') updateEditorHeader();
  if(name==='Records') renderEntries();
  if(name==='Stats') renderStats();
  window.scrollTo({top:0, behavior:'smooth'});
}

// 달력
function renderMonthBar(){
  $('#monthLabel').textContent = `${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,'0')}`;
}

function renderCalendar(){
  const grid = $('#calendarGrid'); grid.innerHTML='';
  const year=view.getFullYear(), month=view.getMonth();
  const firstDow=new Date(year,month,1).getDay();
  const lastDate=new Date(year,month+1,0).getDate();

  for(let i=0;i<firstDow;i++){
    const d=document.createElement('div'); d.className='day disabled';
    grid.appendChild(d);
  }

  const all=loadAll();
  for(let d=1;d<=lastDate;d++){
    const date=new Date(year,month,d);
    const id=fmt(date);
    const cell=document.createElement('button');
    cell.className='day'; cell.textContent=d;

    if(fmt(date)===fmt(today)) cell.classList.add('today');
    if(fmt(date)===fmt(selectedDate)) cell.classList.add('selected');

    if(all[id]){
      const dot=document.createElement('span');
      dot.style.cssText='position:absolute;bottom:6px;width:6px;height:6px;border-radius:50%;background:#5a45b8;';
      cell.appendChild(dot);
    }

    cell.addEventListener('click',()=>{
      selectedDate=date;
      renderCalendar();
      loadEntryToEditor();
      showTab('Mood');
    });
    grid.appendChild(cell);
  }
}

$('#prevMonth').addEventListener('click',()=>{
  view=new Date(view.getFullYear(),view.getMonth()-1,1);
  renderMonthBar(); renderCalendar();
});
$('#nextMonth').addEventListener('click',()=>{
  view=new Date(view.getFullYear(),view.getMonth()+1,1);
  renderMonthBar(); renderCalendar();
});

// 감정 고르기 
function renderMoods(selected){
  const box=$('#moodGrid'); 
  box.innerHTML=''; 

  MOODS.forEach(m=>{
    const b=document.createElement('div');
    b.className='mood'+(selected===m.id?' active':'');
    b.innerHTML=`<span class="em">${m.em}</span><div style="font-size:var(--fs-sm)">${m.name}</div>`;
    b.dataset.mid=m.id;

    // 즉시 저장 + 통계 갱신
    b.addEventListener('click',()=>{
      $$('.mood',box).forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      updateEditorHeader();
      saveCurrent();
      renderStats();
    });

    box.appendChild(b);
  });
}

function getSelectedMood(){return $('#moodGrid .mood.active')?.dataset.mid||'';}
function setSelectedMood(mid){$$('#moodGrid .mood').forEach(x=>x.classList.toggle('active',x.dataset.mid===mid));}

// 에디터
function updateEditorHeader(){
  const moodId=getSelectedMood();
  const emoji=MOOD_EMO[moodId]||'';
  $('#editorTitle').textContent=`${fmt(selectedDate)} 일기 ${emoji}`;
}

function loadEntryToEditor(){
  const id=fmt(selectedDate);
  const all=loadAll();
  const it=all[id]||{text:'',mood:'',praise:'',reflection:'',summary:null};

  $('#diary').value=it.text||'';
  $('#praise').value=it.praise||'';
  $('#reflection').value=it.reflection||'';
  renderMoods(it.mood||'');
  setSelectedMood(it.mood||'');

  $('#charCount').textContent=(it.text||'').length;

  if(it.summary){
    $('#summaryText').textContent=it.summary.text;
    $('#summaryTime').textContent=`(${new Date(it.summary.at).toLocaleString()})`;
    $('#summaryBox').style.display='';
  }else{
    $('#summaryBox').style.display='none';
  }

  renderCalendar();
  updateEditorHeader();
}

// 글 저장
function saveCurrent(){
  const id=fmt(selectedDate);
  const all=loadAll();
  all[id]={
    text:$('#diary').value.trim(),
    praise:$('#praise').value.trim(),
    reflection:$('#reflection').value.trim(),
    mood:getSelectedMood(),
    summary:all[id]?.summary||null
  };
  saveAll(all);
  renderCalendar();
}
 // 글 삭제
function deleteCurrent(){
  const id=fmt(selectedDate);
  const all=loadAll();
  delete all[id];
  saveAll(all);

  $('#diary').value='';
  $('#praise').value='';
  $('#reflection').value='';
  setSelectedMood('');
  $('#summaryBox').style.display='none';
  renderCalendar();
}

// 기록
function renderEntries(){
  const box=$('#entries');
  const all=loadAll();
  const keys=Object.keys(all).sort().reverse();

  box.innerHTML='';
  if(!keys.length){
    box.innerHTML='<div class="muted">기록이 없습니다.</div>';
    return;
  }

  keys.forEach(k=>{
    const it=all[k];
    if(!it.summary||!it.summary.text) return;

    const mood=MOODS.find(m=>m.id===it.mood);
    const div=document.createElement('div');
    div.className='entry';
    div.innerHTML=`
      <div class="meta">
        <span class="chip">${k}</span>
        ${mood?`<span class="chip">${mood.em} ${mood.name}</span>`:''}
      </div>
      <div style="margin-top:6px; white-space:pre-line;">${it.summary.text}</div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="btn small" data-edit="${k}">수정</button>
        <button class="btn small danger" data-del="${k}">삭제</button>
      </div>`;
    box.appendChild(div);
  });

  $$('[data-edit]').forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.edit; const [y,m,d]=id.split('-').map(Number);
      selectedDate=new Date(y,m-1,d);
      loadEntryToEditor(); showTab('Diary');
    };
  });

  $$('[data-del]').forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.del;
      if(confirm('삭제할까요?')){
        const all=loadAll();
        delete all[id];
        saveAll(all);
        renderEntries();
        renderCalendar();
      }
    };
  });
}

// 통계
function renderStats(mode='total'){
  const box=$('#statsBox');
  const all=loadAll();
  box.innerHTML='';

  const btns=document.createElement('div');
  btns.id='statsMode';
  btns.innerHTML=`
    <button class="btn small" data-mode="week">주간</button>
    <button class="btn small" data-mode="month">월별</button>
    <button class="btn small" data-mode="total">전체</button>`;
  box.appendChild(btns);

  btns.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>renderStats(b.dataset.mode);
  });

  const content=document.createElement('div');
  content.id='statsContent';
  box.appendChild(content);

  if(mode==='total') renderTotalStats(all,content);
  else if(mode==='month') renderMonthlyStats(all,content);
  else renderWeeklyStats(all,content);
}

// 전체 그래
function renderTotalStats(all,box){
  const counts={};
  Object.values(all).forEach(it=>{
    if(it.mood) counts[it.mood]=(counts[it.mood]||0)+1;
  });

  const total=Object.keys(all).length;
  const lastKey=Object.keys(all).sort().reverse()[0];
  const lastMood=lastKey?all[lastKey].mood:null;

  box.innerHTML=`
    <h3>전체 감정 통계</h3>
    <div class="muted">총 기록: ${total} | 최근 감정: ${MOOD_NAME[lastMood]||'-'}</div>
  `;

  const graph=document.createElement('div');
  graph.className='bar-graph';

  MOODS.forEach(m=>{
    const n=counts[m.id]||0;
    const bar=document.createElement('div');
    bar.className='bar-item';
    bar.innerHTML=`
      <div class="bar" style="height:${n*15}px;background:${m.color||'var(--primary)'}"></div>
      <div class="bar-label">${m.em}<br>${n}</div>
    `;
    graph.appendChild(bar);
  });

  box.appendChild(graph);
}

// 월별 그래프

function renderMonthlyStats(all,box){
  const now=new Date();
  const year=now.getFullYear();

  const select=document.createElement('select');
  select.id='monthSelect';
  select.style.margin='6px 0';
  select.style.padding='6px';
  select.style.borderRadius='6px';
  select.style.border='1px solid #ddd';

  for(let i=0;i<12;i++){
    const d=new Date(year,now.getMonth()-i,1);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const opt=document.createElement('option');
    opt.value=ym; opt.textContent=ym;
    if(i===0) opt.selected=true;
    select.appendChild(opt);
  }

  const title=document.createElement('h3');
  title.textContent='월별 감정 통계';
  box.appendChild(title);
  box.appendChild(select);

  const graph=document.createElement('div');
  graph.className='bar-graph';
  box.appendChild(graph);

  const drawGraph=(ym)=>{
    graph.innerHTML='';
    const monthData=Object.entries(all).filter(([k])=>k.startsWith(ym));
    const counts={};
    monthData.forEach(([_,it])=>{
      if(it.mood) counts[it.mood]=(counts[it.mood]||0)+1;
    });
    MOODS.forEach(m=>{
      const n=counts[m.id]||0;
      const bar=document.createElement('div');
      bar.className='bar-item';
      bar.innerHTML=`
        <div class="bar" style="height:${n*15}px;background:${m.color||'var(--primary)'}"></div>
        <div class="bar-label">${m.em}<br>${n}</div>
      `;
      graph.appendChild(bar);
    });
  };

  drawGraph(select.value);
  select.addEventListener('change',()=>drawGraph(select.value));
}

// 주간 그래프

function renderWeeklyStats(all,box){
  box.innerHTML=`<h3>이번 주 감정</h3>`;

  const now=new Date();
  const day=now.getDay();
  const start=new Date(now);
  start.setDate(now.getDate()-day);

  const weekDays=['일','월','화','수','목','금','토'];
  const wrap=document.createElement('div');
  wrap.className='week-emotions';
  wrap.style.display='flex';
  wrap.style.justifyContent='space-between';
  wrap.style.marginTop='12px';
  wrap.style.textAlign='center';

  for(let i=0;i<7;i++){
    const d=new Date(start);
    d.setDate(start.getDate()+i);
    const id=fmt(d);
    const it=all[id];
    const emo=it&&it.mood?MOOD_EMO[it.mood]:'—';

    const dayDiv=document.createElement('div');
    dayDiv.style.flex='1';
    dayDiv.innerHTML=`
      <div style="font-size:20px;margin-bottom:4px;">${emo}</div>
      <div style="font-size:13px;color:var(--sub)">${weekDays[i]}</div>
    `;
    wrap.appendChild(dayDiv);
  }

  box.appendChild(wrap);
}

// ================== [!] 수정된 부분 ==================
// AI 요약 함수 (summarize)
// =========================================================
async function summarize() {
  // 1. index.html에 설정한 프록시 주소를 가져옵니다.
  const proxy = document.querySelector('meta[name="proxy-url"]')?.content || '';
  if (!proxy) throw new Error('프록시 URL이 설정되지 않았습니다. (index.html 확인)');

  const diary = $('#diary').value.trim();
  const praise = $('#praise').value.trim();
  const reflection = $('#reflection').value.trim();
  const moodId = getSelectedMood();
  const moodName = MOOD_NAME[moodId] || '';

  if (!diary) throw new Error('일기 내용을 먼저 입력해 주세요.');

  // 2. AI에게 보낼 요청 데이터
  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      { role: 'system', content: '너는 감정 일기를 요약해주고 조언해주는 다정한 한국어 상담가입니다.' },
      {
        role: 'user',
        content: `
다음 정보를 바탕으로 오늘 하루를 3~6문장으로 요약하고, 마지막에 한 줄 조언을 덧붙여줘.
- 오늘의 감정: ${moodName}
- 오늘의 칭찬: ${praise || '없음'}
- 오늘의 반성: ${reflection || '없음'}
- 오늘의 일기: ${diary}`
      }
    ]
  };

  try {
    // 3. Cloudflare 워커로 요청 전송
    const res = await fetch(proxy + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        
        // [!] 'x-proxy-key' 라인을 완전히 삭제했습니다.
      },
      body: JSON.stringify(body)
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`[프록시] HTTP ${res.status} - ${raw.slice(0, 200)}`);
    }

    const data = JSON.parse(raw);
    return data.choices?.[0]?.message?.content?.trim() || '(빈 응답)';
  } catch (err) {
    throw new Error(`요약 실패: ${err.message}`);
  }
}
// ================== [!] 수정 끝 ==================


// ================== 전역 이벤트 ==================
document.body.addEventListener('click', async e=>{
  const t=e.target;

  if(t.id==='nextToDiary'){ saveCurrent(); showTab('Diary'); }

  if(t.id==='saveBtn'){ 
    saveCurrent(); 
    alert('저장했어요!'); 
    showTab('Calendar'); 
  }

  if(t.id==='delBtn'){ 
    if(confirm('삭제할까요?')) deleteCurrent(); 
  }

  if(t.id==='summBtn'){
    const box=$('#summaryBox');
    const text=$('#summaryText');
    const time=$('#summaryTime');

    box.style.display='';
    text.textContent='요약 중...';
    time.textContent='';
    t.disabled=true;

    try{
      const sum=await summarize(); // [!] 이제 이 함수가 존재합니다.
      text.textContent=sum;
      time.textContent=`(${new Date().toLocaleString()})`;

      const id=fmt(selectedDate);
      const all=loadAll();
      all[id]={
        text:$('#diary').value,
        praise:$('#praise').value,
        reflection:$('#reflection').value,
        mood:getSelectedMood(),
        summary:{text:sum,at:Date.now()}
      };
      saveAll(all);
    }catch(e){
      text.textContent='요약 실패: '+e.message; // 에러를 화면에 남김
    }finally{
      t.disabled=false;
    }
  }
});

// 설정
const menuBtn=$('#menuBtn'), sidebar=$('#sidebar'), overlay=$('#overlay');

if (menuBtn) {
  menuBtn.addEventListener('click',()=>{
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
  });
}
if (overlay) {
  overlay.addEventListener('click',()=>{
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}
$$('#sidebar li').forEach(li=>li.addEventListener('click',()=>showTab(li.dataset.tab)));

$('#resetBtn')?.addEventListener('click',()=>{
  if(confirm('모든 데이터를 삭제할까요?')){
    localStorage.removeItem(STORAGE_KEY);
    alert('초기화 완료');
    renderCalendar();   // 점 즉시 제거
    renderEntries();
    renderStats();
  }
});
//PIN 설정
$('#setPinBtn')?.addEventListener('click',()=>{
  const pin=prompt('4자리 PIN (비우면 해제)');
  if(pin===''){
    localStorage.removeItem('myday.pin');
    alert('PIN 잠금 해제됨');
  }else if(/^\d{4}$/.test(pin)){
    localStorage.setItem('myday.pin',pin);
    alert('PIN 설정 완료');
  }else{
    alert('4자리 숫자만 입력');
  }
});

function checkPinLock(){
  const pin=localStorage.getItem('myday.pin');
  if(!pin) return;
  const lock=$('#lockScreen');
  if(!lock) return;
  lock.style.display='flex';
  $('#unlockBtn')?.addEventListener('click',()=>{
    if($('#pinInput').value===pin){
      lock.style.display='none';
    }else{
      $('#lockMsg').textContent='❌ PIN이 올바르지 않습니다.';
      $('#pinInput').value='';
    }
  });
}

// 다크모드
const themeBtn = $('#themeBtn');
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (themeBtn) themeBtn.textContent = '라이트모드';
  } else {
    document.documentElement.classList.remove('dark');
    if (themeBtn) themeBtn.textContent = '다크모드';
  }
}
themeBtn?.addEventListener('click', () => {
  const currentTheme = localStorage.getItem('myday.theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('myday.theme', newTheme);
  applyTheme(newTheme);
});
function initTheme() {
  const savedTheme = localStorage.getItem('myday.theme') || 'light';
  applyTheme(savedTheme);
}

//홈 버튼 Daily
$('.brand')?.addEventListener('click', () => {
  showTab('Calendar');
});
////////////init////////////
function init(){
  renderMonthBar();
  renderCalendar();
  renderMoods('');
  loadEntryToEditor();
  initTheme();
  checkPinLock();
}
window.addEventListener('DOMContentLoaded', init);