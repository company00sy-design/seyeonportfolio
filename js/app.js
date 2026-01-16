async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed: ${path}`);
  return res.json();
}

function normalizeHrefTarget(href=""){
  const isHttp = href.startsWith("http://") || href.startsWith("https://");
  return isHttp ? { target: "_blank", rel: "noopener" } : { target: "_self", rel: "" };
}

function inferWorkCategory(item){
  const c = (item?.category || "").toLowerCase();
  if(["design","web","content"].includes(c)) return c;

  const href = item?.href || "";
  const tags = (item?.tags || []).join(" ").toLowerCase();
  const title = (item?.title || "").toLowerCase();
  const desc = (item?.desc || "").toLowerCase();
  const hay = `${title} ${desc} ${tags}`;

  // 컨텐츠 계열 키워드
  if (/(reels|shorts|youtube|유튜브|릴스|sns|인스타|instagram|블로그|blog|피드)/.test(hay)) return "content";

  // projects로 분리된 상세 페이지는 웹/프로젝트 성격으로 간주(필요하면 바꿔도 됨)
  if (href.includes("./projects/") || href.includes("/projects/")) return "web";

  // 기본은 디자인
  return "design";
}

function cardHTML({title, desc, href, thumb, tags=[]}){
  const realHref = href && String(href).trim() ? href : "#";
  const t = normalizeHrefTarget(realHref);

  const tagHtml = (tags||[]).slice(0,4).map(x=>`<span class="tag">${x}</span>`).join("");
  const img = thumb
    ? `<img src="${thumb}" alt="${title || ""}" loading="lazy" decoding="async">`
    : "";

  const disabled = (realHref === "#") ? 'data-disabled="true"' : "";

  return `
    <a class="card reveal" href="${realHref}" target="${t.target}" rel="${t.rel}" ${disabled}>
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

function setWorkTab(tab){
  const tabs = ["design","web","content"];
  tabs.forEach(t=>{
    const grid = document.getElementById(`${t}Grid`);
    const btn = document.querySelector(`.seg-btn[data-tab="${t}"]`);
    const on = (t === tab);

    if(grid) grid.style.display = on ? "" : "none";
    if(btn){
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
  });
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

  // Work tabs (Design/Web/Content)
  document.querySelectorAll(".seg-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setWorkTab(btn.dataset.tab);
    });
  });

  // href="#" 카드 클릭 방지
  document.addEventListener("click", (e)=>{
    const a = e.target.closest('a.card[data-disabled="true"]');
    if(a){
      e.preventDefault();
    }
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

function mountSkillBars(){
  document.querySelectorAll(".skillbar").forEach(el=>{
    const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
    el.style.setProperty("--level", String(lv));
    const out = el.querySelector(".skill-out");
    if(out) out.textContent = `${lv}%`;
  });
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
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = `${value}%`;
    if(t < 1) requestAnimationFrame(tick);
  }

  el.textContent = "0%";
  requestAnimationFrame(tick);
}

function animateSkillBar(el){
  if(el.dataset.animated === "1") return;
  el.dataset.animated = "1";

  const lv = Math.max(0, Math.min(100, Number(el.dataset.level || 0)));
  const fill = el.querySelector(".bar-fill");
  const out = el.querySelector(".skill-out");

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(out) animateCountUp(out, lv, 900);

  if(!fill) return;
  if(reduced){
    fill.style.width = `${lv}%`;
    return;
  }

  // 오버슈트(너무 과하면 촌스러워서 6~12 안쪽)
  const overshoot = lv >= 85 ? 6 : lv >= 70 ? 9 : 12;
  const over = Math.min(100, lv + overshoot);

  const upDur = 520;
  const downDur = 220;

  fill.style.width = "0%";
  fill.style.transition = `width ${upDur}ms cubic-bezier(.2,.8,.2,1)`;
  fill.getBoundingClientRect();
  fill.style.width = `${over}%`;

  setTimeout(() => {
    fill.style.transition = `width ${downDur}ms ease-out`;
    fill.getBoundingClientRect();
    fill.style.width = `${lv}%`;

    setTimeout(() => {
      fill.style.transition = "";
    }, downDur + 30);
  }, upDur + 30);
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

  // Work 분류(Design/Web/Content)
  const design = [];
  const web = [];
  const content = [];
  works.forEach(w=>{
    const cat = inferWorkCategory(w);
    (cat === "web" ? web : cat === "content" ? content : design).push(w);
  });

  const designGrid = document.getElementById("designGrid");
  const webGrid = document.getElementById("webGrid");
  const contentGrid = document.getElementById("contentGrid");

  if(designGrid) designGrid.innerHTML = design.map(cardHTML).join("");
  if(webGrid) webGrid.innerHTML = web.map(cardHTML).join("");
  if(contentGrid) contentGrid.innerHTML = content.map(cardHTML).join("");

  // 기본 탭: Design
  setWorkTab("design");

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
  const designGrid = document.getElementById("designGrid");
  if(designGrid) designGrid.innerHTML = `<div class="card">데이터를 불러오지 못했습니다. (data/*.json 경로 확인)</div>`;
  mountReveal();
});
