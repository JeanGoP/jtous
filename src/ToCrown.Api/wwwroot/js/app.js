const App = {
  db: null,
  route: "dashboard",
  champFilters: { city: "", org: "", from: "", to: "" },
  filterTimer: null,

  async init() {
    if (!Api.token || !Api.user) return this.loginView();
    try {
      this.db = await Api.snapshot();
      this.route = this.isAdmin() ? "dashboard" : "my-profile";
      this.shell();
    } catch {
      this.loginView();
    }
  },

  money(value) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
  },
  esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  },
  initials(name) {
    return String(name || "?").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();
  },
  playerName(id) {
    return this.db.players.find(player => player.id === id)?.fullName || "Sin jugadora";
  },
  userByPlayer(id) {
    const player = this.db.players.find(item => item.id === id);
    return player ? this.db.users.find(user => user.id === player.userId) : null;
  },
  pending(playerId) {
    return this.db.payments.filter(p => p.playerId === playerId).reduce((s, p) => s + Math.max(0, p.amount - p.paid), 0);
  },
  isAdmin() {
    return ["admin", "superadmin"].includes(Api.user?.role);
  },

  loginView() {
    document.getElementById("app").innerHTML = `
      <main class="screen login">
        <div class="hex"></div><div class="hex"></div><div class="hex"></div><div class="hex"></div><div class="hex"></div>
        <form class="login-card" id="loginForm">
          <img src="/assets/logo.jpeg" alt="ToCrown">
          <h1>ToCrown</h1>
          <p class="subtitle">Club Deportivo de Voleibol</p>
          <div id="loginMsg"></div>
          <div class="form-group"><label>Usuario</label><input class="form-control" name="email" type="text" placeholder="admin@tocrown.com o documento" required></div>
          <div class="form-group"><label>Contrasena</label><input class="form-control" name="password" type="password" placeholder="qwerty12345" required></div>
          <button class="btn-primary" type="submit">Ingresar al Sistema</button>
        </form>
      </main>`;
    document.getElementById("loginForm").onsubmit = event => this.login(event);
  },

  async login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await Api.login(form.get("email"), form.get("password"));
      this.db = await Api.snapshot();
      this.route = this.isAdmin() ? "dashboard" : "my-profile";
      this.shell();
    } catch {
      document.getElementById("loginMsg").innerHTML = `<div class="alert error">Usuario inactivo o credenciales incorrectas.</div>`;
    }
  },

  shell() {
    const admin = this.isAdmin();
    const nav = admin
      ? [["dashboard","Dashboard"],["users","Usuarios"],["players","Jugadoras"],["player360","♛ Jugador 360"],["championships","Campeonatos"],["payments","Cartera"],["requests","Solicitudes"],["news","Noticias"]]
      : [["my-profile","Mi Perfil"],["my-payments","Mensualidades"],["my-requests","Solicitudes"],["my-championships","Campeonatos"]];
    document.getElementById("app").innerHTML = `
      <div class="app-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo"><img src="/assets/logo.jpeg" alt="ToCrown"><div class="sidebar-logo-text"><div class="club-name">To Crown</div><div class="club-sub">Club de Voleibol</div></div></div>
          <div class="sidebar-user"><div class="avatar">${this.initials(Api.user.name)}</div><div class="sidebar-user-info"><div class="name">${this.esc(Api.user.name)}</div><div class="role">${Api.user.role === "superadmin" ? "Super administrador" : admin ? "Administrador" : "Jugadora"}</div></div></div>
          <nav class="sidebar-nav"><div class="nav-section-title">${admin ? "Principal" : "Mi cuenta"}</div>${nav.map(([r,l]) => `<button class="nav-item" data-route="${r}">${l}</button>`).join("")}</nav>
          <div class="sidebar-bottom"><button class="btn-logout" onclick="App.logout()">Cerrar Sesion</button></div>
        </aside>
        <div class="topbar">
          <div style="display:flex;align-items:center;gap:10px"><button class="btn-sm outline mobile-menu" onclick="sidebar.classList.toggle('open')">Menu</button><div class="topbar-title" id="title"></div></div>
          <div class="topbar-right">
            <div class="topbar-actions" id="actions"></div>
            <div class="dropdown">
              <button class="profile-menu-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false"><img src="/assets/logo.jpeg" alt="Usuario"></button>
              <div class="dropdown-menu dropdown-menu-end shadow-sm user-dropdown">
                <div class="px-3 py-2"><strong>${this.esc(Api.user.name)}</strong><br><span class="muted">${Api.user.role === "superadmin" ? "Super administrador" : admin ? "Administrador" : "Jugadora"}</span></div>
                <hr class="dropdown-divider">
                <button class="dropdown-item" type="button" onclick="App.openChangePassword()">Cambiar contrasena</button>
                <button class="dropdown-item text-danger" type="button" onclick="App.logout()">Cerrar sesion</button>
              </div>
            </div>
          </div>
        </div>
        <main class="main-content"><div class="page-body" id="view"></div></main>
      </div>`;
    document.querySelectorAll(".nav-item").forEach(btn => btn.onclick = () => this.go(btn.dataset.route));
    this.go(this.route);
  },

  async refresh() {
    this.db = await Api.snapshot();
    this.go(this.route);
  },
  logout() {
    Api.logout();
    this.loginView();
  },
  go(route) {
    this.route = route;
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.route === route));
    document.getElementById("actions").innerHTML = "";
    const map = {
      dashboard: () => this.dashboard(), users: () => this.users(), players: () => this.playersCards(), player360: () => this.player360(),
      championships: () => this.championshipsCards(), payments: () => this.payments(), requests: () => this.requests(), news: () => this.news(),
      "my-profile": () => this.myProfile(), "my-payments": () => this.myPayments(),
      "my-requests": () => this.myRequests(), "my-championships": () => this.myChampionships()
    };
    map[route]();
  },
  title(text) { document.getElementById("title").textContent = text; },
  actions(html) { document.getElementById("actions").innerHTML = html; },
  view(html) { document.getElementById("view").innerHTML = html; },

  dashboard() {
    this.title("Dashboard");
    const pending = this.db.payments.reduce((s,p) => s + Math.max(0, p.amount - p.paid), 0);
    this.view(`
      <div class="stats-grid">
        ${this.stat("Jugadoras", this.db.players.length, "Activas en el sistema", "green")}
        ${this.stat("Campeonatos", this.db.championships.length, "Registrados", "gold")}
        ${this.stat("Cartera", this.money(pending), "Saldo pendiente", "blue")}
        ${this.stat("Solicitudes", this.db.requests.length, "Uniformes e implementos", "purple")}
      </div>
      <div class="two-col">
        <div class="card"><div class="card-header"><div class="card-title">Campeonatos Activos</div><button class="btn-sm gold" onclick="App.openChamp()">Nuevo</button></div><div class="card-body">${this.champCards(this.db.championships.slice(0,3), false)}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">Noticias del club</div><button class="btn-sm green" onclick="App.go('news')">Gestionar</button></div><div class="card-body">${this.newsSlider()}</div></div>
      </div>`);
  },

  users() {
    this.title("Usuarios");
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer()">Crear usuario</button>`);
    const term = (document.getElementById("userSearch")?.value || "").toLowerCase();
    const users = this.db.users.filter(user => [user.name, user.email, user.role].join(" ").toLowerCase().includes(term));
    const rows = this.db.users.map(user => {
      const player = this.db.players.find(p => p.userId === user.id);
      if (!users.includes(user)) return "";
      return `<tr><td><div class="person"><div class="avatar">${this.initials(user.name)}</div><div><b>${this.esc(user.name)}</b><br><span class="muted">${this.esc(user.email)}</span></div></div></td><td><span class="pill ${user.role !== "player" ? "pill-gold" : "pill-green"}">${user.role}</span></td><td><span class="pill ${user.enabled ? "pill-green" : "pill-red"}">${user.enabled ? "Activo" : "Inactivo"}</span></td><td>${player ? this.esc(player.position) : "Sistema"}</td><td>${player ? `<button class="icon-action" title="Editar" onclick="App.openPlayer('${player.id}')">✎</button> <button class="icon-action ${user.enabled ? "ok" : "off"}" title="Cambiar estado" onclick="App.confirmToggleUser('${user.id}')">${user.enabled ? "✓" : "×"}</button>` : ""}</td></tr>`;
    }).join("");
    this.view(`<div class="toolbar"><input id="userSearch" class="form-control" placeholder="Buscar usuario por nombre, correo o perfil" value="${this.esc(document.getElementById("userSearch")?.value || "")}" oninput="App.users()"></div>${this.table(["Usuario","Perfil","Estado","Detalle",""], rows)}`);
  },

  players() {
    this.title("Jugadoras");
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer()">Nueva Jugadora</button>`);
    this.view(`<div class="player-grid">${this.db.players.map(p => {
      const user = this.userByPlayer(p.id);
      return `<div class="card player-card"><div class="cover"><div class="avatar">${p.photo ? `<img src="${p.photo}">` : this.initials(p.fullName)}</div></div><div class="info"><h3>${this.esc(p.fullName)}</h3><p class="muted">${this.esc(p.position)} · #${this.esc(p.number)} · ${this.esc(p.category)}</p><span class="pill ${user?.enabled ? "pill-green" : "pill-red"}">${user?.enabled ? p.status : "Acceso bloqueado"}</span><span class="pill pill-gold">Debe ${this.money(this.pending(p.id))}</span><div class="actions"><button class="btn-sm green" onclick="App.openPlayer('${p.id}')">Editar</button><button class="btn-sm outline" onclick="App.go('championships')">Campeonatos</button></div></div></div>`;
    }).join("")}<div class="card player-card" style="display:flex;align-items:center;justify-content:center;min-height:220px;border:2px dashed var(--gray-200);cursor:pointer" onclick="App.openPlayer()"><b>+ Agregar jugadora</b></div></div>`);
  },

  playersCards() {
    this.title("Jugadoras");
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer()">Nueva Jugadora</button>`);
    const q = (document.getElementById("playerSearch")?.value || "").toLowerCase();
    const filtered = this.db.players.filter(p => [p.document, p.fullName, p.firstName, p.firstLastName, p.secondLastName].join(" ").toLowerCase().includes(q));
    this.view(`<div class="toolbar"><input id="playerSearch" class="form-control" placeholder="Buscar por identificacion, nombre o apellido" value="${this.esc(document.getElementById("playerSearch")?.value || "")}" oninput="App.playersCards()"></div><div class="player-grid compact">${filtered.map(p => {
      const user = this.userByPlayer(p.id);
      return `<div class="card player-card id-card" onclick="App.openPlayerInfo('${p.id}')">
        <div class="id-card-band"></div>
        <div class="id-card-photo"><img src="${this.playerPhoto(p)}" alt="${this.esc(p.fullName)}"></div>
        <div class="info">
          <h3>${this.esc(p.fullName)}</h3>
          <p class="muted">${this.esc(p.position)} - #${this.esc(p.number)} - ${this.age(p.birthDate)} anos</p>
          <span class="pill ${user?.enabled ? "pill-green" : "pill-red"}">${user?.enabled ? p.status : "Acceso bloqueado"}</span>
          <span class="pill pill-gold">Debe ${this.money(this.pending(p.id))}</span>
          <span class="pill pill-blue">${this.playerChampCount(p.id)} campeonatos</span>
          <div class="actions">
            <button class="btn-sm green" onclick="event.stopPropagation();App.openPlayer('${p.id}')">Editar</button>
          </div>
        </div>
      </div>`;
    }).join("")}<div class="card player-card" style="display:flex;align-items:center;justify-content:center;min-height:260px;border:2px dashed var(--gray-200);cursor:pointer" onclick="App.openPlayer()"><b>+ Agregar jugadora</b></div></div>`);
  },

  championships() {
    this.title("Campeonatos");
    this.actions(`<button class="btn-sm gold" onclick="App.openChamp()">Nuevo Campeonato</button>`);
    this.view(this.champCards(this.db.championships, true));
  },

  championshipsCards() {
    this.title("Campeonatos");
    this.actions(`<button class="btn-sm gold" onclick="App.openChamp()">Nuevo Campeonato</button>`);
    const city = this.champFilters.city.toLowerCase();
    const org = this.champFilters.org.toLowerCase();
    const from = this.champFilters.from;
    const to = this.champFilters.to;
    const champs = this.db.championships.filter(c =>
      (!city || c.city.toLowerCase().includes(city)) &&
      (!org || c.organizer.toLowerCase().includes(org)) &&
      (!from || c.startDate >= from) &&
      (!to || c.endDate <= to)
    );
    this.view(`<div class="toolbar champ-filter">
      <input id="champCity" class="form-control" placeholder="Ciudad" value="${this.esc(this.champFilters.city)}" oninput="App.setChampFilter('city', this.value)">
      <input id="champOrg" class="form-control" placeholder="Organizador" value="${this.esc(this.champFilters.org)}" oninput="App.setChampFilter('org', this.value)">
      <input id="champFrom" class="form-control" type="date" value="${this.esc(from)}" onchange="App.setChampFilter('from', this.value, true)">
      <input id="champTo" class="form-control" type="date" value="${this.esc(to)}" onchange="App.setChampFilter('to', this.value, true)">
    </div><div id="champResults">${this.championshipResults(champs)}</div>`);
  },

  setChampFilter(field, value, immediate = false) {
    this.champFilters[field] = value;
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => this.updateChampResults(), immediate ? 0 : 350);
  },

  updateChampResults() {
    const city = this.champFilters.city.toLowerCase();
    const org = this.champFilters.org.toLowerCase();
    const from = this.champFilters.from;
    const to = this.champFilters.to;
    const champs = this.db.championships.filter(c =>
      (!city || c.city.toLowerCase().includes(city)) &&
      (!org || c.organizer.toLowerCase().includes(org)) &&
      (!from || c.startDate >= from) &&
      (!to || c.endDate <= to)
    );
    const target = document.getElementById("champResults");
    if (target) target.innerHTML = this.championshipResults(champs);
  },

  championshipResults(champs) {
    return `<div class="champ-grid">${champs.map(c => `<div class="champ-card card-click" onclick="App.openChampInfo('${c.id}')"><div class="label">${this.esc(c.city)} - ${this.esc(c.category)}</div><div class="name">${this.esc(c.name)}</div><div class="meta"><span>${this.esc(c.organizer)}</span><span>${this.esc(c.startDate)} / ${this.esc(c.endDate)}</span><span>${this.esc(c.status)}</span></div><div style="margin-top:10px">${c.teams.map(t => `<span class="team-pill">${this.esc(t.name)}: ${t.players.length}</span>`).join("")}</div></div>`).join("") || `<div class="empty">No hay campeonatos con esos filtros.</div>`}</div>`;
  },

  openChampInfo(id) {
    const c = this.db.championships.find(x => x.id === id);
    if (!c) return;
    this.modal("Campeonato", `<div class="champ-detail">
      <h2>${this.esc(c.name)}</h2>
      ${this.summary([["Ciudad", c.city],["Lugar", c.place],["Organizador", c.organizer],["Fechas", `${c.startDate} a ${c.endDate}`],["Categoria", c.category],["Titulo ganado", c.titleWon || "Pendiente"]])}
      <div class="form-section-title">Subequipos</div>
      ${c.teams.map(t => `<div class="team-box"><b>${this.esc(t.name)}</b><div>${t.players.map(pid => `<span class="pill pill-green">${this.esc(this.playerName(pid))}</span>`).join("") || "<span class='muted'>Sin jugadoras</span>"}</div></div>`).join("")}
    </div>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cerrar</button><button class="btn-sm gold" onclick="App.closeModal();App.openChamp('${c.id}')">Gestionar</button>`);
  },

  payments() {
    this.title("Cartera");
    this.actions(`<button class="btn-sm gold" onclick="App.openWalletGeneration()">Generar cartera mensual</button><button class="btn-sm green" onclick="App.openPayment()">Registrar o confirmar pago</button>`);
    const rows = this.db.payments.map(p => `<tr><td>${this.esc(this.playerName(p.playerId))}</td><td>${this.esc(p.month)}</td><td>${this.money(p.amount)}</td><td>${this.money(p.paid)}</td><td><b>${this.money(Math.max(0,p.amount-p.paid))}</b></td><td>${this.esc(p.method)}</td><td><span class="pill ${p.confirmed ? "pill-green" : "pill-red"}">${p.confirmed ? "Confirmado" : "Pendiente"}</span></td><td><button class="btn-sm outline" onclick="App.openPayment('${p.id}')">Editar</button></td></tr>`).join("");
    this.view(this.table(["Jugadora","Mes","Valor","Pagado","Debe","Metodo","Estado",""], rows));
  },

  requests() {
    this.title("Solicitudes");
    this.actions(this.isAdmin() ? "" : `<button class="btn-sm gold" onclick="App.openRequest()">Nueva Solicitud</button>`);
    this.view(this.requestsTable(this.db.requests, true));
  },

  news() {
    this.title("Noticias");
    this.actions(`<button class="btn-sm gold" onclick="App.openNews()">Nueva noticia</button>`);
    this.view(`<div class="news-grid">${(this.db.news || []).map(n => `<div class="card news-card"><div class="news-img">${n.image ? `<img src="${n.image}">` : "ToCrown"}</div><div class="card-body"><h3>${this.esc(n.title)}</h3><p>${this.esc(n.body)}</p><span class="pill ${n.active ? "pill-green" : "pill-gray"}">${n.active ? "Activa" : "Inactiva"}</span><div class="actions"><button class="btn-sm outline" onclick="App.openNews('${n.id}')">Editar</button></div></div></div>`).join("") || `<div class="empty">Sin noticias.</div>`}</div>`);
  },

  openNews(id = "") {
    const n = id ? this.db.news.find(x => x.id === id) : { id:"", title:"", body:"", image:"", date:new Date().toISOString().slice(0,10), active:true };
    this.modal(id ? "Editar noticia" : "Nueva noticia", `<form id="newsForm" class="stack-form">
      ${this.input("title","Titulo*",n.title,true)}
      ${this.textarea("body","Descripcion",n.body)}
      ${this.input("date","Fecha",n.date,false,"date")}
      <label>Foto<input class="form-control" name="imageFile" type="file" accept="image/*"></label>
      <label class="active-toggle"><input name="active" type="checkbox" ${n.active ? "checked" : ""}> Noticia activa</label>
    </form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.saveNews('${id}')">Guardar</button>`);
  },

  async saveNews(id) {
    const form = document.getElementById("newsForm");
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const old = id ? this.db.news.find(x => x.id === id) : { id:"", image:"" };
    const file = form.imageFile.files[0];
    await Api.request("/api/admin/news", { method:"POST", body:JSON.stringify({ id, title:data.get("title"), body:data.get("body"), date:data.get("date"), active:data.get("active")==="on", image:file ? await this.file(file) : old.image }) });
    this.closeModal();
    await this.reload("news");
  },

  myProfile() {
    this.title("Mi Perfil");
    const p = this.db.player;
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer('${p.id}')">Editar mi informacion</button>`);
    this.view(`<div class="card"><div class="profile-header"><div style="display:flex;gap:18px;align-items:center"><div class="avatar avatar-lg">${p.photo ? `<img src="${p.photo}">` : this.initials(p.fullName)}</div><div><div class="profile-name">${this.esc(p.fullName)}</div><div class="profile-sub">${this.esc(p.position)} · Club Deportivo de Voleibol To Crown</div><span class="pill pill-green">${this.esc(p.status)}</span></div></div><div class="profile-number">${this.esc(p.number)}</div></div><div class="card-body two-col"><div><div class="card-title">Informacion Personal</div>${this.summary([["Documento", `${p.documentType} ${p.document}`],["Telefono", p.phone],["Ciudad", p.city],["Direccion", p.address],["PDF tarjeta", p.identityPdf ? "Cargado" : "Pendiente"]])}</div><div><div class="card-title">Tallas y Salud</div>${this.summary([["Camiseta", p.sizes.shirt],["Short", p.sizes.short],["Licra", p.sizes.lycra],["Buzo", p.sizes.jacket],["Calzado", p.sizes.shoes],["Condicion", p.health.conditions || "Sin reporte"]])}</div></div></div>`);
  },
  myPayments() {
    this.title("Mis Mensualidades");
    this.view(`<div class="stats-grid">${this.stat("Saldo pendiente", this.money(this.pending(this.db.player.id)), "Mensualidades", "gold")}</div>${this.table(["Mes","Valor","Pagado","Debe","Estado"], this.db.payments.map(p => `<tr><td>${p.month}</td><td>${this.money(p.amount)}</td><td>${this.money(p.paid)}</td><td>${this.money(Math.max(0,p.amount-p.paid))}</td><td><span class="pill ${p.confirmed ? "pill-green" : "pill-red"}">${p.confirmed ? "Confirmado" : "Pendiente"}</span></td></tr>`).join(""))}`);
  },
  myRequests() {
    this.title("Mis Solicitudes");
    this.actions(`<button class="btn-sm gold" onclick="App.openRequest()">Solicitar implemento</button>`);
    this.view(this.requestsTable(this.db.requests, false));
  },
  myChampionships() {
    this.title("Mis Campeonatos");
    this.view(this.champCards(this.db.championships, false, this.db.player.id));
  },

  player360() {
    this.title("Jugador 360");
    const currentId = document.getElementById("player360Search")?.dataset.selected || "";
    const p = this.db.players.find(x => x.id === currentId);
    this.view(`<div class="card pad360">
      <div class="card-header"><div class="card-title">♛ Buscar jugadora</div></div>
      <div class="card-body">
        <input id="player360Search" class="form-control" list="player360Options" placeholder="Buscar por nombre o documento" oninput="App.selectPlayer360(this)" data-selected="${this.esc(currentId)}">
        <datalist id="player360Options">${this.db.players.map(x => `<option data-id="${x.id}" value="${this.esc(x.fullName)} - ${this.esc(x.document)}"></option>`).join("")}</datalist>
      </div>
    </div>${p ? this.player360Detail(p) : `<div class="empty" style="margin-top:16px">Busca y selecciona una jugadora para ver su informacion 360.</div>`}`);
  },

  selectPlayer360(input) {
    const selected = this.db.players.find(p => `${p.fullName} - ${p.document}` === input.value || p.document === input.value);
    if (!selected) return;
    input.dataset.selected = selected.id;
    this.player360();
  },

  player360Detail(p) {
    const champs = this.db.championships.filter(c => c.teams.some(t => t.players.includes(p.id)));
    return `<div class="grid-360">
      <div class="card"><div class="card-body player-info-modal"><div class="player-info-photo"><img src="${this.playerPhoto(p)}"></div><div><h2>${this.esc(p.fullName)}</h2>${this.summary([["Documento", `${p.documentType} ${p.document}`],["Edad", `${this.age(p.birthDate)} anos`],["Telefono", p.phone],["Posicion", p.position],["Sangre", p.health?.blood],["EPS", p.health?.eps]])}</div></div></div>
      <div class="card"><div class="card-header"><div class="card-title">Campeonatos</div></div><div class="card-body">${champs.map(c => {
        const team = c.teams.find(t => t.players.includes(p.id));
        return `<div class="team-box"><b>${this.esc(c.name)}</b><br><span class="muted">${this.esc(c.city)} - ${this.esc(c.startDate)} a ${this.esc(c.endDate)}</span><div><span class="pill pill-green">${this.esc(team?.name || "")}</span><span class="pill pill-gold">${this.esc(c.category)}</span><span class="pill pill-blue">${this.esc(c.titleWon || "Sin titulo registrado")}</span></div></div>`;
      }).join("") || "<div class='empty'>Sin campeonatos registrados.</div>"}</div></div>
    </div>`;
  },

  openChangePassword() {
    this.modal("Cambiar contrasena", `
      <form id="passwordForm" class="stack-form">
        ${this.input("oldPassword","Clave antigua*", "", true, "password")}
        ${this.input("newPassword","Nueva clave*", "", true, "password")}
        ${this.input("confirmPassword","Confirmar nueva clave*", "", true, "password")}
      </form>`,
      `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.savePassword()">Actualizar clave</button>`);
  },

  async savePassword() {
    const form = document.getElementById("passwordForm");
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) return alert("Las claves nuevas no coinciden.");
    await Api.request("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword:data.get("oldPassword"), newPassword:data.get("newPassword"), confirmPassword:data.get("confirmPassword") })
    });
    this.closeModal();
    alert("Clave actualizada correctamente. Ingresa nuevamente.");
    this.logout();
  },

  openPlayerInfo(id) {
    const p = this.db.players.find(x => x.id === id);
    if (!p) return;
    this.modal("Informacion de jugadora", `
      <div class="player-info-modal">
        <div class="player-info-photo"><img src="${this.playerPhoto(p)}" alt="${this.esc(p.fullName)}"></div>
        <div>
          <h2>${this.esc(p.fullName)}</h2>
          <p class="muted">${this.esc(p.documentType)} ${this.esc(p.document)} - ${this.esc(p.position)} - #${this.esc(p.number)}</p>
          ${this.summary([
            ["Telefono", p.phone],
            ["Nacimiento", `${p.birthDate || ""} ${p.birthCity ? "- " + p.birthCity : ""}`],
            ["Acudiente", `${p.guardian || ""} ${p.guardianPhone ? "- " + p.guardianPhone : ""}`],
            ["Sangre / EPS", `${p.health?.blood || ""} ${p.health?.eps ? "- " + p.health.eps : ""}`],
            ["Tallas", `Cam ${p.sizes?.shirt || ""} / Licra ${p.sizes?.lycra || ""} / Pant ${p.sizes?.short || ""} / Calzado ${p.sizes?.shoes || ""}`],
            ["Estado", p.status]
          ])}
          ${p.identityPdf ? `<button type="button" class="btn-sm outline" onclick="App.viewPdf('${p.id}', true)">Ver tarjeta de identidad</button>` : ""}
        </div>
      </div>`,
      `<button class="btn-sm outline" onclick="App.closeModal()">Cerrar</button><button class="btn-sm gold" onclick="App.closeModal();App.openPlayer('${p.id}')">Editar</button>`);
  },

  openPlayer(id = "") {
    const admin = this.isAdmin();
    const p = id ? (admin ? this.db.players.find(x => x.id === id) : this.db.player) : this.emptyPlayer();
    const u = id ? (admin ? this.userByPlayer(id) : this.db.user) : { id:"", role:"player", name:"", email:"", password:"", enabled:true };
    const champChecks = admin ? this.db.championships.map(champ => `<label class="check-item"><input type="checkbox" disabled> ${this.esc(champ.name)}</label>`).join("") : "";
    this.modal(id ? "Editar jugadora" : "Registrar Jugadora", `
      <form id="playerForm">
        <div class="registro-layout">
          <div>
            <div class="card registro-card">
              <div class="card-body">
                <div class="form-section-title">Datos Personales</div>
                <div class="form-grid-3">
                  ${this.input("firstName","Primer Nombre*",p.firstName || this.namePart(p.fullName,0),true)}
                  ${this.input("secondName","Segundo Nombre",p.secondName || "")}
                  ${this.input("firstLastName","Primer Apellido*",p.firstLastName || this.namePart(p.fullName,1),true)}
                  ${this.input("secondLastName","Segundo Apellido",p.secondLastName || "")}
                  ${this.select("documentType","Tipo de Documento*",p.documentType,["TI","CC","CE","Pasaporte"],true)}
                  <label>${this.labelText("Nro Documento*")}<input class="form-control" name="document" value="${this.esc(p.document)}" required oninput="App.syncCredentialsFromDocument()"></label>
                  ${this.input("birthDate","Fecha de Nacimiento*",p.birthDate,true,"date")}
                  ${this.input("birthCity","Ciudad de Nacimiento*",p.birthCity || p.city,true)}
                  ${this.select("sex","Sexo*",p.sex,["","Femenino","Masculino","Otro"],true)}
                  ${this.input("joinDate","Fecha Ingreso",p.joinDate,false,"date")}
                  ${this.input("phone","Telefono*",p.phone,true)}
                  ${this.input("address","Direccion*",p.address,true)}
                  ${this.input("guardian","Acudiente*",p.guardian,true)}
                  ${this.input("guardianPhone","Tel. Acudiente*",p.guardianPhone,true)}
                  ${this.input("guardianRelation","Parentezco*",p.guardianRelation || p.emergency.relation,true)}
                </div>

                <div class="form-section-title">Datos Deportivos</div>
                <div class="form-grid-3">
                  ${this.select("position","Posicion Principal*",p.position,["","Libero","Central","Punta","Opuesta","Armadora","Universal"],true)}
                  ${this.select("secondaryPosition","Posicion Secundaria",p.secondaryPosition,["","Libero","Central","Punta","Opuesta","Armadora","Universal"])}
                  ${this.input("number","Nro Dorsal*",p.number,true)}
                  ${this.input("height","Estatura*",p.height,true,"number")}
                  ${this.input("weight","Peso*",p.weight,true,"number")}
                  ${this.select("dominantHand","Mano Dominante*",p.dominantHand,["","Derecha","Izquierda","Ambidiestra"],true)}
                </div>

                <div class="form-section-title">Tallas de Uniforme</div>
                <div class="form-grid-3">
                  ${this.select("shirt","Talla Camiseta*",p.sizes.shirt,["","XS","S","M","L","XL"],true)}
                  ${this.select("lycra","Talla Licra*",p.sizes.lycra,["","XS","S","M","L","XL"],true)}
                  ${this.select("short","Talla Pantaloneta*",p.sizes.short,["","XS","S","M","L","XL"],true)}
                  ${this.select("kneePads","Talla Rodilleras*",p.sizes.kneePads,["","XS","S","M","L","XL"],true)}
                  ${this.input("shoes","Talla Calzado*",p.sizes.shoes,true)}
                </div>
              </div>
            </div>

            <div class="card registro-card">
              <div class="card-body">
                <div class="form-section-title">Informacion de Salud</div>
                <div class="form-grid">
                  ${this.select("blood","Tipo de Sangre*",p.health.blood,["","O+","O-","A+","A-","B+","B-","AB+","AB-"],true)}
                  ${this.input("eps","EPS/Seguro*",p.health.eps,true)}
                  ${this.textarea("allergies","Alergias",p.health.allergies)}
                  ${this.textarea("diseases","Enfermedades",p.health.diseases || p.health.conditions)}
                  ${this.textarea("meds","Medicamentos",p.health.meds)}
                  ${this.textarea("injuries","Lesiones Anteriores Relevantes",p.health.injuries)}
                </div>
                <label>Observaciones<textarea name="notes">${this.esc(p.notes)}</textarea></label>
                <label class="active-toggle"><input name="active" type="checkbox" ${p.status !== "Inactiva" ? "checked" : ""}> Estado: jugadora activa y con acceso habilitado</label>
              </div>
            </div>
          </div>

          <aside class="registro-side">
            <div class="card">
              <div class="card-header"><div class="card-title">Foto de la jugadora</div></div>
              <div class="card-body" style="text-align:center">
                <div class="photo-preview" id="photoPreview">${p.photo ? `<img src="${p.photo}" alt="Foto jugadora">` : `<span>${this.initials(p.fullName || "J")}</span>`}</div>
                <label class="upload-btn">Subir foto<input name="photoFile" type="file" accept="image/*" onchange="App.previewPhoto(event)"></label>
                <p class="muted" style="font-size:12px;margin-top:8px">Opcional. Se previsualiza antes de guardar.</p>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><div class="card-title">Documento PDF</div></div>
              <div class="card-body">
                <label class="upload-btn">Adjuntar tarjeta de identidad<input name="identityFile" type="file" accept="application/pdf"></label>
                <span class="pill ${p.identityPdf ? "pill-green" : "pill-gray"}">${p.identityPdf ? "PDF cargado" : "Sin PDF"}</span>
                ${p.identityPdf ? `<button type="button" class="btn-sm outline" style="width:100%;margin-top:10px" onclick="App.viewPdf('${p.id}', true)">Ver tarjeta</button>` : ""}
              </div>
            </div>
            <div class="card">
              <div class="card-header"><div class="card-title">Acceso al Sistema</div></div>
              <div class="card-body">
                ${this.input("email","Usuario*",u.email || p.document,true)}
                ${this.input("password","Clave*",u.password || p.document,true)}
              </div>
            </div>
            ${admin ? `<div class="card"><div class="card-header"><div class="card-title">Inscribir en Campeonatos</div></div><div class="card-body"><div class="check-group vertical">${champChecks || "<span class='muted'>No hay campeonatos creados.</span>"}</div><p class="muted" style="font-size:12px;margin-top:10px">La inscripcion real se gestiona desde el campeonato y sus subequipos.</p></div></div>` : ""}
          </aside>
        </div>
      </form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.savePlayer('${id}')">Guardar Registro</button>`);
  },

  async savePlayer(id) {
    const f = document.getElementById("playerForm");
    if (!f.reportValidity()) return;
    const data = new FormData(f);
    const admin = this.isAdmin();
    const old = id ? (admin ? this.db.players.find(p => p.id === id) : this.db.player) : this.emptyPlayer();
    const oldUser = id ? (admin ? this.userByPlayer(id) : this.db.user) : { id:"", role:"player", enabled:true };
    const fullName = [data.get("firstName"), data.get("secondName"), data.get("firstLastName"), data.get("secondLastName")]
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
    const isActive = data.get("active") === "on";
    const payload = {
      user: { id: oldUser.id, role:"player", name:fullName, email:data.get("email"), password:data.get("password"), enabled:isActive },
      player: {
        ...old,
        firstName:data.get("firstName"),
        secondName:data.get("secondName"),
        firstLastName:data.get("firstLastName"),
        secondLastName:data.get("secondLastName"),
        fullName,
        documentType:data.get("documentType"),
        document:data.get("document"),
        birthDate:data.get("birthDate"),
        birthCity:data.get("birthCity"),
        sex:data.get("sex"),
        joinDate:data.get("joinDate"),
        city:data.get("birthCity"),
        phone:data.get("phone"),
        address:data.get("address"),
        guardian:data.get("guardian"),
        guardianPhone:data.get("guardianPhone"),
        guardianRelation:data.get("guardianRelation"),
        position:data.get("position"),
        secondaryPosition:data.get("secondaryPosition"),
        number:data.get("number"),
        category:old.category || "Juvenil",
        status:isActive ? "Activa" : "Inactiva",
        height:data.get("height"),
        weight:data.get("weight"),
        dominantHand:data.get("dominantHand"),
        notes:data.get("notes"),
        sizes:{shirt:data.get("shirt"), short:data.get("short"), lycra:data.get("lycra"), jacket:old.sizes.jacket, kneePads:data.get("kneePads"), shoes:data.get("shoes")},
        health:{blood:data.get("blood"), eps:data.get("eps"), conditions:data.get("diseases"), allergies:data.get("allergies"), diseases:data.get("diseases"), meds:data.get("meds"), injuries:data.get("injuries")},
        emergency:{name:data.get("guardian"), phone:data.get("guardianPhone"), relation:data.get("guardianRelation")},
        photo:f.photoFile.files[0] ? await this.file(f.photoFile.files[0]) : old.photo,
        identityPdf:f.identityFile.files[0] ? await this.file(f.identityFile.files[0]) : old.identityPdf
      }
    };
    await Api.request(admin ? "/api/admin/players" : "/api/player/profile", { method: admin ? "POST" : "PUT", body: JSON.stringify(payload) });
    this.closeModal(); await this.reload();
  },

  openChamp(id = "") {
    const c = id ? this.db.championships.find(x => x.id === id) : { id:"", name:"", city:this.db.club.city, place:"", organizer:"", startDate:"", endDate:"", category:"Juvenil", status:"Inscrito", titleWon:"", notes:"", teams:[{id:crypto.randomUUID(), name:"ToCrown A", players:[]},{id:crypto.randomUUID(), name:"ToCrown B", players:[]}] };
    this.modal(id ? "Editar Campeonato" : "Nuevo Campeonato", `<form id="champForm"><div class="form-grid-3">${this.input("name","Nombre",c.name,true)}${this.input("city","Ciudad",c.city,true)}${this.input("place","Lugar",c.place,true)}${this.input("organizer","Organizador",c.organizer,true)}${this.input("startDate","Fecha inicio",c.startDate,true,"date")}${this.input("endDate","Fecha final",c.endDate,true,"date")}${this.select("category","Categoria",c.category,["Infantil","Juvenil","Mayores","Abierto"])}${this.select("status","Estado",c.status,["Inscrito","En juego","Finalizado"])}${this.input("titleWon","Titulo ganado",c.titleWon)}</div><label>Notas<textarea class="form-control" name="notes">${this.esc(c.notes)}</textarea></label><div class="form-section-title">Subequipos</div><div id="teams">${c.teams.map(t => this.teamEditor2(t)).join("")}</div><button type="button" class="btn-sm green" onclick="App.addTeam()">Agregar subequipo</button></form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.saveChamp('${id}')">Guardar Campeonato</button>`);
  },
  teamEditor(t) {
    return `<div class="team-box" data-id="${t.id}"><label>Nombre subequipo<input name="teamName" value="${this.esc(t.name)}"></label><div class="check-list">${this.db.players.map(p => `<label><input type="checkbox" value="${p.id}" ${t.players.includes(p.id) ? "checked" : ""}>${this.esc(p.fullName)} · ${this.esc(p.position)}</label>`).join("")}</div><button type="button" class="btn-sm danger" onclick="this.closest('.team-box').remove()">Quitar</button></div>`;
  },
  teamEditor2(t) {
    return `<div class="team-box" data-id="${t.id}">
      <label>Nombre subequipo<input class="form-control" name="teamName" value="${this.esc(t.name)}"></label>
      <div class="team-selected">${t.players.map(pid => this.teamPlayerTag(pid)).join("")}</div>
      <input class="form-control team-search" placeholder="Buscar jugadora por nombre, posicion o categoria" oninput="App.renderTeamSearch(this)">
      <div class="team-search-results"></div>
      <button type="button" class="btn-sm danger" onclick="this.closest('.team-box').remove()">Quitar</button>
    </div>`;
  },
  teamPlayerTag(pid) {
    return `<span class="tag-token" data-player-id="${pid}">${this.esc(this.playerName(pid))}<button type="button" onclick="App.removeTeamPlayer(this)">×</button></span>`;
  },
  renderTeamSearch(input) {
    const box = input.closest(".team-box");
    const term = input.value.trim().toLowerCase();
    const selected = new Set([...box.querySelectorAll(".team-selected [data-player-id]")].map(x => x.dataset.playerId));
    const target = box.querySelector(".team-search-results");
    if (term.length < 2) { target.innerHTML = ""; return; }
    const matches = this.db.players.filter(p => !selected.has(p.id) && [p.fullName, p.position, p.category, p.document].join(" ").toLowerCase().includes(term)).slice(0, 8);
    target.innerHTML = matches.map(p => `<button type="button" class="search-chip" onclick="App.addTeamPlayer(this,'${p.id}')">${this.esc(p.fullName)} <span>${this.esc(p.position)} - ${this.esc(p.category)}</span></button>`).join("") || `<div class="muted" style="font-size:12px">Sin resultados.</div>`;
  },
  addTeamPlayer(button, pid) {
    const box = button.closest(".team-box");
    box.querySelector(".team-selected").insertAdjacentHTML("beforeend", this.teamPlayerTag(pid));
    box.querySelector(".team-search").value = "";
    box.querySelector(".team-search-results").innerHTML = "";
  },
  removeTeamPlayer(button) {
    button.closest(".tag-token").remove();
  },
  addTeam() {
    document.getElementById("teams").insertAdjacentHTML("beforeend", this.teamEditor2({ id: crypto.randomUUID(), name: `ToCrown ${String.fromCharCode(65 + document.querySelectorAll(".team-box").length)}`, players: [] }));
  },
  async saveChamp(id) {
    const data = new FormData(document.getElementById("champForm"));
    const champ = { id, name:data.get("name"), city:data.get("city"), place:data.get("place"), organizer:data.get("organizer"), startDate:data.get("startDate"), endDate:data.get("endDate"), category:data.get("category"), status:data.get("status"), titleWon:data.get("titleWon"), notes:data.get("notes"), teams:[...document.querySelectorAll("#teams .team-box")].map(box => ({ id:box.dataset.id, name:box.querySelector("[name=teamName]").value, players:[...box.querySelectorAll(".team-selected [data-player-id]")].map(x => x.dataset.playerId) })) };
    await Api.request("/api/admin/championships", { method:"POST", body:JSON.stringify(champ) }); this.closeModal(); await this.reload("championships");
  },

  openPayment(id = "") {
    const p = id ? this.db.payments.find(x => x.id === id) : { id:"", playerId:this.db.players[0]?.id, month:"", amount:this.db.club.monthlyFee, paid:0, date:new Date().toISOString().slice(0,10), confirmed:true, method:"Efectivo", note:"" };
    this.modal("Registrar o confirmar pago", `<form id="paymentForm"><div class="form-grid-3">${this.select("playerId","Jugadora",p.playerId,this.db.players.map(x => [x.id,x.fullName]))}${this.input("month","Mes / concepto",p.month,true)}${this.input("amount","Valor",p.amount,true,"number")}${this.input("paid","Pagado",p.paid,true,"number")}${this.input("date","Fecha",p.date,true,"date")}${this.select("confirmed","Confirmado",String(p.confirmed),[["true","Si"],["false","No"]])}${this.select("method","Metodo",p.method,["Efectivo","Nequi","Daviplata","Transferencia","Otro"])}</div><label>Nota<textarea name="note">${this.esc(p.note)}</textarea></label></form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.savePayment('${id}')">Guardar Pago</button>`);
  },
  openWalletGeneration() {
    const month = new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
    this.modal("Generar cartera mensual", `
      <form id="walletForm">
        <div class="form-grid">
          ${this.input("month","Mes a generar",month,true)}
          ${this.input("defaultAmount","Valor mensual base",this.db.club.monthlyFee,true,"number")}
        </div>
        <div class="form-section-title">Jugadoras a cobrar</div>
        <div class="wallet-player-list">
          ${this.db.players.map(player => `<div class="wallet-row">
            <label class="check-item"><input type="checkbox" name="chargePlayer" value="${player.id}" checked> ${this.esc(player.fullName)}</label>
            <input name="override_${player.id}" type="number" placeholder="Valor diferente opcional">
          </div>`).join("")}
        </div>
      </form>`,
      `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.generateWallet()">Generar cartera</button>`);
  },
  async generateWallet() {
    const form = document.getElementById("walletForm");
    const data = new FormData(form);
    const charged = new Set(data.getAll("chargePlayer"));
    const excludedPlayerIds = this.db.players.filter(player => !charged.has(player.id)).map(player => player.id);
    const overrides = {};
    this.db.players.forEach(player => {
      const value = data.get(`override_${player.id}`);
      if (value) overrides[player.id] = Number(value);
    });
    await Api.request("/api/admin/wallet/generate", {
      method: "POST",
      body: JSON.stringify({ month: data.get("month"), defaultAmount: Number(data.get("defaultAmount")), excludedPlayerIds, overrides })
    });
    this.closeModal();
    await this.reload("payments");
  },
  async savePayment(id) {
    const d = new FormData(document.getElementById("paymentForm"));
    await Api.request("/api/admin/payments", { method:"POST", body:JSON.stringify({ id, playerId:d.get("playerId"), month:d.get("month"), amount:Number(d.get("amount")), paid:Number(d.get("paid")), date:d.get("date"), confirmed:d.get("confirmed")==="true", method:d.get("method"), note:d.get("note") }) });
    this.closeModal(); await this.reload("payments");
  },

  openRequest(id = "") {
    const r = id ? this.db.requests.find(x => x.id === id) : { id:"", playerId:this.db.player?.id || this.db.players?.[0]?.id, type:"Uniforme", version:"Local verde 2026", size:"", date:new Date().toISOString().slice(0,10), status:"Solicitada", note:"" };
    const admin = this.isAdmin();
    this.modal("Solicitud", `<form id="requestForm"><div class="form-grid">${admin ? this.select("playerId","Jugadora",r.playerId,this.db.players.map(p => [p.id,p.fullName])) : ""}${this.select("type","Tipo",r.type,["Uniforme","Rodilleras","Medias","Morral","Otro"])}${this.input("version","Version / referencia",r.version,true)}${this.input("size","Talla",r.size)}${this.input("date","Fecha",r.date,true,"date")}${admin ? this.select("status","Estado",r.status,["Solicitada","En revision","Aprobada","Entregada","Rechazada"]) : ""}</div><label>Nota<textarea name="note">${this.esc(r.note)}</textarea></label></form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.saveRequest('${id}')">Guardar Solicitud</button>`);
  },
  async saveRequest(id) {
    const d = new FormData(document.getElementById("requestForm"));
    await Api.request("/api/requests", { method:"POST", body:JSON.stringify({ id, playerId:d.get("playerId") || this.db.player?.id, type:d.get("type"), version:d.get("version"), size:d.get("size"), date:d.get("date"), status:d.get("status") || "Solicitada", note:d.get("note") }) });
    this.closeModal(); await this.reload(this.isAdmin() ? "requests" : "my-requests");
  },
  async toggleUser(id) {
    await Api.request(`/api/admin/users/${id}/toggle`, { method:"PUT" }); await this.reload();
  },
  async confirmToggleUser(id) {
    const user = this.db.users.find(u => u.id === id);
    if (!user) return;
    const next = user.enabled ? "inactivo" : "activo";
    if (!confirm(`Seguro que deseas pasar este usuario a ${next}?`)) return;
    await this.toggleUser(id);
  },
  async changeRequestStatus(id, status) {
    if (!status) return;
    const request = this.db.requests.find(r => r.id === id);
    if (!request) return;
    if (!confirm(`Confirmas cambiar la solicitud a "${status}"?`)) return;
    await Api.request("/api/requests", { method:"POST", body:JSON.stringify({ ...request, status }) });
    await this.reload("requests");
  },
  async reload(route = this.route) {
    this.db = await Api.snapshot(); this.route = route; this.shell();
  },

  stat(label, value, sub, color) {
    return `<div class="stat-card"><div class="stat-icon ${color}">●</div><div><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div></div>`;
  },
  champCards(champs, actions, playerId = "") {
    if (!champs.length) return `<div class="empty">No hay campeonatos registrados.</div>`;
    return champs.map(c => `<div class="champ-card"><div class="label">${this.esc(c.category)} · ${this.esc(c.status)}</div><div class="name">${this.esc(c.name)}</div><div class="meta"><span>${this.esc(c.city)}</span><span>${this.esc(c.place)}</span><span>${this.esc(c.startDate)} / ${this.esc(c.endDate)}</span><span>Titulo: ${this.esc(c.titleWon || "Pendiente")}</span></div>${c.teams.map(t => `<div class="team-box" style="color:var(--gray-800);margin-top:12px"><b>${this.esc(t.name)} ${playerId && t.players.includes(playerId) ? "<span class='pill pill-gold'>Tu subequipo</span>" : ""}</b><div>${t.players.map(pid => `<span class="pill ${pid === playerId ? "pill-gold" : "pill-green"}">${this.esc(this.playerName(pid))}</span>`).join("") || "<span class='muted'>Sin jugadoras</span>"}</div></div>`).join("")}${actions ? `<button class="btn-sm outline" onclick="App.openChamp('${c.id}')">Gestionar</button>` : ""}</div>`).join("");
  },
  paymentSummary() {
    const rows = this.db.players.map(p => [p.fullName, this.pending(p.id)]).filter(x => x[1] > 0);
    return rows.length ? `<div class="summary">${rows.map(x => `<div><span>${this.esc(x[0])}</span><b>${this.money(x[1])}</b></div>`).join("")}</div>` : `<div class="empty">Sin saldos pendientes.</div>`;
  },
  newsSlider() {
    const news = (this.db.news || []).filter(n => n.active);
    if (!news.length) return `<div class="empty">No hay noticias activas.</div>`;
    return `<div id="newsCarousel" class="carousel slide" data-bs-ride="carousel"><div class="carousel-inner">${news.map((n,i) => `<div class="carousel-item ${i===0?"active":""}"><div class="news-slide">${n.image ? `<img src="${n.image}">` : ""}<div><h3>${this.esc(n.title)}</h3><p>${this.esc(n.body)}</p><span class="muted">${this.esc(n.date)}</span></div></div></div>`).join("")}</div><button class="carousel-control-prev" type="button" data-bs-target="#newsCarousel" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button><button class="carousel-control-next" type="button" data-bs-target="#newsCarousel" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button></div>`;
  },
  requestsTable(items, actions) {
    const admin = this.isAdmin();
    return this.table(["Jugadora","Tipo","Version","Talla","Estado","Fecha","Nota", admin ? "Gestion" : ""], items.map(r => {
      const locked = ["Aprobada","Cancelada","Rechazada"].includes(r.status);
      return `<tr><td>${this.esc(this.playerName(r.playerId))}</td><td>${this.esc(r.type)}</td><td>${this.esc(r.version)}</td><td>${this.esc(r.size)}</td><td><span class="pill pill-gold">${this.esc(r.status)}</span></td><td>${this.esc(r.date)}</td><td>${this.esc(r.note)}</td>${admin ? `<td>${locked ? "<span class='muted'>Cerrada</span>" : `<select class="form-select form-select-sm" onchange="App.changeRequestStatus('${r.id}', this.value)"><option value="">Cambiar...</option>${["En revision","Aprobada","Entregada","Cancelada","Rechazada"].map(s => `<option value="${s}">${s}</option>`).join("")}</select>`}</td>` : "<td></td>"}</tr>`;
    }).join(""));
  },
  table(headers, rows) {
    return `<div class="card table-wrap"><table class="table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}"><div class="empty">Sin registros.</div></td></tr>`}</tbody></table></div>`;
  },
  summary(rows) { return `<div class="summary">${rows.map(([a,b]) => `<div><span>${this.esc(a)}</span><b>${this.esc(b)}</b></div>`).join("")}</div>`; },
  labelText(label) {
    return this.esc(label).replace("*", "<span class='req-star'>*</span>");
  },
  input(name,label,value="",required=false,type="text") {
    return `<label>${this.labelText(label)}<input class="form-control" name="${name}" type="${type}" value="${this.esc(value)}" ${required ? "required" : ""}></label>`;
  },
  textarea(name,label,value="",required=false) {
    return `<label>${this.labelText(label)}<textarea class="form-control" name="${name}" ${required ? "required" : ""}>${this.esc(value)}</textarea></label>`;
  },
  select(name,label,value,options,required=false) {
    return `<label>${this.labelText(label)}<select class="form-select" name="${name}" ${required ? "required" : ""}>${options.map(o => { const v = Array.isArray(o) ? o[0] : o; const l = Array.isArray(o) ? o[1] : o; return `<option value="${this.esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${this.esc(l)}</option>`; }).join("")}</select></label>`;
  },
  modal(title, body, foot) { document.getElementById("modalRoot").innerHTML = `<div class="modal"><div class="modal-box"><div class="modal-head"><h3>${title}</h3><button class="btn-sm outline" onclick="App.closeModal()">Cerrar</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`; },
  closeModal() { document.getElementById("modalRoot").innerHTML = ""; },
  file(file) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); },
  syncCredentialsFromDocument() {
    const form = document.getElementById("playerForm");
    if (!form) return;
    const documentValue = form.document?.value || "";
    if (form.email && !form.email.dataset.touched) form.email.value = documentValue;
    if (form.password && !form.password.dataset.touched) form.password.value = documentValue;
    if (form.email) form.email.oninput = () => form.email.dataset.touched = "1";
    if (form.password) form.password.oninput = () => form.password.dataset.touched = "1";
  },
  previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const preview = document.getElementById("photoPreview");
      if (preview) preview.innerHTML = `<img src="${reader.result}" alt="Vista previa foto">`;
    };
    reader.readAsDataURL(file);
  },
  viewPdf(playerId, returnToPlayer = false) {
    const collection = this.db.players || (this.db.player ? [this.db.player] : []);
    const player = collection.find(p => p.id === playerId) || this.db.player;
    if (!player?.identityPdf) return alert("Esta jugadora no tiene PDF cargado.");
    this.modal("Tarjeta de identidad", `<iframe class="pdf-viewer" src="${player.identityPdf}"></iframe>`, `<button class="btn-sm outline" onclick="${returnToPlayer ? `App.openPlayerInfo('${player.id}')` : "App.closeModal()"}">Cerrar</button>`);
  },
  playerPhoto(player) {
    return player?.photo || this.animePlaceholder();
  },
  playerChampCount(playerId) {
    return this.db.championships.filter(c => c.teams.some(t => t.players.includes(playerId))).length;
  },
  age(date) {
    if (!date) return "-";
    const birth = new Date(date);
    if (Number.isNaN(birth.getTime())) return "-";
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const month = now.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) years--;
    return years;
  },
  animePlaceholder() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
      <rect width="240" height="300" fill="#f7faf7"/>
      <circle cx="120" cy="96" r="58" fill="#263238"/>
      <circle cx="120" cy="116" r="54" fill="#ffd7c2"/>
      <path d="M52 110c10-54 42-82 84-78 36 4 59 35 56 82-24-24-58-33-103-23-14 3-25 9-37 19z" fill="#173f26"/>
      <circle cx="98" cy="122" r="6" fill="#1b2a1e"/>
      <circle cx="142" cy="122" r="6" fill="#1b2a1e"/>
      <path d="M101 152c13 10 27 10 40 0" stroke="#b86b5c" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M54 270c11-58 43-88 66-88s55 30 66 88" fill="#0b4d22"/>
      <path d="M86 206l34 32 34-32" fill="#e8b800"/>
      <text x="120" y="286" text-anchor="middle" font-family="Segoe UI,Arial" font-size="20" font-weight="800" fill="#0b4d22">ToCrown</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  },
  syncHealthChecks() {
    const form = document.getElementById("playerForm");
    if (!form) return;
    const selected = [...form.querySelectorAll(".check-group input[type=checkbox]:checked")].map(input => input.parentElement.textContent.trim());
    const target = form.querySelector("[name=conditions]");
    if (target) target.value = selected.join(", ");
  },
  namePart(name, index) { return String(name || "").split(" ").filter(Boolean)[index] || ""; },
  emptyPlayer() { return { id:"", userId:"", firstName:"", secondName:"", firstLastName:"", secondLastName:"", fullName:"", documentType:"", document:"", birthDate:"", birthCity:"", sex:"", joinDate:"", city:this.db.club.city, phone:"", address:"", guardian:"", guardianPhone:"", guardianRelation:"", position:"", secondaryPosition:"", number:"", category:"Juvenil", status:"Activa", height:"", weight:"", dominantHand:"", sizes:{shirt:"",short:"",lycra:"",jacket:"",kneePads:"",shoes:""}, health:{blood:"",eps:"",conditions:"",allergies:"",diseases:"",meds:"",injuries:""}, emergency:{name:"",phone:"",relation:""}, photo:"", identityPdf:"", notes:"" }; }
};

document.addEventListener("DOMContentLoaded", () => App.init());
