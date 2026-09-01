// api/mock-nfe.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/nfe?chave=44DIGITOS
app.get("/api/nfe", (req, res) => {
  const chave = String(req.query.chave || "").replace(/\D/g, "");
  if (!/^\d{44}$/.test(chave)) {
    return res
      .status(400)
      .json({ ok: false, error: "Chave inválida (44 dígitos)" });
  }
  // payload de exemplo (ajuste pra sua API real)
  const valor = 321.55;
  const dataEmissao = "2025-09-24";
  const emitente = "Auto Posto Jolando";
  const numero = "000123";
  const serie = "1";

  res.json({
    ok: true,
    emitente,
    valor,
    dataEmissao,
    numero,
    serie,
  });
});

const PORT = 4080;
app.listen(PORT, () => {
  console.log(
    `Mock NF-e rodando em http://localhost:${PORT}/api/nfe?chave=...`
  );
});
