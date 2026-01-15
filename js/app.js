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

        // ✅ 스킬바면 막대 애니메이션 실행
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




