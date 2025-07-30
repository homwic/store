require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const { Resend } = require("resend");
const https = require("https");


const ipv4Agent = new https.Agent({
  family: 4,
});


const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Helper produk
function readProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) return [];
  const data = fs.readFileSync(PRODUCTS_FILE, "utf-8");
  try {
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}
function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// Helper orders
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  const data = fs.readFileSync(ORDERS_FILE, "utf-8");
  try {
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}
function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// Tripay/Resend config
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_CALLBACK_URL =
  process.env.TRIPAY_CALLBACK_URL ||
  "https://mayoenak.site/api/tripay-callback";
const IS_PROD = process.env.TRIPAY_ENV === "production";

const TRIPAY_BASE_URL = IS_PROD
  ? "https://tripay.co.id/api/transaction/create"
  : "https://tripay.co.id/api-sandbox/transaction/create";
const TRIPAY_DETAIL_URL = IS_PROD
  ? "https://tripay.co.id/api/transaction/detail"
  : "https://tripay.co.id/api-sandbox/transaction/detail";

// Resend config
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM ||
  "Mayo Digital Store <noreply@mayodigitalstore.com>";
const resend = new Resend(RESEND_API_KEY);

// ==== Template Email Akun ====
function akunEmailHtml({ namaPembeli, namaProduk, akun, snk }) {
  return `
    <div style="max-width:480px;margin:auto;background:#fff;border-radius:18px;box-shadow:0 4px 18px #21c9a81a;padding:32px 22px;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="text-align:center;">
        <img src="https://mayoenak.site/image/logo.png" alt="Logo" width="60" style="margin-bottom:18px">
        <h2 style="color:#21c9a8;font-size:1.4rem;margin-bottom:0.6em;font-weight:800;letter-spacing:1px;">Akun Pesanan Anda</h2>
      </div>
      <div style="font-size:1.1rem;line-height:1.7;">
        <div style="margin-bottom:0.8em;">Halo <b>${namaPembeli}</b>,</div>
        <div style="margin-bottom:1.3em;">
          Terima kasih telah membeli produk digital di <b>Mayo Digital Store</b>.<br>
          Berikut detail pesanan Anda:
        </div>
        <table style="width:100%;background:#f7fffd;border-radius:9px;margin-bottom:1.4em;border:1px solid #e0f6f1;">
          <tr>
            <td style="font-weight:600;padding:7px 10px;color:#1ec6a6;width:34%;">Produk</td>
            <td style="padding:7px 10px;color:#159a84;"><b>${namaProduk}</b></td>
          </tr>
          <tr>
            <td style="font-weight:600;padding:7px 10px;color:#1ec6a6;">Email</td>
            <td style="padding:7px 10px;">${akun.email || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight:600;padding:7px 10px;color:#1ec6a6;">Password</td>
            <td style="padding:7px 10px;">${akun.password || "-"}</td>
          </tr>
          ${
            akun.pin
              ? `<tr>
            <td style="font-weight:600;padding:7px 10px;color:#1ec6a6;">Pin</td>
            <td style="padding:7px 10px;">${akun.pin}</td>
          </tr>`
              : ""
          }
          ${
            akun.link
              ? `<tr>
            <td style="font-weight:600;padding:7px 10px;color:#1ec6a6;">Link</td>
            <td style="padding:7px 10px;">
              <a href="${akun.link}" target="_blank" style="color:#1497b9;">${akun.link}</a>
            </td>
          </tr>`
              : ""
          }
        </table>
        <div style="margin-bottom:1.2em;">
          <b>Syarat & Ketentuan:</b><br>
          <div style="color:#555;background:#f8fcfa;padding:13px 16px;border-radius:8px;border:1px solid #e8faf7;margin-top:7px;">
            ${formatSnkEmail(snk)}
          </div>
        </div>
        <div style="color:#989898;font-size:0.99em;margin-top:2.1em;">
          <i>
            <b>Catatan:</b><br>
            - Simpan baik-baik informasi akun Anda.<br>
            - Jika ada kendala, silakan email ini admin@mayoenak.site atau hubungi WhatsApp CS di 0895-1398-0691.
          </i>
        </div>
        <div style="margin-top:2.7em;text-align:center;font-size:0.97em;color:#21c9a8;">
          &copy; 2025 Mayo Digital Store
        </div>
      </div>
    </div>
  `;
}

