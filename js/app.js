function getBasePath(){
  // GitHub Pages: https://id.github.io/repo/...
  // pathname 첫 조각이 repo명이므로 자동 추론
  const repo = location.pathname.split("/")[1];
  return repo ? `/${repo}/` : `/`;
}

async function loadJSON(path){
  const base = getBasePath();
  const url = new URL(path.replace(/^\.\//, ""), location.origin + base); // "data/works.json"
  const res = await fetch(url, { cache: "no-store" });

  if(!res.ok){
    throw new Error(`HTTP ${res.status} (${res.statusText}) - ${url.pathname}`);
  }

  const text = await res.text();
  try{
    return JSON.parse(text);
  }catch(e){
    throw new Error(`JSON parse error - ${url.pathname}\n${e.message}`);
  }
}

function normalizeHrefTarget(href=""){
  const isHttp = href.startsWith("http://") || href.startsWith("https://");
  return isHttp ? { target: "_blank", rel: "noopener" } : { target: "_self", rel: "" };
}

function fixInternalHref(href=""){
  // works.json에서 "projects/project-01.html" 같이 넣어도
  // GitHub Pages 서브폴더(/repo/) 아래로 안전하게 붙여줌
  if(!href) return "#";
  if(href.startsWith("http://") || href.startsWith("https://")) return href;

  const base = getBasePath();
  if(href.startsWith("./")) href = href.slice(2);

  // 이미 "seyeonportfolio/..." 같은 절대가 들어가면 그대로 둠
  if(href.startsWith(base.replace(/^\//,""))) return `/${href}`;

  // 루트절대("/projects/...")는 repo 루트로 보정
  if(href.startsWith("/")) href = href.replace(/^\//, "");

  return base + href; // "/seyeonportfolio/" + "projects/project-01.html"
}

function cardHTML({title, desc, href, thumb, tags=[]}){
  const fixedHref = fixInternalHref(href || "#");
  const t = normalizeHrefTarget(fixedHref);
  const tagHtml = (tags||[]).slice(0,4).map(x=>`<span class="tag">${x}</span>`).join("");
  const img = thumb ? `<img src="${fixInternalHref(thumb)}" alt="">` : "";
  return `
    <a class="card reveal" href="${fixedHref}" target="${t.target}" rel="${t.rel}">
      <div class="thumb">${img}</div>
      <h3>${title || ""}</h3>
      <p>${desc || ""}</p>
      <div class="tagrow">${tagHtml}</div>
    </a>
  `;
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
  const a = document.getElementById("yearA");
  const b = document.getElementById("yearB");
  if(a) a.textContent = String(y);
  if(b) b.textContent = String(y);
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
  document.getElementById("btnMenu")?.addEventListener("click", ()=> openPanel("drawer", true));
  document.querySelectorAll('[data-close="drawer"]').forEach(x=>{
    x.addEventListener("click", ()=> openPanel("drawer", false));
  });

  document.getElementById("btnSearch")?.addEventListener("click", ()=>{
    openPanel("searchOverlay", true);
    setTimeout(()=> document.getElementById("searchInput")?.focus(), 0);
  });
  document.querySelectorAll('[data-close="search"]').forEach(x=>{
    x.addEventListener("click", ()=> openPanel("searchOverlay", false));
  });

  document.querySelectorAll(".drawer-link, .gnb-link").forEach(a=>{
    a.addEventListener("click", (e)=>{
      const href = a.getAttribute("href");
      if(href?.startsWith("#")){
        e.preventDefault();
        openPanel("drawer", false);
        smoothTo(href);
      }
    });
  });

  document.getElementById("btnTop")?.addEventListener("click", ()=> smoothTo("#top"));
  document.getElementById("btnBottom")?.addEventListener("click", ()=>{
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
}

/* reveal */
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

/* skill bars (단일 정의) */
function animateCountUp(el, to, duration = 900){
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(reduced){
    el.textContent = `${to}%`;
    return;
  }
  const start = performance.now();
  function tick(now){
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(to * eased);
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

  // “툭 내려오는” 느낌 더 보이게 (살짝 크게)
  const over = Math.min(100, lv + 10);

  fill.style.width = "0%";
  fill.style.transition = "width 520ms cubic-bezier(.2,.8,.2,1)";
  fill.getBoundingClientRect();
  fill.style.width = `${over}%`;

  setTimeout(() => {
    fill.style.transition = "width 240ms ease-out";
    fill.getBoundingClientRect();
    fill.style.width = `${lv}%`;
    setTimeout(()=>{ fill.style.transition = ""; }, 260);
  }, 560);
}

async function init(){
  mountYear();
  wireUI();

  // ✅ works/sns만 로드 (Writing 제거했을 때 posts.json 때문에 전체가 죽는 문제 방지)
  const [works, sns] = await Promise.all([
    loadJSON("data/works.json"),
    loadJSON("data/sns.json")
  ]);

  // Work 렌더 + 카테고리 필터
  const workGrid = document.getElementById("workGrid");
  const snsGrid = document.getElementById("snsGrid");

  let currentCat = "all";

  function renderWork(){
    const list = currentCat === "all"
      ? works
      : works.filter(w => (w.category || "").toLowerCase() === currentCat);

    if(workGrid){
      workGrid.innerHTML = (list.length ? list : works).map(cardHTML).join("");
    }
    mountReveal();
  }

  document.querySelectorAll(".seg-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".seg-btn").forEach(b=>{
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      currentCat = btn.dataset.cat || "all";
      renderWork();
    });
  });

  renderWork();

  // SNS
  if(snsGrid) snsGrid.innerHTML = sns.map(cardHTML).join("");

  // Search (Work + SNS만)
  const si = document.getElementById("searchInput");
  const searchGrid = document.getElementById("searchGrid");
  const searchMeta = document.getElementById("searchMeta");

  const allCards = [
    ...works.map(w => ({...w, __group:"Work"})),
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

  mountReveal();
}

init().catch((err)=>{
  console.warn(err);
  const workGrid = document.getElementById("workGrid");
  if(workGrid){
    workGrid.innerHTML =
      `<div class="card">데이터를 불러오지 못했습니다.<br><span class="muted">${String(err.message).replace(/\n/g,"<br>")}</span></div>`;
  }
  mountReveal();
});
