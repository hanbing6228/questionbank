try{const sv=JSON.parse(localStorage.getItem('cfa4')||'{}');if(sv.ans)S.ans=sv.ans;if(sv.fav)S.fav=new Set(sv.fav);if(sv.notes)S.notes=sv.notes;if(sv.mkans)S.mkans=sv.mkans;}catch(e){}
function save(){try{localStorage.setItem('cfa4',JSON.stringify({ans:S.ans,fav:[...S.fav],notes:S.notes,mkans:S.mkans}));}catch(e){}}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);}

function getSubs(){const subs={};D.forEach(c=>{const s=c.s;if(!subs[s])subs[s]={basic:[],advanced:[],tq:0,dn:0,co:0};subs[s][c.level||'basic'].push(c);const ql=(c.qs||[]).length;subs[s].tq+=ql;(c.qs||[]).forEach(q=>{const k=`q${q.i}`;if(S.ans[k]!==undefined){subs[s].dn++;if(S.ans[k]===q.a)subs[s].co++;}});});return subs;}
function getT(){let t=0,d=0,c=0;D.forEach(cs=>{(cs.qs||[]).forEach(q=>{t++;const k=`q${q.i}`;if(S.ans[k]!==undefined){d++;if(S.ans[k]===q.a)c++;}});});return{t,d,c};}

document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;S.v=b.dataset.v;S.sj=null;if(S.v!=='mock'){S.mk=null;clearInterval(S.mkti);}render();});

function fmtM(t){if(!t)return'';return t.split('\n\n').filter(p=>p.trim()).map(p=>{let h=p.trim();h=h.replace(/(Statement\s+\d+)/g,'<span class="stmt">$1</span>');h=h.replace(/(Exhibit\s+\d+)/g,'<span class="exref">$1</span>');h=h.replace(/(Conclusion\s+\d+)/g,'<span class="stmt">$1</span>');return'<p>'+h+'</p>';}).join('');}

function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.v));
  const a=document.getElementById('app');const{t,d,c}=getT();document.getElementById('xp').textContent=c*10;
  if(S.v==='dash')rDash(a);
  else if(S.v==='quiz'){S.sj?(S.ci>=0?rQuiz(a):rList(a)):rDash(a);}
  else if(S.v==='mock'){S.mk!==null?rMockExam(a):rMockHome(a);}
  else if(S.v==='stats')rStats(a);
  else if(S.v==='notes')rNotes(a);
}

function rDash(a){
  const{t,d,c}=getT();const p=d?Math.round(c/d*100):0;const subs=getSubs();
  let h=`<div class="vw"><div class="sg"><div class="sc"><div class="lb">总题数</div><div class="vl">${t}</div><div class="sb">10科 · ${D.length} Cases</div></div><div class="sc"><div class="lb">已完成</div><div class="vl">${d} <small>/ ${t}</small></div><div class="sb">${t?Math.round(d/t*100):0}%</div></div><div class="sc"><div class="lb">正确率</div><div class="vl" style="color:${p>=70?'var(--gn)':p>=50?'var(--or)':'var(--rd)'}">${p}%</div><div class="sb">${c} 正确</div></div><div class="sc"><div class="lb">收藏</div><div class="vl">${S.fav.size}</div><div class="sb">标记复习</div></div></div><div class="sjg">`;
  for(const[s,info]of Object.entries(subs)){const m=SM[s]||{i:'📋',cn:s,c:'#58a6ff'};const dp=info.tq?Math.round(info.dn/info.tq*100):0;const cp=info.dn?Math.round(info.co/info.dn*100):0;
  h+=`<div class="sjc" onclick="openSub('${s}')"><div class="sjt"><div class="sji" style="background:${m.c}22;color:${m.c}">${m.i}</div><div class="sjn">${m.cn} · ${s}</div><div class="sjp">${dp}%</div></div><div class="sjr"><span><span class="dot" style="background:var(--bl)"></span>基础 ${info.basic.length}</span><span><span class="dot" style="background:var(--pp)"></span>强化 ${info.advanced.length}</span><span>共 ${info.tq} 题</span></div><div class="pb"><i style="width:${dp}%;background:${cp>=70?'var(--gn)':'var(--or)'}"></i></div></div>`;}
  h+='</div></div>';a.innerHTML=h;
}
function openSub(s){S.v='quiz';S.sj=s;S.ci=-1;S.lv='basic';render();}

