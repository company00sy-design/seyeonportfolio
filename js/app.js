async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

function cardHTML({title, desc, href, thumb, tags=[]}){
  const tagHtml = (tags || []).slice(0,4).map(t => `<span class="tag">${t}</span>`).join("");
  const img = thumb ? `<img src="${thumb}" alt="">` : "";
  return `
    <a class="card reveal" href="${href}" target="_blank" rel="noopener">
      <div class="thumb">${img}</div>
      <h3>${title}</h3>
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
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

function mountNavActive(){
  const path = location.pathname.replace(/\/+$/, "");
  document.querySelectorAll(".nav a").forEach(a=>{
    const href = (new URL(a.href)).pathname.replace(/\/+$/, "");
    if(href === path) a.classList.add("active");
  });
}

function mountWorkFilter(items){
  const grid = document.querySelector("#workGridAll");
  const filters = document.querySelector("#filters");
  if(!grid || !filters) return;

  const allTags = Array.from(new Set(items.flatMap(x => x.tags || [])));
  const tags = ["All", ...allTags];

  filters.innerHTML = tags.map(t =>
    `<button class="fbtn ${t==="All"?"active":""}" data-tag="${t}">${t}</button>`
  ).join("");

  const render = (tag) => {
    const filtered = tag === "All" ? items : items.filter(x => (x.tags||[]).includes(tag));
    grid.innerHTML = filtered.map(cardHTML).join("");
    mountReveal();
  };

  filters.addEventListener("click", (e)=>{
    const btn = e.target.closest(".fbtn");
    if(!btn) return;
    filters.querySelectorAll(".fbtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    render(btn.dataset.tag);
  });

  render("All");
}

async function init(){
  mountNavActive();

  const isHome = document.querySelector("#home");
  const isWork = document.querySelector("#work");
  const isWriting = document.querySelector("#writing");

  const [works, posts, sns] = await Promise.all([
    loadJSON("/data/works.json"),
    loadJSON("/data/posts.json"),
    loadJSON("/data/sns.json"),
  ]);

  if(isHome){
    document.querySelector("#workGrid").innerHTML = works.slice(0,6).map(cardHTML).join("");
    document.querySelector("#postGrid").innerHTML = posts.slice(0,6).map(cardHTML).join("");
    document.querySelector("#snsGrid").innerHTML = sns.slice(0,6).map(cardHTML).join("");
    mountReveal();
  }

  if(isWork){
    mountWorkFilter(works);
  }

  if(isWriting){
    document.querySelector("#postGridAll").innerHTML = posts.map(cardHTML).join("");
    mountReveal();
  }
}

init().catch(console.warn);
