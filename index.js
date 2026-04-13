
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const users = [
  { id: "1", email: "admin@escola.com", password: "123456", name: "Administrador Escola", role: "admin" },
  { id: "2", email: "financeiro@escola.com", password: "123456", name: "Financeiro Escola", role: "financeiro" },
  { id: "3", email: "maria@email.com", password: "123456", name: "Maria Silva", role: "guardian" }
];

let students = [
  { id: "s1", name: "Ana Beatriz", guardianName: "Maria Silva", className: "5º Ano A", monthlyFee: 850, status: "ATIVO", overdueDays: 0 }
];

let charges = [
  { id: "c1", studentId: "s1", studentName: "Ana Beatriz", description: "Mensalidade Abril/2026", amount: 850, dueDate: "2026-04-10", method: "Pix", status: "PENDENTE", paymentProviderRef: "" }
];

let payments = [];
let notifications = [];
let auditLogs = [];

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "Token ausente." });
  const parts = token.replace("Bearer ", "").split("|");
  if (parts.length < 2) return res.status(401).json({ message: "Token inválido." });
  req.user = { email: parts[0], role: parts[1] };
  next();
}

function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ message: "Acesso negado." });
    next();
  };
}

function addAudit(entityType, entityId, action, actor, metadata = null) {
  auditLogs.unshift({ id: `a${Date.now()}${Math.floor(Math.random()*1000)}`, entityType, entityId, action, actor, metadata, createdAt: new Date().toISOString() });
}

app.get("/", (_req, res) => res.send("API rodando 🚀"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Credenciais inválidas." });
  const token = `${user.email}|${user.role}|token`;
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get("/students", auth, requireRoles("admin", "financeiro", "guardian"), (_req, res) => res.json(students));

app.post("/students", auth, requireRoles("admin", "financeiro"), (req, res) => {
  const { name, guardianName, className, monthlyFee } = req.body || {};
  if (!name || !guardianName || !className || typeof monthlyFee !== "number") return res.status(400).json({ message: "Campos obrigatórios." });
  const item = { id: `s${Date.now()}`, name, guardianName, className, monthlyFee, status: "ATIVO", overdueDays: 0 };
  students.unshift(item);
  addAudit("student", item.id, "student_created", req.user.email, { name });
  res.status(201).json(item);
});

app.get("/charges", auth, requireRoles("admin", "financeiro", "guardian"), (_req, res) => res.json(charges));

app.post("/charges", auth, requireRoles("admin", "financeiro"), (req, res) => {
  const { studentId, description, amount, dueDate, method } = req.body || {};
  const student = students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ message: "Aluno não encontrado." });
  const item = { id: `c${Date.now()}`, studentId, studentName: student.name, description, amount, dueDate, method, status: "PENDENTE", paymentProviderRef: "" };
  charges.unshift(item);
  addAudit("charge", item.id, "charge_created", req.user.email, { amount, method });
  res.status(201).json(item);
});

app.get("/payments", auth, requireRoles("admin", "financeiro", "guardian"), (_req, res) => res.json(payments));

app.post("/payments/generate", auth, requireRoles("admin", "financeiro"), (req, res) => {
  const { chargeId, method } = req.body || {};
  const charge = charges.find(c => c.id === chargeId);
  if (!charge) return res.status(404).json({ message: "Cobrança não encontrada." });
  const payment = { id: `p${Date.now()}`, chargeId: charge.id, provider: "mock_gateway", method, amount: charge.amount, status: "GERADO", providerReference: `PAY-${charge.id}-${Date.now()}`, paidAt: null, reconciledAt: null };
  charge.paymentProviderRef = payment.providerReference;
  payments.unshift(payment);
  addAudit("payment", payment.id, "payment_generated", req.user.email, { method });
  res.status(201).json({ payment });
});

app.patch("/payments/:id/confirm", auth, requireRoles("admin", "financeiro"), (req, res) => {
  const payment = payments.find(p => p.id === req.params.id);
  if (!payment) return res.status(404).json({ message: "Pagamento não encontrado." });
  payment.status = "CONFIRMADO";
  payment.paidAt = new Date().toISOString();
  payment.reconciledAt = new Date().toISOString();
  const charge = charges.find(c => c.id === payment.chargeId);
  if (charge) charge.status = "PAGA";
  addAudit("payment", payment.id, "payment_confirmed", req.user.email);
  res.json(payment);
});

app.get("/dashboard/executive", auth, requireRoles("admin", "financeiro"), (_req, res) => {
  const totalPending = charges.filter(c => c.status !== "PAGA").reduce((s, c) => s + Number(c.amount), 0);
  const totalReceived = payments.filter(p => p.status === "CONFIRMADO").reduce((s, p) => s + Number(p.amount), 0);
  res.json({ totalPending, totalReceived, openCharges: charges.filter(c => c.status !== "PAGA").length, paidPayments: payments.filter(p => p.status === "CONFIRMADO").length, notificationsSent: notifications.length, topDebtors: [] });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
