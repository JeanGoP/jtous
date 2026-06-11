const App = {
  db: null,
  route: "dashboard",

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
          <div class="form-group"><label>Correo electronico</label><input name="email" type="email" placeholder="admin@tocrown.com" required></div>
          <div class="form-group"><label>Contrasena</label><input name="password" type="password" placeholder="qwerty12345" required></div>
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
      ? [["dashboard","Dashboard"],["users","Usuarios"],["players","Jugadoras"],["championships","Campeonatos"],["payments","Cartera"],["requests","Solicitudes"]]
      : [["my-profile","Mi Perfil"],["my-payments","Mensualidades"],["my-requests","Solicitudes"],["my-championships","Campeonatos"]];
    document.getElementById("app").innerHTML = `
      <div class="app-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo"><img src="/assets/logo.jpeg" alt="ToCrown"><div class="sidebar-logo-text"><div class="club-name">To Crown</div><div class="club-sub">Club de Voleibol</div></div></div>
          <div class="sidebar-user"><div class="avatar">${this.initials(Api.user.name)}</div><div class="sidebar-user-info"><div class="name">${this.esc(Api.user.name)}</div><div class="role">${Api.user.role === "superadmin" ? "Super administrador" : admin ? "Administrador" : "Jugadora"}</div></div></div>
          <nav class="sidebar-nav"><div class="nav-section-title">${admin ? "Principal" : "Mi cuenta"}</div>${nav.map(([r,l]) => `<button class="nav-item" data-route="${r}">${l}</button>`).join("")}</nav>
          <div class="sidebar-bottom"><button class="btn-logout" onclick="App.logout()">Cerrar Sesion</button></div>
        </aside>
        <div class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="btn-sm outline mobile-menu" onclick="sidebar.classList.toggle('open')">Menu</button><div class="topbar-title" id="title"></div></div><div class="topbar-actions" id="actions"></div></div>
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
      dashboard: () => this.dashboard(), users: () => this.users(), players: () => this.players(),
      championships: () => this.championships(), payments: () => this.payments(), requests: () => this.requests(),
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
        <div class="card"><div class="card-header"><div class="card-title">Actividad de cartera</div><button class="btn-sm green" onclick="App.openPayment()">Registrar pago</button></div><div class="card-body">${this.paymentSummary()}</div></div>
      </div>`);
  },

  users() {
    this.title("Usuarios");
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer()">Crear usuario</button>`);
    const rows = this.db.users.map(user => {
      const player = this.db.players.find(p => p.userId === user.id);
      return `<tr><td><div class="person"><div class="avatar">${this.initials(user.name)}</div><div><b>${this.esc(user.name)}</b><br><span class="muted">${this.esc(user.email)}</span></div></div></td><td><span class="pill ${user.role !== "player" ? "pill-gold" : "pill-green"}">${user.role}</span></td><td><span class="pill ${user.enabled ? "pill-green" : "pill-red"}">${user.enabled ? "Activo" : "Deshabilitado"}</span></td><td>${player ? this.esc(player.position) : "Sistema"}</td><td>${player ? `<button class="btn-sm outline" onclick="App.openPlayer('${player.id}')">Editar</button> <button class="btn-sm danger" onclick="App.toggleUser('${user.id}')">${user.enabled ? "Deshabilitar" : "Habilitar"}</button>` : ""}</td></tr>`;
    }).join("");
    this.view(this.table(["Usuario","Perfil","Estado","Detalle",""], rows));
  },

  players() {
    this.title("Jugadoras");
    this.actions(`<button class="btn-sm gold" onclick="App.openPlayer()">Nueva Jugadora</button>`);
    this.view(`<div class="player-grid">${this.db.players.map(p => {
      const user = this.userByPlayer(p.id);
      return `<div class="card player-card"><div class="cover"><div class="avatar">${p.photo ? `<img src="${p.photo}">` : this.initials(p.fullName)}</div></div><div class="info"><h3>${this.esc(p.fullName)}</h3><p class="muted">${this.esc(p.position)} · #${this.esc(p.number)} · ${this.esc(p.category)}</p><span class="pill ${user?.enabled ? "pill-green" : "pill-red"}">${user?.enabled ? p.status : "Acceso bloqueado"}</span><span class="pill pill-gold">Debe ${this.money(this.pending(p.id))}</span><div class="actions"><button class="btn-sm green" onclick="App.openPlayer('${p.id}')">Editar</button><button class="btn-sm outline" onclick="App.go('championships')">Campeonatos</button></div></div></div>`;
    }).join("")}<div class="card player-card" style="display:flex;align-items:center;justify-content:center;min-height:220px;border:2px dashed var(--gray-200);cursor:pointer" onclick="App.openPlayer()"><b>+ Agregar jugadora</b></div></div>`);
  },

  championships() {
    this.title("Campeonatos");
    this.actions(`<button class="btn-sm gold" onclick="App.openChamp()">Nuevo Campeonato</button>`);
    this.view(this.champCards(this.db.championships, true));
  },

  payments() {
    this.title("Cartera");
    this.actions(`<button class="btn-sm gold" onclick="App.openWalletGeneration()">Generar cartera mensual</button><button class="btn-sm green" onclick="App.openPayment()">Registrar o confirmar pago</button>`);
    const rows = this.db.payments.map(p => `<tr><td>${this.esc(this.playerName(p.playerId))}</td><td>${this.esc(p.month)}</td><td>${this.money(p.amount)}</td><td>${this.money(p.paid)}</td><td><b>${this.money(Math.max(0,p.amount-p.paid))}</b></td><td>${this.esc(p.method)}</td><td><span class="pill ${p.confirmed ? "pill-green" : "pill-red"}">${p.confirmed ? "Confirmado" : "Pendiente"}</span></td><td><button class="btn-sm outline" onclick="App.openPayment('${p.id}')">Editar</button></td></tr>`).join("");
    this.view(this.table(["Jugadora","Mes","Valor","Pagado","Debe","Metodo","Estado",""], rows));
  },

  requests() {
    this.title("Solicitudes");
    this.actions(`<button class="btn-sm gold" onclick="App.openRequest()">Nueva Solicitud</button>`);
    this.view(this.requestsTable(this.db.requests, true));
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
                <div class="form-grid">
                  ${this.input("fullName","Nombre completo",p.fullName,true)}
                  ${this.select("documentType","Tipo de documento",p.documentType,["TI","CC","CE","Pasaporte"])}
                  ${this.input("document","Numero de documento",p.document,true)}
                  ${this.input("birthDate","Fecha de nacimiento",p.birthDate,false,"date")}
                  ${this.input("city","Ciudad de residencia",p.city)}
                  ${this.input("phone","Telefono",p.phone,true)}
                  ${this.input("address","Direccion",p.address)}
                  ${this.input("guardian","Acudiente",p.guardian)}
                  ${this.input("guardianPhone","Telefono acudiente",p.guardianPhone)}
                </div>

                <div class="form-section-title">Datos Deportivos</div>
                <div class="form-grid-3">
                  ${this.select("position","Posicion",p.position,["Libero","Central","Punta","Opuesta","Armadora","Universal"])}
                  ${this.input("number","Numero de camiseta",p.number)}
                  ${this.select("category","Categoria",p.category,["Infantil","Juvenil","Mayores"])}
                  ${this.select("status","Estado deportivo",p.status,["Activa","Lesionada","Inactiva"])}
                </div>

                <div class="form-section-title">Tallas de Uniforme</div>
                <div class="form-grid-3">
                  ${this.select("shirt","Camiseta",p.sizes.shirt,["XS","S","M","L","XL"])}
                  ${this.select("short","Short",p.sizes.short,["XS","S","M","L","XL"])}
                  ${this.select("lycra","Licra",p.sizes.lycra,["XS","S","M","L","XL"])}
                  ${this.select("jacket","Buzo / Chaqueta",p.sizes.jacket,["XS","S","M","L","XL"])}
                  ${this.input("shoes","Calzado",p.sizes.shoes)}
                </div>
              </div>
            </div>

            <div class="card registro-card">
              <div class="card-body">
                <div class="form-section-title">Informacion de Salud <span>(Opcional)</span></div>
                <div class="form-grid">
                  ${this.input("blood","Grupo sanguineo",p.health.blood)}
                  ${this.input("eps","EPS",p.health.eps)}
                  <div class="full">
                    <label>Condiciones medicas</label>
                    <div class="check-group">
                      ${["Asma","Diabetes","Ninguna","Hipertension","Epilepsia","Otra"].map(item => `<label class="check-item"><input type="checkbox" ${String(p.health.conditions || "").includes(item) ? "checked" : ""} onchange="App.syncHealthChecks()"> ${item}</label>`).join("")}
                    </div>
                    <input name="conditions" value="${this.esc(p.health.conditions)}" placeholder="Detalle de condicion medica">
                  </div>
                  ${this.input("allergies","Alergias",p.health.allergies)}
                  ${this.input("meds","Medicamentos",p.health.meds)}
                </div>
                <div class="form-section-title">Contacto de Emergencia</div>
                <div class="form-grid-3">
                  ${this.input("emergencyName","Nombre",p.emergency.name)}
                  ${this.input("emergencyPhone","Telefono",p.emergency.phone)}
                  ${this.input("emergencyRelation","Parentesco",p.emergency.relation)}
                </div>
                <label>Observaciones<textarea name="notes">${this.esc(p.notes)}</textarea></label>
              </div>
            </div>
          </div>

          <aside class="registro-side">
            <div class="card">
              <div class="card-header"><div class="card-title">Foto de la jugadora</div></div>
              <div class="card-body" style="text-align:center">
                <div class="avatar avatar-lg" style="margin:0 auto 12px">${p.photo ? `<img src="${p.photo}">` : this.initials(p.fullName || "J")}</div>
                <label class="upload-btn">Subir foto<input name="photoFile" type="file" accept="image/*"></label>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><div class="card-title">Documento PDF</div></div>
              <div class="card-body">
                <label class="upload-btn">Adjuntar tarjeta de identidad<input name="identityFile" type="file" accept="application/pdf"></label>
                <span class="pill ${p.identityPdf ? "pill-green" : "pill-gray"}">${p.identityPdf ? "PDF cargado" : "Sin PDF"}</span>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><div class="card-title">Acceso al Sistema</div></div>
              <div class="card-body">
                ${this.input("email","Correo / usuario",u.email,true,"email")}
                ${this.input("password","Contrasena",u.password,true)}
                ${admin ? this.select("enabled","Estado acceso",String(u.enabled),[["true","Activo"],["false","Deshabilitado"]]) : ""}
              </div>
            </div>
            ${admin ? `<div class="card"><div class="card-header"><div class="card-title">Inscribir en Campeonatos</div></div><div class="card-body"><div class="check-group vertical">${champChecks || "<span class='muted'>No hay campeonatos creados.</span>"}</div><p class="muted" style="font-size:12px;margin-top:10px">La inscripcion real se gestiona desde el campeonato y sus subequipos.</p></div></div>` : ""}
          </aside>
        </div>
      </form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.savePlayer('${id}')">Guardar Registro</button>`);
  },

  async savePlayer(id) {
    const f = document.getElementById("playerForm");
    const data = new FormData(f);
    const admin = this.isAdmin();
    const old = id ? (admin ? this.db.players.find(p => p.id === id) : this.db.player) : this.emptyPlayer();
    const oldUser = id ? (admin ? this.userByPlayer(id) : this.db.user) : { id:"", role:"player", enabled:true };
    const payload = {
      user: { id: oldUser.id, role:"player", name:data.get("fullName"), email:data.get("email"), password:data.get("password"), enabled: data.get("enabled") == null ? oldUser.enabled : data.get("enabled") === "true" },
      player: {
        ...old, fullName:data.get("fullName"), documentType:data.get("documentType"), document:data.get("document"), birthDate:data.get("birthDate"), city:data.get("city"), phone:data.get("phone"), address:data.get("address"), guardian:data.get("guardian"), guardianPhone:data.get("guardianPhone"), position:data.get("position"), number:data.get("number"), category:data.get("category"), status:data.get("status"), notes:data.get("notes"),
        sizes:{shirt:data.get("shirt"), short:data.get("short"), lycra:data.get("lycra"), jacket:data.get("jacket"), shoes:data.get("shoes")},
        health:{blood:data.get("blood"), eps:data.get("eps"), conditions:data.get("conditions"), allergies:data.get("allergies"), meds:data.get("meds")},
        emergency:{name:data.get("emergencyName"), phone:data.get("emergencyPhone"), relation:data.get("emergencyRelation")},
        photo:f.photoFile.files[0] ? await this.file(f.photoFile.files[0]) : old.photo,
        identityPdf:f.identityFile.files[0] ? await this.file(f.identityFile.files[0]) : old.identityPdf
      }
    };
    await Api.request(admin ? "/api/admin/players" : "/api/player/profile", { method: admin ? "POST" : "PUT", body: JSON.stringify(payload) });
    this.closeModal(); await this.reload();
  },

  openChamp(id = "") {
    const c = id ? this.db.championships.find(x => x.id === id) : { id:"", name:"", city:this.db.club.city, place:"", organizer:"", startDate:"", endDate:"", category:"Juvenil", status:"Inscrito", titleWon:"", notes:"", teams:[{id:crypto.randomUUID(), name:"ToCrown A", players:[]},{id:crypto.randomUUID(), name:"ToCrown B", players:[]}] };
    this.modal(id ? "Editar Campeonato" : "Nuevo Campeonato", `<form id="champForm"><div class="form-grid-3">${this.input("name","Nombre",c.name,true)}${this.input("city","Ciudad",c.city,true)}${this.input("place","Lugar",c.place,true)}${this.input("organizer","Organizador",c.organizer,true)}${this.input("startDate","Fecha inicio",c.startDate,true,"date")}${this.input("endDate","Fecha final",c.endDate,true,"date")}${this.select("category","Categoria",c.category,["Infantil","Juvenil","Mayores","Abierto"])}${this.select("status","Estado",c.status,["Inscrito","En juego","Finalizado"])}${this.input("titleWon","Titulo ganado",c.titleWon)}</div><label>Notas<textarea name="notes">${this.esc(c.notes)}</textarea></label><div class="form-section-title">Subequipos</div><div id="teams">${c.teams.map(t => this.teamEditor(t)).join("")}</div><button type="button" class="btn-sm green" onclick="App.addTeam()">Agregar subequipo</button></form>`, `<button class="btn-sm outline" onclick="App.closeModal()">Cancelar</button><button class="btn-sm gold" onclick="App.saveChamp('${id}')">Guardar Campeonato</button>`);
  },
  teamEditor(t) {
    return `<div class="team-box" data-id="${t.id}"><label>Nombre subequipo<input name="teamName" value="${this.esc(t.name)}"></label><div class="check-list">${this.db.players.map(p => `<label><input type="checkbox" value="${p.id}" ${t.players.includes(p.id) ? "checked" : ""}>${this.esc(p.fullName)} · ${this.esc(p.position)}</label>`).join("")}</div><button type="button" class="btn-sm danger" onclick="this.closest('.team-box').remove()">Quitar</button></div>`;
  },
  addTeam() {
    document.getElementById("teams").insertAdjacentHTML("beforeend", this.teamEditor({ id: crypto.randomUUID(), name: `ToCrown ${String.fromCharCode(65 + document.querySelectorAll(".team-box").length)}`, players: [] }));
  },
  async saveChamp(id) {
    const data = new FormData(document.getElementById("champForm"));
    const champ = { id, name:data.get("name"), city:data.get("city"), place:data.get("place"), organizer:data.get("organizer"), startDate:data.get("startDate"), endDate:data.get("endDate"), category:data.get("category"), status:data.get("status"), titleWon:data.get("titleWon"), notes:data.get("notes"), teams:[...document.querySelectorAll("#teams .team-box")].map(box => ({ id:box.dataset.id, name:box.querySelector("[name=teamName]").value, players:[...box.querySelectorAll("input:checked")].map(x => x.value) })) };
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
  requestsTable(items, actions) {
    return this.table(["Jugadora","Tipo","Version","Talla","Estado","Fecha","Nota", actions ? "" : ""], items.map(r => `<tr><td>${this.esc(this.playerName(r.playerId))}</td><td>${this.esc(r.type)}</td><td>${this.esc(r.version)}</td><td>${this.esc(r.size)}</td><td><span class="pill pill-gold">${this.esc(r.status)}</span></td><td>${this.esc(r.date)}</td><td>${this.esc(r.note)}</td>${actions ? `<td><button class="btn-sm outline" onclick="App.openRequest('${r.id}')">Editar</button></td>` : ""}</tr>`).join(""));
  },
  table(headers, rows) {
    return `<div class="card table-wrap"><table class="table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}"><div class="empty">Sin registros.</div></td></tr>`}</tbody></table></div>`;
  },
  summary(rows) { return `<div class="summary">${rows.map(([a,b]) => `<div><span>${this.esc(a)}</span><b>${this.esc(b)}</b></div>`).join("")}</div>`; },
  input(name,label,value="",required=false,type="text") { return `<label>${label}<input name="${name}" type="${type}" value="${this.esc(value)}" ${required ? "required" : ""}></label>`; },
  select(name,label,value,options) { return `<label>${label}<select name="${name}">${options.map(o => { const v = Array.isArray(o) ? o[0] : o; const l = Array.isArray(o) ? o[1] : o; return `<option value="${this.esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${this.esc(l)}</option>`; }).join("")}</select></label>`; },
  modal(title, body, foot) { document.getElementById("modalRoot").innerHTML = `<div class="modal"><div class="modal-box"><div class="modal-head"><h3>${title}</h3><button class="btn-sm outline" onclick="App.closeModal()">Cerrar</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`; },
  closeModal() { document.getElementById("modalRoot").innerHTML = ""; },
  file(file) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); },
  syncHealthChecks() {
    const form = document.getElementById("playerForm");
    if (!form) return;
    const selected = [...form.querySelectorAll(".check-group input[type=checkbox]:checked")].map(input => input.parentElement.textContent.trim());
    const target = form.querySelector("[name=conditions]");
    if (target) target.value = selected.join(", ");
  },
  emptyPlayer() { return { id:"", userId:"", fullName:"", documentType:"TI", document:"", birthDate:"", city:this.db.club.city, phone:"", address:"", guardian:"", guardianPhone:"", position:"Punta", number:"", category:"Juvenil", status:"Activa", sizes:{shirt:"M",short:"M",lycra:"M",jacket:"M",shoes:""}, health:{blood:"",eps:"",conditions:"",allergies:"",meds:""}, emergency:{name:"",phone:"",relation:""}, photo:"", identityPdf:"", notes:"" }; }
};

document.addEventListener("DOMContentLoaded", () => App.init());
