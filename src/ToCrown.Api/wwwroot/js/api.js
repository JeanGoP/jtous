const Api = {
  token: localStorage.getItem("tocrown_token") || "",
  user: JSON.parse(localStorage.getItem("tocrown_user") || "null"),

  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      this.logout();
      throw new Error("Sesion vencida o usuario sin permisos.");
    }
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async login(email, password) {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem("tocrown_token", this.token);
    localStorage.setItem("tocrown_user", JSON.stringify(this.user));
    return data;
  },

  logout() {
    this.token = "";
    this.user = null;
    localStorage.removeItem("tocrown_token");
    localStorage.removeItem("tocrown_user");
  },

  snapshot() {
    return this.request(this.user?.role === "admin" ? "/api/admin/snapshot" : "/api/player/snapshot");
  }
};