function rList(a){
  const subs=getSubs();const info=subs[S.sj];if(!info){S.sj=null;render();return;}
  const m=SM[S.sj]||{i:'📋',cn:S.sj};const cases=info[S.lv]||[];
  let h=`<div class="vw"><div class="clh"><button class="bb" onclick="S.sj=null;render()">← 返回</button><h2>${m.i} ${m.cn}</h2></div><div class="lt"><button class="ltn ${S.lv==='basic'?'on':''}" onclick="S.lv='basic';render()">📘 基础题 <span class="cnt">(${info.basic.length})</span></button><button class="ltn ${S.lv==='advanced'?'on':''}" onclick="S.lv='advanced';render()">📕 强化题 <span class="cnt">(${info.advanced.length})</span></button></div>`;
  if(!cases.length)h+='<div class="es"><div class="ei">📭</div>暂无题目</div>';
  else cases.forEach((c,idx)=>{const ql=(c.qs||[]).length;let dn=0;(c.qs||[]).forEach(q=>{if(S.ans[`q${q.i}`]!==undefined)dn++;});const st=dn===ql?'dn':dn>0?'pr':'';const stx=dn===ql?'✓ 完成':dn>0?`${dn}/${ql}`:'';const kp=(c.qs&&c.qs[0])?c.qs[0].k||'':'';const hasEx=(c.exhibit_files||[]).length>0;
  h+=`<div class="ci" onclick="openCase('${S.sj}','${S.lv}',${idx})"><div class="cn">${idx+1}</div><div class="cif"><div class="ct">Case ${idx+1}${kp?' · '+kp:''}${hasEx?' 📊':''}</div><div class="cm">${ql} 题${hasEx?' · 含图表':''}</div></div>${stx?`<div class="cs ${st}">${stx}</div>`:''}</div>`;});
  h+='</div>';a.innerHTML=h;
}
function openCase(sj,lv,idx){S.sj=sj;S.lv=lv;S.ci=idx;S.qi=0;render();}

