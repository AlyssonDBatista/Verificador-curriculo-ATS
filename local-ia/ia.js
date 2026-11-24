"use strict";
/* Parte de IA da versão local: fala com local-ia/server.py (/api/health e /api/chat),
   que repassa ao Ollama. Carregado depois de assets/ats.js e substitui renderAi(). */
/* ================= IA (sugestões) ================= */
let sampleFn=null, localInfo=null;
async function getSample(){
  if(sampleFn) return sampleFn;
  try{
    const r=await fetch("/api/health"); localInfo=await r.json();
    if(localInfo&&localInfo.ok&&localInfo.installed){
      sampleFn=async(prompt)=>{
        const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
        const data=await resp.json();
        if(!resp.ok) throw {code:"local_error",message:data.error||"error"};
        return {text:data.text};
      };
    }
  }catch(e){ localInfo=null; }
  return sampleFn;
}
function localMsg(){
  const l=lang;
  if(!localInfo) return l==="pt"?"Não consegui falar com o servidor local. Abra o terminal, rode o servidor (python server.py) e recarregue esta página.":"Couldn't reach the local server. Open a terminal, run the server (python server.py) and reload this page.";
  if(!localInfo.ok) return l==="pt"?"O Ollama não está rodando. Abra o aplicativo Ollama e tente de novo.":"Ollama isn't running. Open the Ollama app and try again.";
  return l==="pt"?`O modelo ${localInfo.model} ainda não foi baixado. No terminal, rode: ollama pull ${localInfo.model}`:`The model ${localInfo.model} hasn't been downloaded yet. In a terminal, run: ollama pull ${localInfo.model}`;
}
function renderAi(){
  const t=T(), box=$("ai-body"); if(!box) return;
  if(aiState==="loading"){ box.innerHTML=`<p class="note"><span class="spin"></span>${t.aiWait}</p>`; return; }
  if(aiState==="done"&&aiHtmlCache){ box.innerHTML=aiHtmlCache(); bindCopy(); return; }
  if(aiState==="nosupport"){ box.innerHTML=`<p class="note">${t.aiNo}</p>`; return; }
  box.innerHTML=`<button type="button" class="btn ghost" id="ai-go">${t.aiBtn}</button>${aiState==="error"?`<p class="err" style="margin-top:8px">${aiErr||t.aiFail}</p>`:""}`;
  $("ai-go").onclick=generateAi;
}
let aiErr="";
let aiData=null;
async function generateAi(){
  const sample=await getSample();
  if(!sample){ aiState="error"; aiErr=localMsg(); renderAi(); return; }
  aiState="loading"; aiErr=""; renderAi();
  const r=result, kwMiss=r.kw?r.kw.list.filter(x=>!x.found).map(x=>x.display):[];
  const probs=r.checks.filter(c=>c.status!=="pass").map(c=>c.title.en+": "+c.detail.en);
  const outLang=lang==="pt"?"português do Brasil":"English";
  const prompt=`You are an expert resume coach who knows how applicant tracking systems (ATS) work. Answer directly, without showing your reasoning.
Write all your output in ${outLang}.
The candidate targets jobs in the field "${UI.en.segs[$("seg").value]}" and the market is ${lang==="en"?"international (US/Canada/UK conventions: 1-2 pages, no photo or personal data, quantified achievements)":"Brazil"}. Follow that market's resume conventions and use field-appropriate terms.
Use ONLY facts that already appear in the resume. Never invent employers, dates, tools, degrees or numbers. Where a number would help but is missing, use a placeholder like [X%] for the candidate to fill in.
Return ONLY one JSON object, with no markdown fences and no commentary, in exactly this shape:
{"summary":"rewritten professional summary, 3-4 lines, ATS-friendly","improvements":[{"section":"name","issue":"what is weak","suggestion":"what to change"}],"bullets":[{"before":"original bullet from the resume","after":"stronger rewrite starting with an action verb"}],"keywords":[{"term":"keyword","where":"where in the resume it could honestly go"}]}
Limits: up to 5 improvements, 4 bullets, 8 keywords. Keywords must come from the job's missing terms and only if the resume gives a plausible basis.

FORMAT PROBLEMS FOUND BY THE CHECKER:
${probs.join("\n")||"none"}

MISSING JOB KEYWORDS:
${kwMiss.join(", ")||"(no job provided)"}

JOB DESCRIPTION:
${($("job").value||"(none)").slice(0,5000)}

RESUME TEXT:
${r.text.slice(0,12000)}`;
  try{
    const res=await sample(prompt,{modelTier:"default",cache:false});
    const raw=(res&&res.text)||"";
    const m=raw.match(/\{[\s\S]*\}/); if(!m) throw new Error("parse");
    aiData=JSON.parse(m[0]);
    aiHtmlCache=aiMarkup; aiState="done";
  }catch(e){
    aiState="error";
    aiErr=(e&&e.code==="local_error")?String(e.message):"";
  }
  renderAi();
}
function aiMarkup(){
  const t=T(), d=aiData||{};
  let o="";
  if(d.summary) o+=`<div class="ai-block"><h3>${t.aiSummary}</h3><p>${h(String(d.summary))}</p><button type="button" class="link" data-copy="${h(String(d.summary))}">${t.copy}</button></div>`;
  if(Array.isArray(d.improvements)&&d.improvements.length) o+=`<div class="ai-block"><h3>${t.aiImp}</h3>${d.improvements.map(x=>`<p><b>${h(String(x.section||""))}:</b> ${h(String(x.issue||""))} ${h(String(x.suggestion||""))}</p>`).join("")}</div>`;
  if(Array.isArray(d.bullets)&&d.bullets.length) o+=`<div class="ai-block"><h3>${t.aiBul}</h3>${d.bullets.map(x=>`<div class="ai-pair"><div class="before"><small>${t.before}</small>${h(String(x.before||""))}</div><div class="after"><small>${t.after}</small>${h(String(x.after||""))}</div></div>`).join("")}</div>`;
  if(Array.isArray(d.keywords)&&d.keywords.length) o+=`<div class="ai-block"><h3>${t.aiKw}</h3>${d.keywords.map(x=>`<p><span class="chip no">${h(String(x.term||""))}</span> ${h(String(x.where||""))}</p>`).join("")}</div>`;
  return o||`<p class="note">${t.aiFail}</p>`;
}
function bindCopy(){
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{
    try{ await navigator.clipboard.writeText(b.dataset.copy); b.textContent=T().copied; setTimeout(()=>b.textContent=T().copy,1500); }catch(e){}
  });
}