function formatSnkEmail(snk) {
  if (!snk) return "-";
  return snk
    .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])
    .replace(/\r\n|\n|\r/g, "<br>");
}

// ==== Serve static ====
app.use(express.static(path.join(__dirname, "public")));

// ==== ROUTES HTML ====
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});

// ==== API PRODUK ====
app.get("/api/products", (req, res) => {
  res.json(readProducts());
});
app.get("/api/products/:id", (req, res) => {
  const products = readProducts();
  const prod = products.find((p) => String(p.id) === req.params.id);
  if (!prod) return res.status(404).json({ error: "Produk tidak ditemukan" });
  res.json(prod);
});
app.post("/api/products", (req, res) => {
  const { name, price, desc, image, stock, snk } = req.body;
  if (!name || !price || !desc || !image) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }
  const products = readProducts();
  const newProduct = {
    id: Date.now().toString(),
    name,
    price,
    desc,
    image,
    stock: stock || [],
    snk: snk || "",
  };
  products.push(newProduct);
  writeProducts(products);
  res.json(newProduct);
});
app.put("/api/products/:id", (req, res) => {
  const { price, snk } = req.body;
  let products = readProducts();
  const prod = products.find((p) => String(p.id) === req.params.id);
  if (!prod) return res.status(404).json({ error: "Produk tidak ditemukan" });
  if (price !== undefined) prod.price = price;
  if (snk !== undefined) prod.snk = snk;
  writeProducts(products);
  res.json(prod);
});
app.delete("/api/products/:id", (req, res) => {
  let products = readProducts();
  products = products.filter((p) => String(p.id) !== req.params.id);
  writeProducts(products);
  res.json({ success: true });
});

// ==== STOCK API ====
app.post("/api/products/:id/stock", (req, res) => {
  const { email, password, pin, link } = req.body;
  if ((!link || link.length < 3) && (!email || !password)) {
    return res.status(400).json({ error: "Isi Link, atau Email & Password!" });
  }
  const products = readProducts();
  const prod = products.find((p) => String(p.id) === req.params.id);
  if (!prod) return res.status(404).json({ error: "Produk tidak ditemukan" });
  prod.stock = prod.stock || [];
  prod.stock.push({ email, password, pin, link });
  writeProducts(products);
  res.json({ success: true });
});
app.get("/api/products/:id/stock", (req, res) => {
  const products = readProducts();
  const prod = products.find((p) => String(p.id) === req.params.id);
  if (!prod) return res.status(404).json({ error: "Produk tidak ditemukan" });
  res.json(prod.stock || []);
});
app.delete("/api/products/:id/stock/:stockIdx", (req, res) => {
  let products = readProducts();
  const prod = products.find((p) => String(p.id) === req.params.id);
  if (!prod) return res.status(404).json({ error: "Produk tidak ditemukan" });
  prod.stock = prod.stock || [];
  const idx = parseInt(req.params.stockIdx, 10);
  if (isNaN(idx) || idx < 0 || idx >= prod.stock.length)
    return res.status(400).json({ error: "Stok tidak ditemukan" });
  prod.stock.splice(idx, 1);
  writeProducts(products);
  res.json({ success: true });
});

