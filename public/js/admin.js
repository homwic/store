// admin.js

// === HARD CODE LOGIN ===
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const ADMIN_KEY = "ADMIN_LOGGED_IN";

function isLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function renderLoginForm() {
  document.getElementById("adminRoot").innerHTML = `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-5">
          <div class="card p-4">
            <h3 class="mb-3 text-center" style="color:#21c9a8;font-weight:800;">Admin Login</h3>
            <form id="adminLoginForm" autocomplete="off">
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input type="text" name="username" class="form-control" required autofocus />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" required />
              </div>
              <button class="btn btn-success w-100" type="submit">Login</button>
            </form>
            <div id="loginError" class="text-danger mt-3 text-center d-none"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("adminLoginForm").onsubmit = function (e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem(ADMIN_KEY, "1");
      renderAdminApp("dashboard");
    } else {
      document.getElementById("loginError").classList.remove("d-none");
      document.getElementById("loginError").textContent =
        "Username atau password salah!";
    }
  };
}

// === APP LAYOUT + TAB NAVIGATION ===
function renderAdminApp(active = "dashboard") {
  document.getElementById("adminRoot").innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light px-3 mb-4">
      <a class="navbar-brand fw-bold" href="#" style="color:#21c9a8;font-weight:900;font-size:1.2em;">Admin Panel</a>
      <div class="collapse navbar-collapse show">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <a class="nav-link${active === "dashboard" ? " active" : ""}" href="#" id="navDashboard">Produk</a>
          </li>
          <li class="nav-item">
            <a class="nav-link${active === "history" ? " active" : ""}" href="#" id="navHistory">Riwayat Transaksi</a>
          </li>
        </ul>
        <button class="btn btn-outline-danger btn-action logout-btn" id="logoutBtn">Logout</button>
      </div>
    </nav>
    <div id="adminPage"></div>
  `;

  document.getElementById("logoutBtn").onclick = function () {
    localStorage.removeItem(ADMIN_KEY);
    renderLoginForm();
  };
  document.getElementById("navDashboard").onclick = function (e) {
    e.preventDefault();
    renderAdminApp("dashboard");
  };
  document.getElementById("navHistory").onclick = function (e) {
    e.preventDefault();
    renderAdminApp("history");
  };

  if (active === "dashboard") {
    renderDashboardPage();
  } else if (active === "history") {
    renderHistoryPage();
  }
}

// === DASHBOARD PRODUK ===
function renderDashboardPage() {
  document.getElementById("adminPage").innerHTML = `
    <div class="container py-2">
      <h1 class="admin-title mb-2">Dashboard Produk</h1>
      <div class="card card-admin p-4">
        <div class="mb-4">
          <h4 class="mb-3">Daftar Produk</h4>
          <div class="table-responsive">
            <table class="table align-middle" id="productsTable">
              <thead class="table-light">
                <tr>
                  <th>Nama</th>
                  <th>Harga</th>
                  <th>Deskripsi</th>
                  <th>Gambar</th>
                  <th>Stok</th>
                  <th>SNK</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="form-section mt-4">
        <h4 class="mb-3">Tambah Produk Baru</h4>
        <form id="addProductForm" autocomplete="off">
          <div class="row g-3">
            <div class="col-md-3">
              <input class="form-control" name="name" placeholder="Nama Produk" required />
            </div>
            <div class="col-md-2">
              <input class="form-control" name="price" placeholder="Harga" required type="number" min="1" />
            </div>
            <div class="col-md-4">
              <input class="form-control" name="desc" placeholder="Deskripsi" required />
            </div>
            <div class="col-md-2">
              <input class="form-control" type="file" name="image" id="imageInput" accept="image/*" required />
            </div>
            <div class="col-md-12">
              <textarea class="form-control" name="snk" placeholder="Syarat & Ketentuan (opsional)" rows="2"></textarea>
            </div>
            <div class="col-md-1 d-grid">
              <button class="btn btn-success btn-action" type="submit">
                <b>+</b> Tambah
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  loadProducts();
  setupAddProductForm();
}

// === RIWAYAT TRANSAKSI ===
function renderHistoryPage() {
  document.getElementById("adminPage").innerHTML = `
    <div class="container py-2">
      <h1 class="admin-title mb-2">Riwayat Transaksi</h1>
      <div class="card card-admin p-4">
        <div class="table-responsive">
          <table class="table align-middle" id="historyTable">
            <thead class="table-light">
              <tr>
                <th>No</th>
                <th>Waktu</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Whastapp</th>
                <th>Produk</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="7" class="text-center text-muted">Memuat data ...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  fetch("/api/orders")
    .then((r) => r.json())
    .then((orders) => {
      let html = "";
      if (orders && orders.length) {
        orders.reverse().forEach((o, i) => {
          html += `
            <tr>
              <td>${i + 1}</td>
              <td>${
                o.time ? new Date(o.time).toLocaleString("id-ID") : "-"
              }</td>
              <td>${o.name || "-"}</td>
              <td>${o.email || "-"}</td>
              <td>${o.wa || "-"}</td>
              <td>${o.product_name || "-"}</td>
              <td>
                <span class="badge bg-${
                  o.status === "PAID"
                    ? "success"
                    : o.status === "EXPIRED"
                      ? "danger"
                      : "warning"
                }">
                  ${o.status}
                </span>
              </td>
              <td><code>${o.reference || "-"}</code></td>
            </tr>
          `;
        });
      } else {
        html = `<tr><td colspan="7" class="text-center text-muted">Belum ada transaksi</td></tr>`;
      }
      document.querySelector("#historyTable tbody").innerHTML = html;
    })
    .catch(() => {
      document.querySelector("#historyTable tbody").innerHTML =
        `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data</td></tr>`;
    });
}