function rQuiz(a){
  if(S.ci<0){rList(a);return;}const subs=getSubs();const cases=subs[S.sj][S.lv]||[];const c=cases[S.ci];if(!c){rList(a);return;}
  const m=SM[S.sj]||{i:'📋',cn:S.sj};const qs=c.qs||[];const q=qs[S.qi];if(!q)return;
  const key=`q${q.i}`;const ua=S.ans[key];const lk=ua!==undefined;const fv=S.fav.has(q.i);
  let matH=fmtM(c.m||'')||'<p style="color:var(--ink3);font-style:italic">本题无附加背景材料</p>';
  const exF=c.exhibit_files||[];let exH='';
  exF.forEach((f,i)=>{exH+=`<div class="exi"><img src="exhibits/${f}" alt="Exhibit" loading="lazy"><div class="ecap">📊 Exhibit · Page ${f.replace('ex_p','').replace('.jpg','')}</div></div>`;});

  let h=`<div class="vw"><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><button class="bb" onclick="S.ci=-1;render()">← ${m.cn}</button><span style="font-size:13px;color:var(--ink3)">${S.lv==='basic'?'基础题':'强化题'} · Case ${S.ci+1}/${cases.length}</span></div>
  <div class="cw"><div class="cl"><div class="ch"><span class="clbl">Case ${S.ci+1}</span><span class="lvl ${S.lv==='basic'?'b':'a'}">${S.lv==='basic'?'📘 基础题':'📕 强化题'}</span><button class="fb ${fv?'on':''}" onclick="tFav(${q.i})">${fv?'⭐':'☆'} 收藏</button></div>
  <div class="ml">背景材料 · VIGNETTE</div><div class="mat">${matH}</div>${exH}
  ${c.m&&c.m.includes('Exhibit')&&!exF.length?'<div class="exn">⚠️ 材料含 Exhibit/Table，请对照官方题本查看图表数据。</div>':''}</div>
  <div class="cr"><div class="qt">`;
  qs.forEach((qq,i)=>{const qk=`q${qq.i}`;const u=S.ans[qk];let cls=i===S.qi?'cur':'';if(u!==undefined)cls+=u===qq.a?' ok':' wr';h+=`<button class="qtn ${cls}" onclick="S.qi=${i};render()">${i+1}</button>`;});
  h+=`</div><div class="qm"><span class="tg tp">${q.k||q.s}</span><span class="tg rt">全站正确率 ${q.r||'--'}%</span></div>
  <div class="qtp">${String(S.qi+1).padStart(2,'0')} 单选题</div><div class="qs">${q.q}</div><div class="opts">`;
  for(const[l,t]of Object.entries(q.o||{})){let cls='';if(lk){cls='lk';if(l===q.a)cls+=' co';else if(l===ua)cls+=' wr';}
  h+=`<button class="opt ${cls}" onclick="selOpt('${key}','${l}','${q.a}')"><span class="k">${l}</span><span class="ot">${t}</span></button>`;}
  h+='</div>';
  if(lk){const ok=ua===q.a;h+=`<div class="rb"><span class="vd ${ok?'ok':'no'}">${ok?'✓ 正确':'✗ 错误'}</span>正确答案: <span class="ca">${q.a}</span><span style="color:var(--ink3);margin-left:8px">全站正确率 ${q.r||'--'}%</span></div>`;if(q.e)h+=`<div class="eb"><h4>💡 解析</h4><p>${q.e}</p></div>`;}
  const td=qs.filter(qq=>S.ans[`q${qq.i}`]!==undefined).length;
  h+=`<div class="qf"><button class="ib ${fv?'on':''}" onclick="tFav(${q.i})">${fv?'⭐':'☆'}</button><button class="ib" onclick="document.getElementById('noteA').classList.toggle('hidden')">📝</button><span class="sp"></span><span class="pt">${td}/${qs.length}</span>
  ${S.qi>0?'<button class="btn bg" onclick="S.qi--;render()">← 上一题</button>':''}
  ${S.qi<qs.length-1?'<button class="btn bp" onclick="S.qi++;render()">下一题 →</button>':''}</div>
  <div id="noteA" class="hidden"><textarea class="na" placeholder="写下笔记..." oninput="sNote(${q.i},this.value)">${S.notes[`n${q.i}`]||''}</textarea></div>
  </div></div></div>`;a.innerHTML=h;
}
function selOpt(k,l,c){if(S.ans[k]!==undefined)return;S.ans[k]=l;save();render();toast(l===c?'✓ 正确！+10 XP':'✗ 看看解析');}
function tFav(id){if(S.fav.has(id))S.fav.delete(id);else S.fav.add(id);save();render();}
function sNote(id,v){S.notes[`n${id}`]=v;save();}

