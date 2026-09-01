import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4080;
const TOKEN =
  process.env.NFE_LOOKUP_TOKEN || process.env.VITE_NFE_LOOKUP_TOKEN || "";

// CORS liberado (dev)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Se definiu TOKEN, exige Authorization: Bearer <TOKEN>
app.use((req, res, next) => {
  if (!TOKEN) return next();
  const hdr = String(req.headers.authorization || "");
  const ok = hdr.startsWith("Bearer ") && hdr.slice(7).trim() === TOKEN;
  if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
});

function formatCNPJ(cnpj) {
  const s = String(cnpj).padStart(14, "0");
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(
    8,
    12
  )}-${s.slice(12)}`;
}

// NF-e: cUF(2) AAMM(4) CNPJ(14) mod(2) série(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
function parseChave(chave) {
  const s = String(chave || "").replace(/\D+/g, "");
  if (s.length !== 44) return null;

  const aa = Number(s.slice(2, 4));
  const mm = Number(s.slice(4, 6));
  const year = 2000 + aa;
  const month = Math.min(Math.max(mm, 1), 12);

  const cnpj = s.slice(6, 20);
  const serie = s.slice(22, 25);
  const numero = s.slice(25, 34);

  // valor determinístico para dev (soma dos dígitos * 1.11)
  const sum = s.split("").reduce((a, d) => a + Number(d), 0);
  const valor = Number((sum * 1.11).toFixed(2));

  const dataEmissao = new Date(Date.UTC(year, month - 1, 1))
    .toISOString()
    .slice(0, 10);

  return {
    emitente: `Emitente ${formatCNPJ(cnpj)}`,
    valor,
    dataEmissao,
    numero,
    serie,
  };
}

function handleLookup(chave, res) {
  const info = parseChave(chave);
  if (!info) return res.status(400).json({ ok: false, error: "invalid_key" });
  return res.json({ ok: true, ...info });
}

app.get("/api/nfe", (req, res) => handleLookup(req.query.chave, res));
app.post("/api/nfe", (req, res) => handleLookup(req.body?.chave, res));

app.listen(PORT, () => {
  console.log(`NF-e lookup mock ativo em http://192.168.40.67:${4080}/api/nfe`);
});