// === PRODUK TABLE ===
function loadProducts() {
  fetch("/api/products")
    .then((res) => res.json())
    .then((products) => {
      let html = "";
      products.forEach((p) => {
        html += `
          <tr>
            <td>${p.name}</td>
            <td>
              <span class="price-view">Rp <span class="harga-value">${p.price.toLocaleString()}</span></span>
              <button class="btn btn-sm btn-outline-primary btn-edit-price ms-2" data-id="${
                p.id
              }" data-price="${p.price}">Edit</button>
            </td>
            <td>${p.desc}</td>
            <td><img src="${p.image}" class="badge-image"></td>
            <td>
              <button class="btn btn-warning btn-action btn-stock" data-id="${
                p.id
              }" data-name="${p.name}">
                Stok (${p.stock?.length || 0})
              </button>
            </td>
            <td>
              <span class="d-inline-block snk-short">${
                p.snk
                  ? p.snk.slice(0, 20).replace(/<[^>]*>?/gm, "") + "..."
                  : "-"
              }</span>
              <button class="btn btn-sm btn-info btn-edit-snk ms-2" data-id="${
                p.id
              }" data-snk="${encodeURIComponent(p.snk || "")}">Edit</button>
              <button class="btn btn-sm btn-outline-secondary btn-snk ms-1" data-snk="${encodeURIComponent(
                p.snk || ""
              )}" data-name="${p.name}">Lihat</button>
            </td>
            <td>
              <button onclick="deleteProduct('${
                p.id
              }')" class="btn btn-danger btn-action">Hapus</button>
            </td>
          </tr>
        `;
      });
      document.querySelector("#productsTable tbody").innerHTML = html;

      // Edit harga
      document.querySelectorAll(".btn-edit-price").forEach((btn) => {
        btn.onclick = function () {
          const id = this.dataset.id;
          const hargaAwal = this.dataset.price;
          const cell = this.closest("td");
          cell.innerHTML = `
            <form class="d-flex edit-harga-form" style="gap:4px">
              <input type="number" min="1" value="${hargaAwal}" class="form-control form-control-sm" style="width:90px">
              <button type="submit" class="btn btn-success btn-sm">Simpan</button>
              <button type="button" class="btn btn-secondary btn-sm btn-cancel-edit">Batal</button>
            </form>
          `;
          cell.querySelector(".btn-cancel-edit").onclick = () => loadProducts();
          cell.querySelector(".edit-harga-form").onsubmit = function (e) {
            e.preventDefault();
            const newPrice = this.querySelector("input").value;
            fetch(`/api/products/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: parseInt(newPrice) }),
            })
              .then((res) => res.json())
              .then(loadProducts);
          };
        };
      });

      // Edit SNK
      document.querySelectorAll(".btn-edit-snk").forEach((btn) => {
        btn.onclick = function () {
          const id = this.dataset.id;
          const snkAwal = decodeURIComponent(this.dataset.snk || "");
          document.getElementById("editSnkProductId").value = id;
          document.getElementById("editSnkTextarea").value = snkAwal;
          var modal = new bootstrap.Modal(
            document.getElementById("editSnkModal")
          );
          modal.show();
        };
      });

      // Lihat SNK (PAKAI innerText AGAR FORMAT RAPIH SESUAI INPUT)
      document.querySelectorAll(".btn-snk").forEach((btn) => {
        btn.onclick = function () {
          document.getElementById("snkProductName").innerText =
            this.dataset.name;
          document.getElementById("snkContent").innerText =
            decodeURIComponent(this.dataset.snk) || "-";
          var modal = new bootstrap.Modal(document.getElementById("snkModal"));
          modal.show();
        };
      });

      // Event stok button
      document.querySelectorAll(".btn-stock").forEach((btn) => {
        btn.onclick = function () {
          openStockModal(this.dataset.id, this.dataset.name);
        };
      });
    });
}

function deleteProduct(id) {
  if (confirm("Yakin hapus produk?")) {
    fetch(`/api/products/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then(() => loadProducts());
  }
}

// ==== FORM TAMBAH PRODUK (dengan base64 image) ====
function setupAddProductForm() {
  document
    .getElementById("addProductForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const form = this;
      const fileInput = form.querySelector('input[type="file"][name="image"]');
      const file = fileInput.files[0];

      if (!file) {
        alert("Gambar produk wajib diisi!");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (evt) {
        const base64Image = evt.target.result;
        const data = {
          name: form.name.value,
          price: parseInt(form.price.value),
          desc: form.desc.value,
          image: base64Image,
          stock: [],
          snk: form.snk.value,
        };
        fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then(() => {
            form.reset();
            loadProducts();
          });
      };
      reader.readAsDataURL(file);
    });
}

// ========== STOCK MODAL HANDLING ===========
let currentProductId = null;

function openStockModal(productId, productName) {
  currentProductId = productId;
  document.getElementById("modalProductName").innerText =
    "Stok untuk: " + productName;
  loadStock();
  var modal = new bootstrap.Modal(document.getElementById("stockModal"));
  modal.show();
}

function loadStock() {
  fetch(`/api/products/${currentProductId}/stock`)
    .then((res) => res.json())
    .then((stock) => {
      let html = "";
      stock.forEach((s, i) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td>${s.email || "-"}</td>
          <td>${s.password || "-"}</td>
          <td>${s.pin || "-"}</td>
          <td>${
            s.link ? `<a href="${s.link}" target="_blank">${s.link}</a>` : "-"
          }</td>
          <td>
            <button class="btn btn-sm btn-danger btn-delete-stock" data-idx="${i}">&times;</button>
          </td>
        </tr>`;
      });
      document.querySelector("#stockTable tbody").innerHTML = html;
      document.querySelectorAll(".btn-delete-stock").forEach((btn) => {
        btn.onclick = function () {
          if (confirm("Hapus akun stok ini?")) {
            fetch(
              `/api/products/${currentProductId}/stock/${btn.dataset.idx}`,
              { method: "DELETE" }
            )
              .then((res) => res.json())
              .then(() => {
                loadStock();
                loadProducts();
              });
          }
        };
      });
    });
}

document
  .getElementById("addStockForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const email = this.email.value.trim();
    const password = this.password.value.trim();
    const pin = this.pin.value.trim();
    const link = this.link.value.trim();

    // Validasi: harus isi link ATAU email+password
    if (!link && (!email || !password)) {
      alert("Isi Link, atau Email & Password!");
      return;
    }

    const data = { email, password, pin, link };
    fetch(`/api/products/${currentProductId}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then(() => {
        this.reset();
        loadStock();
        loadProducts();
      });
  });

// ========== EDIT SNK MODAL ===========
document.getElementById("editSnkForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const id = document.getElementById("editSnkProductId").value;
  const snk = document.getElementById("editSnkTextarea").value;
  fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snk }),
  })
    .then((res) => res.json())
    .then(() => {
      var modal = bootstrap.Modal.getInstance(
        document.getElementById("editSnkModal")
      );
      modal.hide();
      loadProducts();
    });
});

// INIT
if (isLoggedIn()) {
  renderAdminApp("dashboard");
} else {
  renderLoginForm();
}