/* MOCK EXAM */
function rMockHome(a){
  let h=`<div class="vw"><h2 style="font-family:var(--sf);margin-bottom:6px">📝 Mock 模拟考试</h2>
  <p style="color:var(--ink2);font-size:13px;margin-bottom:20px">CFA Level II 真实考试模拟 · 每 Session 44 题 · 限时 132 分钟</p><div class="mks">`;
  MK.forEach((sess,i)=>{
    const tq=sess.vignettes.reduce((s,v)=>s+v.qs.length,0);
    const mk_key=`mk${i}`;const done=Object.keys(S.mkans).filter(k=>k.startsWith(mk_key)).length;
    h+=`<div class="mkc" onclick="startMock(${i})"><h3>${sess.name}</h3><p>${sess.vignettes.length} Item Sets · ${tq} 题</p>
    <p style="margin-top:8px;color:${done?'var(--gn)':'var(--ac)'}">132 分钟${done?' · 已做'+done+'题':''}</p></div>`;
  });
  h+=`</div><div class="cb"><h3>📋 考试说明</h3><div style="font-size:14px;color:var(--ink2);line-height:1.8">
  <p>• 每 Session 含 11 个 Item Set，每 Set 4 道题，共 44 道选择题</p>
  <p>• 限时 2 小时 12 分钟（132 分钟）</p>
  <p>• 开始后自动计时，可随时暂停或提交</p>
  <p style="color:var(--ac);margin-top:10px">💡 建议安静环境独立完成</p></div></div></div>`;
  a.innerHTML=h;
}

function startMock(idx){
  S.mk=idx;S.mkq=0;S.mkt=132*60;
  clearInterval(S.mkti);
  S.mkti=setInterval(()=>{S.mkt--;if(S.mkt<=0){clearInterval(S.mkti);toast('⏰ 时间到！');}const te=document.getElementById('tmr');if(te){const m=Math.floor(S.mkt/60);const s=S.mkt%60;te.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}},1000);
  render();
}

function rMockExam(a){
  const sess=MK[S.mk];const allQs=[];
  sess.vignettes.forEach((v,vi)=>{v.qs.forEach((q,qi)=>{allQs.push({...q,vi,topic:v.topic,material:v.material});});});
  const cur=allQs[S.mkq];if(!cur){a.innerHTML='<div class="es">No questions</div>';return;}
  const mk_key=`mk${S.mk}_${S.mkq}`;const ua=S.mkans[mk_key];const lk=ua!==undefined;
  const mins=Math.floor(S.mkt/60);const secs=S.mkt%60;
  const matH=fmtM(cur.material||'');

  let h=`<div class="vw"><div style="background:var(--pn);border:1px solid var(--ln);border-radius:14px;overflow:hidden">
  <div class="exh"><button class="bb" onclick="if(confirm('确定退出考试？')){S.mk=null;clearInterval(S.mkti);render();}">✕ 退出</button>
  <span style="font-weight:600">${sess.name}</span><span style="color:var(--ink3);font-size:13px">Q${S.mkq+1}/${allQs.length}</span>
  <span class="tmr" id="tmr">${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</span></div>
  <div class="exb"><div class="exl">
  <div class="exnav">`;
  allQs.forEach((_,i)=>{const k=`mk${S.mk}_${i}`;const cls=i===S.mkq?'cur':(S.mkans[k]!==undefined?'ans':'');h+=`<button class="${cls}" onclick="S.mkq=${i};render()">${i+1}</button>`;});
  h+=`</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink3);margin-bottom:8px;font-weight:600">${cur.topic} · VIGNETTE</div>
  <div class="mat">${matH||'<p style="color:var(--ink3)">材料加载中...</p>'}</div></div>
  <div class="exr"><div class="qm"><span class="tg tp">${cur.topic}</span></div>
  <div class="qtp">Q${cur.n || S.mkq+1}</div><div class="qs">${cur.q}</div><div class="opts">`;
  for(const[l,t]of Object.entries(cur.o||{})){
    let cls='';if(lk){cls='lk';if(l===cur.a)cls+=' co';else if(l===ua)cls+=' wr';}
    h+=`<button class="opt ${cls}" onclick="mkSel('${mk_key}','${l}','${cur.a||''}')"><span class="k">${l}</span><span class="ot">${t}</span></button>`;}
  h+='</div>';
  if(lk&&cur.a){const ok=ua===cur.a;h+=`<div class="rb"><span class="vd ${ok?'ok':'no'}">${ok?'✓':'✗'}</span>正确: <span class="ca">${cur.a}</span></div>`;}
  h+=`<div class="qf"><span class="sp"></span>
  ${S.mkq>0?'<button class="btn bg" onclick="S.mkq--;render()">← 上一题</button>':''}
  ${S.mkq<allQs.length-1?'<button class="btn bp" onclick="S.mkq++;render()">下一题 →</button>':''}
  ${S.mkq===allQs.length-1?'<button class="btn bp" onclick="submitMock()">交卷</button>':''}
  </div></div></div></div></div>`;
  a.innerHTML=h;
}
function mkSel(k,l,c){if(S.mkans[k]!==undefined)return;S.mkans[k]=l;save();render();}
function submitMock(){
  clearInterval(S.mkti);const sess=MK[S.mk];let total=0,correct=0;
  sess.vignettes.forEach((v,vi)=>{v.qs.forEach((q,qi)=>{total++;const k=`mk${S.mk}_${total-1}`;if(S.mkans[k]===q.a)correct++;});});
  const pct=total?Math.round(correct/total*100):0;
  toast(`考试完成！${correct}/${total} 正确 (${pct}%)`);render();
}