// ==== TRIPAY CHECKOUT (dan simpan transaksi) ====
app.post("/api/checkout", async (req, res) => {
  const { produk, amount, name, email, wa } = req.body;
  const method = "QRIS";
  if (!produk || !amount || !name || !email) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }
  // Cek stok: jika kosong, tolak!
  const products = readProducts();
  const prod = products.find((p) => String(p.id) === String(produk.id));
  if (!prod || !prod.stock || prod.stock.length === 0) {
    console.log(
      "[CHECKOUT] Gagal: stok habis! Produk:",
      prod ? prod.name : produk.id
    );
    return res.status(400).json({ error: "Stok produk habis!" });
  }
  const merchantRef = "TRX" + Date.now();
  const signature = crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(`${TRIPAY_MERCHANT_CODE}${merchantRef}${amount}`)
    .digest("hex");

  const payload = {
    method,
    merchant_ref: merchantRef,
    amount: amount,
    customer_name: name,
    customer_email: email,
    customer_phone: wa,
    order_items: [
      {
        sku: produk.id || "SKU001",
        name: produk.name,
        price: amount,
        quantity: 1,
        product_url: "",
        image_url: produk.image || "",
      },
    ],
    callback_url: TRIPAY_CALLBACK_URL,
    return_url: "https://mayoenak.site/success",
    signature,
  };

  try {
    const response = await axios.post(TRIPAY_BASE_URL, payload, {
      headers: { Authorization: `Bearer ${TRIPAY_API_KEY}` },
       httpsAgent: ipv4Agent,
    });

    const data = response.data?.data || {};
    const url =
      data.payment_url ||
      data.checkout_url ||
      data.pay_url ||
      data.invoice_url ||
      "";

    // SIMPAN TRANSAKSI
    if (data.reference) {
      const orders = readOrders();
      orders.push({
        reference: data.reference,
        merchant_ref: merchantRef,
        product_id: produk.id || "",
        product_name: produk.name || "",
        name,
        email,
        wa,
        amount,
        status: "UNPAID",
        time: Date.now(),
        akun_sent: false,
      });
      writeOrders(orders);
      console.log(
        "[CHECKOUT] Order disimpan:",
        data.reference,
        produk.name,
        "status=UNPAID"
      );
    }

    if (response.data && response.data.success && url) {
      return res.json({
        pay_url: url,
        reference: data.reference,
      });
    } else if (data.reference) {
      return res.status(200).json({
        error: "Transaksi berhasil, tetapi URL pembayaran tidak ditemukan.",
        reference: data.reference,
        allData: data,
      });
    } else {
      return res.status(500).json({
        error: response.data.message || "Gagal membuat transaksi",
      });
    }
  } catch (e) {
    console.error("[CHECKOUT] Error Tripay:", e);
    return res.status(500).json({
      error:
        e.response?.data?.message ||
        JSON.stringify(e.response?.data) ||
        "Gagal request Tripay",
    });
  }
});

// ==== API: GET detail invoice Tripay ====
app.get("/api/invoice/detail/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const url =
      TRIPAY_DETAIL_URL + "?reference=" + encodeURIComponent(reference);
    const tripayResp = await axios.get(url, {
      headers: { Authorization: `Bearer ${TRIPAY_API_KEY}` },
      httpsAgent: ipv4Agent,
    });
    res.json({ status: "ok", data: tripayResp.data.data });
  } catch (e) {
    res.status(500).json({
      status: "error",
      message: e.response?.data?.message || "Gagal ambil data invoice",
    });
  }
});

// ==== API: RIWAYAT TRANSAKSI ADMIN ====
// Sekarang support /api/orders?single=reference
app.get("/api/orders", (req, res) => {
  const orders = readOrders();
  const single = req.query.single;

  if (single) {
    // Cari order berdasarkan reference saja
    const ord = orders.find((o) => o.reference === single);
    if (!ord) return res.json([]);
    return res.json([ord]);
  }

  // ---- (polling seperti biasa untuk admin/halaman admin) ----
  if (!orders.length) return res.json([]);
  Promise.all(
    orders.map(async (order) => {
      // Hanya update jika belum PAID/EXPIRED dan belum dikirim email
      if (
        order.status === "PAID" ||
        order.status === "EXPIRED" ||
        order.akun_sent === true ||
        order.akun_sent === "FAILED"
      )
        return order;
      try {
        const url =
          TRIPAY_DETAIL_URL +
          "?reference=" +
          encodeURIComponent(order.reference);
        const tripayResp = await axios.get(url, {
          headers: { Authorization: `Bearer ${TRIPAY_API_KEY}` },
        });
        const inv = tripayResp.data.data;
        if (inv && inv.status && inv.status !== order.status) {
          console.log(
            `[RIWAYAT] Update status order: ${order.reference} => ${inv.status}`
          );
          order.status = inv.status;
        }
        // ==== Kirim email akun & kurangi stok jika PAID dan belum dikirim ====
        if (
          inv &&
          inv.status === "PAID" &&
          !order.akun_sent &&
          order.product_id &&
          order.email
        ) {
          let products = readProducts();
          let prod = products.find(
            (p) => String(p.id) === String(order.product_id)
          );
          if (prod && prod.stock && prod.stock.length > 0) {
            const akun = prod.stock[0];
            try {
              const emailHtml = akunEmailHtml({
                namaPembeli: order.name,
                namaProduk: prod.name,
                akun,
                snk: prod.snk,
              });
              console.log(
                `[EMAIL-ORDER] Mengirim akun ke: ${order.email} untuk order ${order.reference}`
              );
              await resend.emails.send({
                from: RESEND_FROM,
                to: order.email,
                subject: `[Mayo Digital Store] Akun ${prod.name} Anda`,
                html: emailHtml,
              });
              // Kurangi stok
              prod.stock.splice(0, 1);
              order.akun_sent = true;
              order.akun_info = akun;
              writeProducts(products);
              console.log(
                `[EMAIL-ORDER] Email terkirim dan stok dikurangi. Sisa stok: ${prod.stock.length}`
              );
            } catch (err) {
              order.akun_sent = "FAILED";
              console.error(
                "[EMAIL-ORDER] Gagal kirim email akun via polling:",
                err
              );
            }
          } else {
            order.akun_sent = "FAILED";
            console.log(
              "[EMAIL-ORDER] Stok kosong, akun tidak bisa dikirim. order di-mark FAILED."
            );
          }
        }
        return order;
      } catch (err) {
        console.error("[RIWAYAT] Error polling status Tripay:", err);
        return order;
      }
    })
  ).then((updatedOrders) => {
    // Update file jika ada status baru / akun_sent baru
    let changed = false;
    updatedOrders.forEach((ord, idx) => {
      if (
        ord.status !== orders[idx].status ||
        ord.akun_sent !== orders[idx].akun_sent
      )
        changed = true;
    });
    if (changed) writeOrders(updatedOrders);
    res.json(updatedOrders);
  });
});

