async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed: ${path}`);
  return res.json();
}

function normalizeHrefTarget(href=""){
  const isHttp = href.startsWith("http://") || href.startsWith("https://");
  return isHttp ? { target: "_blank", rel: "noopener" } : { target: "_self", rel: "" };
}

function inferWorkType(item){
  const href = item?.href || "";
  // 내부 케이스: projects 폴더로 가면 Case Study로 분류
  if(href.includes("./projects/") || href.includes("/projects/")) return "case";
  return item?.type || "highlight";
}

function cardHTML({title, desc, href, thumb, tags=[]}){
  const t = normalizeHrefTarget(href || "#");
  const tagHtml = (tags||[]).slice(0,4).map(x=>`<span class="tag">${x}</span>`).join("");
  const img = thumb ? `<img src="${thumb}" alt="">` : "";
  return `
    <a class="card reveal" href="${href || "#"}" target="${t.target}" rel="${t.rel}">
      <div class="thumb">${img}</div>
      <h3>${title || ""}</h3>
      <p>${desc || ""}</p>
      <div class="tagrow">${tagHtml}</div>
    </a>
  `;
}

function mountReveal(){
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add("is-in");

        // ✅ 스킬바면 오버슈트 + 카운트업 실행
        if(e.target.classList.contains("skillbar")) animateSkillBar(e.target);

        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

function smoothTo(selector){
  const el = document.querySelector(selector);
  if(!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPanel(id, on){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.toggle("is-open", on);
  el.setAttribute("aria-hidden", on ? "false" : "true");
}

function wireUI(){
  // Drawer
  document.getElementById("btnMenu")?.addEventListener("click", ()=> openPanel("drawer", true));
  document.querySelectorAll('[data-close="drawer"]').forEach(x=>{
    x.addEventListener("click", ()=> openPanel("drawer", false));
  });
  document.querySelectorAll(".drawer-link").forEach(a=>{
    a.addEventListener("click", (e)=>{
      const href = a.getAttribute("href");
      if(href?.startsWith("#")){
        e.preventDefault();
        openPanel("drawer", false);
        smoothTo(href);
      }
    });
  });

  // Search
  document.getElementById("btnSearch")?.addEventListener("click", ()=>{
    openPanel("searchOverlay", true);
    setTimeout(()=> document.getElementById("searchInput")?.focus(), 0);
  });
  document.querySelectorAll('[data-close="search"]').forEach(x=>{
    x.addEventListener("click", ()=> openPanel("searchOverlay", false));
  });

  // Header nav smooth scroll
  document.querySelectorAll('.gnb-link').forEach(a=>{
    a.addEventListener("click", (e)=>{
      const href = a.getAttribute("href");
      if(href?.startsWith("#")){
        e.preventDefault();
        smoothTo(href);
      }
    });
  });

  // Top / Bottom
  document.getElementById("btnTop")?.addEventListener("click", ()=> smoothTo("#top"));
  document.getElementById("btnBottom")?.addEventListener("click", ()=>{
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });

  // Seg toggle
  document.querySelectorAll(".seg-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      const caseGrid = document.getElementById("caseGrid");
      const hiGrid = document.getElementById("highlightGrid");

      if(tab === "case"){
        if(caseGrid) caseGrid.style.display = "";
        if(hiGrid) hiGrid.style.display = "none";
      } else {
        if(caseGrid) caseGrid.style.display = "none";
        if(hiGrid) hiGrid.style.display = "";
      }
    });
  });
}

function applySearchFilter(items, q){
  const query = (q||"").trim().toLowerCase();
  if(!query) return items;
  return items.filter(item=>{
    const t = (item.title||"").toLowerCase();
    const d = (item.desc||"").toLowerCase();
    const tags = (item.tags||[]).join(" ").toLowerCase();
    return (t + " " + d + " " + tags).includes(query);
  });
}

function mountYear(){
  const y = new Date().getFullYear();
  document.getElementById("yearA") && (document.getElementById("yearA").textContent = String(y));
  document.getElementById("yearB") && (document.getElementById("yearB").textContent = String(y));
}

async function init(){
  mountYear();
  wireUI();
  mountSkillBars();

  const [works, posts, sns] = await Promise.all([
    loadJSON("./data/works.json"),
    loadJSON("./data/posts.json"),
    loadJSON("./data/sns.json"),
  ]);

  // Work split
  const cases = works.filter(w => inferWorkType(w) === "case");
  const highlights = works.filter(w => inferWorkType(w) !== "case");

  const caseGrid = document.getElementById("caseGrid");
  const hiGrid = document.getElementById("highlightGrid");
  if(caseGrid) caseGrid.innerHTML = (cases.length ? cases : works).map(cardHTML).join("");
  if(hiGrid) hiGrid.innerHTML = (highlights.length ? highlights : works).map(cardHTML).join("");

  // Writing / SNS
  const postGrid = document.getElementById("postGrid");
  const snsGrid = document.getElementById("snsGrid");
  if(postGrid) postGrid.innerHTML = posts.map(cardHTML).join("");
  if(snsGrid) snsGrid.innerHTML = sns.map(cardHTML).join("");

  // Search
  const si = document.getElementById("searchInput");
  const searchGrid = document.getElementById("searchGrid");
  const searchMeta = document.getElementById("searchMeta");

  const allCards = [
    ...works.map(w => ({...w, __group:"Work"})),
    ...posts.map(p => ({...p, __group:"Writing"})),
    ...sns.map(s => ({...s, __group:"SNS"})),
  ];

  const renderSearch = (q)=>{
    const filtered = applySearchFilter(allCards, q);
    if(searchMeta){
      if(!q.trim()) searchMeta.textContent = "검색어를 입력하면 결과가 표시됩니다.";
      else searchMeta.textContent = `“${q}” 결과 ${filtered.length}개`;
    }
    if(searchGrid){
      searchGrid.innerHTML = filtered.slice(0, 18).map(cardHTML).join("");
    }
    mountReveal();
  };

  si?.addEventListener("input", ()=> renderSearch(si.value));

  // Reveal
  mountReveal();
}

init().catch((err)=>{
  console.warn(err);
  // 최소한 페이지는 뜨게 두고, 데이터 로드 실패만 안내
  const caseGrid = document.getElementById("caseGrid");
  if(caseGrid) caseGrid.innerHTML = `<div class="card">데이터를 불러오지 못했습니다. (data/*.json 경로 확인)</div>`;
  mountReveal();
});



function mountSkillBars(){
  document.querySelectorAll(".skillbar").forEach(el=>{
    const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
    el.style.setProperty("--level", String(lv));
    const out = el.querySelector(".skill-out");
    if(out) out.textContent = `${lv}%`;
  });
}

function animateSkillBar(el){
  const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
  const fill = el.querySelector(".bar-fill");
  const out = el.querySelector(".skill-out");

  if(out) out.textContent = `${lv}%`;

  if(fill){
    // 처음 0%에서 다음 프레임에 lv%로 바꿔서 애니메이션이 확실히 걸리게 함
    fill.style.width = "0%";
    requestAnimationFrame(() => {
      fill.style.width = `${lv}%`;
    });
  }
}


function animateCountUp(el, to, duration = 900){
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(reduced){
    el.textContent = `${to}%`;
    return;
  }

  const from = 0;
  const start = performance.now();

  function tick(now){
    const t = Math.min(1, (now - start) / duration);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = `${value}%`;
    if(t < 1) requestAnimationFrame(tick);
  }

  el.textContent = "0%";
  requestAnimationFrame(tick);
}

function animateSkillBar(el){
  const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
  const fill = el.querySelector(".bar-fill");
  const out = el.querySelector(".skill-out");

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // 숫자 카운트업
  if(out) animateCountUp(out, lv, 900);

  if(!fill) return;

  if(reduced){
    fill.style.width = `${lv}%`;
    return;
  }

  // 오버슈트 폭(너무 과하면 촌스러워서 2~4 정도 추천)
  const overshoot = Math.min(100, lv + 3);

  // 1) 0에서 시작
  fill.style.width = "0%";

  // 2) 다음 프레임에 오버슈트까지 채우기
  requestAnimationFrame(() => {
    fill.style.width = `${overshoot}%`;
  });

  // 3) 살짝 딜레이 후, 목표값으로 “툭” 내려오기
  //    (0.9s transition 기준으로 650ms쯤이 자연스러움)
  setTimeout(() => {
    // 내려올 때는 조금 더 빠르게
    fill.style.transition = "width .25s ease-out";
    fill.style.width = `${lv}%`;

    // 다음 애니메이션을 위해 transition 원복
    setTimeout(() => {
      fill.style.transition = ""; // CSS 기본값으로 돌아감
    }, 260);
  }, 650);
}

function animateSkillBar(el){
  if(el.dataset.animated === "1") return; // 한 번만
  el.dataset.animated = "1";

  const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
  const fill = el.querySelector(".bar-fill");
  const out = el.querySelector(".skill-out");

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // 숫자 카운트업(이미 함수 있으면 그대로 사용)
  if(out) animateCountUp(out, lv, 900);

  if(!fill) return;

  if(reduced){
    fill.style.width = `${lv}%`;
    return;
  }

  // 오버슈트 정도 (원하면 6~12 사이로 조절)
  const overshoot = lv >= 85 ? 6 : lv >= 70 ? 9 : 12; // 낮을수록 더 튐
  const over = Math.min(100, lv + overshoot);

  // 1) 올라가는 시간 / 2) 내려오는 시간
  const upDur = 520;    // 오버슈트까지 빠르게
  const downDur = 220;  // 살짝 튕기듯 내려오기

  // 0에서 시작
  fill.style.width = "0%";

  // 오버슈트로 올라가기(먼저 transition을 up으로)
  fill.style.transition = `width ${upDur}ms cubic-bezier(.2,.8,.2,1)`;
  fill.getBoundingClientRect(); // 강제 리플로우(transition 확실히 먹이기)
  fill.style.width = `${over}%`;

  // 오버슈트까지 도달한 뒤에 내려오기
  setTimeout(() => {
    fill.style.transition = `width ${downDur}ms ease-out`;
    fill.getBoundingClientRect();
    fill.style.width = `${lv}%`;

    // 원래 CSS transition으로 복귀(다음 요소 영향 방지)
    setTimeout(() => {
      fill.style.transition = "";
    }, downDur + 30);
  }, upDur + 30);
}