function rStats(a){
  const subs=getSubs();let h=`<div class="vw"><h2 style="font-family:var(--sf);margin-bottom:20px">📈 学习统计</h2><div class="cb"><h3>各科正确率</h3>`;
  for(const[s,info]of Object.entries(subs)){const m=SM[s]||{cn:s,c:'#58a6ff'};const p=info.dn?Math.round(info.co/info.dn*100):0;const cl=p>=70?'var(--gn)':p>=50?'var(--or)':'var(--rd)';
  h+=`<div class="br"><div class="bn">${m.cn}</div><div class="bt"><i style="width:${p}%;background:${cl}"></i></div><div class="bv">${info.dn?p+'%':'--'}</div></div>`;}
  h+='</div><div class="cb"><h3>完成进度</h3>';
  for(const[s,info]of Object.entries(subs)){const m=SM[s]||{cn:s,c:'#58a6ff'};const p=info.tq?Math.round(info.dn/info.tq*100):0;
  h+=`<div class="br"><div class="bn">${m.cn}</div><div class="bt"><i style="width:${p}%;background:${m.c}"></i></div><div class="bv">${info.dn}/${info.tq}</div></div>`;}

  // Mock exam results
  h+='</div><div class="cb"><h3>Mock 考试记录</h3>';
  MK.forEach((sess,i)=>{
    let total=0,correct=0;
    sess.vignettes.forEach(v=>{v.qs.forEach((q,qi)=>{total++;const k=`mk${i}_${total-1}`;if(S.mkans[k]===q.a)correct++;});});
    const done=Object.keys(S.mkans).filter(k=>k.startsWith(`mk${i}`)).length;
    if(done>0){const pct=Math.round(correct/done*100);h+=`<div class="br"><div class="bn">${sess.name}</div><div class="bt"><i style="width:${pct}%;background:${pct>=70?'var(--gn)':'var(--or)'}"></i></div><div class="bv">${correct}/${done}</div></div>`;}
    else h+=`<div class="br"><div class="bn">${sess.name}</div><div class="bt"></div><div class="bv">未做</div></div>`;
  });
  h+='</div></div>';a.innerHTML=h;
}

function rNotes(a){
  const ne=Object.entries(S.notes).filter(([k,v])=>v.trim());
  let h=`<div class="vw"><h2 style="font-family:var(--sf);margin-bottom:20px">🔖 我的笔记</h2>`;
  if(!ne.length)h+='<div class="es"><div class="ei">📝</div>还没有笔记</div>';
  else ne.forEach(([k,v])=>{const id=parseInt(k.replace('n',''));const q=D.flatMap(c=>c.qs||[]).find(qq=>qq.i===id);
  h+=`<div class="nc"><div class="nh">${q?q.s+' · '+(q.k||''):'#'+id}</div>${q?`<div style="font-size:13px;color:var(--ink2);margin-bottom:8px">${q.q.slice(0,100)}...</div>`:''}<div class="nb">${v}</div></div>`;});
  h+='</div>';a.innerHTML=h;
}
render();