// ==== Tripay callback endpoint (update status di orders.json & KIRIM AKUN via email jika PAID) ====
app.post("/api/tripay-callback", express.json(), async (req, res) => {
  const { reference, status } = req.body;
  console.log(`[CALLBACK] Diterima: reference=${reference}, status=${status}`);
  if (reference && status) {
    const orders = readOrders();
    let changed = false;
    for (let ord of orders) {
      if (ord.reference === reference) {
        if (ord.status !== status) {
          ord.status = status;
          changed = true;
        }
        // Kirim akun ke email jika PAID dan belum dikirim
        if (
          status === "PAID" &&
          !ord.akun_sent &&
          ord.product_id &&
          ord.email
        ) {
          let products = readProducts();
          let prod = products.find(
            (p) => String(p.id) === String(ord.product_id)
          );
          if (prod && prod.stock && prod.stock.length > 0) {
            const akun = prod.stock[0];
            try {
              const emailHtml = akunEmailHtml({
                namaPembeli: ord.name,
                namaProduk: prod.name,
                akun,
                snk: prod.snk,
              });
              console.log(
                `[EMAIL-CALLBACK] Mengirim akun ke: ${ord.email} untuk order ${ord.reference}`
              );
              await resend.emails.send({
                from: RESEND_FROM,
                to: ord.email,
                subject: `[Mayo Digital Store] Akun ${prod.name} Anda`,
                html: emailHtml,
              });
              // Kurangi stok
              prod.stock.splice(0, 1);
              ord.akun_sent = true;
              ord.akun_info = akun;
              writeProducts(products);
              changed = true;
              console.log(
                `[EMAIL-CALLBACK] Email terkirim dan stok dikurangi. Sisa stok: ${prod.stock.length}`
              );
            } catch (err) {
              ord.akun_sent = "FAILED";
              changed = true;
              console.error(
                "[EMAIL-CALLBACK] Gagal kirim email akun (callback):",
                err
              );
            }
          } else {
            ord.akun_sent = "FAILED";
            changed = true;
            console.log(
              "[EMAIL-CALLBACK] Stok kosong/tidak ditemukan, tidak bisa kirim akun. Order di-mark FAILED."
            );
          }
        }
      }
    }
    if (changed) writeOrders(orders);
  }
  res.json({ success: true });
});

app.post('/api/verify-captcha', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token reCAPTCHA tidak ada' });
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Ambil secret key dari .env
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );

    const { success } = response.data;

    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Verifikasi reCAPTCHA gagal' });
    }
  } catch (error) {
    console.error("Error verifikasi reCAPTCHA:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
