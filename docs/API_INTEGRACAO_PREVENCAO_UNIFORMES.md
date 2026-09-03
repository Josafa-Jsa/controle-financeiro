# 📡 Manual Oficial de Integração de API — Prevenção de Perdas & Uniformes
**Big Master Supermercados & JSA Tecnologia da Informação**

Esta API RESTful permite que outros sistemas corporativos (ERPs, softwares de RH, CFTV, Totens de Segurança, Apps mobile ou sistemas de Logística) se integrem de forma segura com os módulos de **Prevenção de Perdas** e **Controle de Estoque de Uniformes**.

---

## 🔐 1. Autenticação

Todas as chamadas à API devem conter a chave de autenticação nos cabeçalhos HTTP:

```http
x-api-key: bigmaster_jsa_api_secret_2026
Content-Type: application/json
```

> **Dica**: Você também pode enviar como `Authorization: Bearer <chave>` ou como parâmetro de URL `?api_key=<chave>`.

---

## 🌐 2. URL Base da API

| Ambiente | URL Base |
| :--- | :--- |
| **Localhost** | `http://localhost:4000/api/v1/integracao` |
| **Rede Local (LAN)** | `http://192.168.40.67:4000/api/v1/integracao` |
| **VPN / Remoto** | `http://26.118.72.235:4000/api/v1/integracao` |

---

## 👕 3. Endpoints de Uniformes

### 3.1. Consultar Estoque Consolidado
Retorna o saldo em tempo real por departamento e tamanho.

- **Método**: `GET`
- **Rota**: `/uniformes/estoque`
- **Filtros opcionais**: `?departamento=Açougue&tamanho=M`

#### Exemplo de Resposta (200 OK):
```json
{
  "sucesso": true,
  "resumo": {
    "totalItensCadastrados": 85,
    "totalEstoqueNovos": 1420,
    "totalEstoqueUsados": 315,
    "totalEstoqueGeral": 1735
  },
  "itens": [
    {
      "id": 1,
      "departamento": "Açougue",
      "tamanho": "M",
      "estado_novo_qtd": 25,
      "estado_usado_qtd": 8,
      "total_qtd": 33,
      "fabricante_principal": "Jucicler"
    }
  ]
}
```

---

### 3.2. Registrar Entrada de Uniformes (Compras / Fornecedor)
- **Método**: `POST`
- **Rota**: `/uniformes/entrada`
- **Payload (JSON)**:
```json
{
  "departamento": "Padaria",
  "tamanho": "G",
  "quantidade": 50,
  "estado": "Novo",
  "fabricante": "Jucicler",
  "responsavel": "Sistema de Compras ERP",
  "observacoes": "Nota Fiscal 4591"
}
```

---

### 3.3. Registrar Entrega a Colaborador (RH)
- **Método**: `POST`
- **Rota**: `/uniformes/entrega`
- **Payload (JSON)**:
```json
{
  "colaborador": "João Carlos da Silva",
  "cpf": "123.456.789-00",
  "matricula": "8841",
  "departamento": "Hortifruti",
  "tamanho": "M",
  "quantidade": 2,
  "estado": "Novo",
  "responsavel": "RH Central",
  "observacoes": "Kit admissional de uniformes"
}
```

---

### 3.4. Registrar Transferência para Filiais (Logística)
- **Método**: `POST`
- **Rota**: `/uniformes/transferencia`
- **Payload (JSON)**:
```json
{
  "filialDestino": "Filial 2",
  "enviadoPor": "Logística Matriz",
  "quemIraReceber": "Marcos (Gerente)",
  "motorista": "Carlos Logística - Placa ABC-1234",
  "itens": [
    { "departamento": "Frente de Caixa", "tamanho": "M", "quantidade": 20, "estado": "Novo" },
    { "departamento": "Açougue", "tamanho": "G", "quantidade": 15, "estado": "Novo" }
  ],
  "observacoes": "Suprimento mensal"
}
```

---

### 3.5. Registrar Baixa / Descarte / Avaria
- **Método**: `POST`
- **Rota**: `/uniformes/descarte`
- **Payload (JSON)**:
```json
{
  "departamento": "Peixaria",
  "tamanho": "G",
  "quantidade": 3,
  "estado": "Usado",
  "motivo": "Rasgado / Desgaste Natural",
  "responsavel": "Encarregado de Setor",
  "observacoes": "Avariados durante a rotina"
}
```

---

## 🛡️ 4. Endpoints de Prevenção de Perdas

### 4.1. Consultar Ocorrências
- **Método**: `GET`
- **Rota**: `/prevencao/ocorrencias`
- **Filtros opcionais**: `?status=Em Andamento&filial=Filial 1&dataInicio=2026-09-01&limite=20`

---

### 4.2. Criar Ocorrência (CFTV / Totem / App Terceiro)
- **Método**: `POST`
- **Rota**: `/prevencao/ocorrencias`
- **Payload (JSON)**:
```json
{
  "tipo": "Furto",
  "filial": "Filial 1",
  "data_fato": "2026-09-02",
  "hora_fato": "14:35",
  "local_especifico": "Corredor 4 - Perfumaria / Bebidas",
  "descricao": "Indivíduo flagrado pelas câmeras do CFTV ocultando mercadorias na mochila.",
  "valor_estimado": 185.50,
  "recuperado": true,
  "status": "Em Andamento",
  "operador": "Central CFTV",
  "produtos": [
    { "descricao": "Whisky Red Label 1L", "quantidade": 1, "valor": 110.00 },
    { "descricao": "Desodorante Rexona 150ml", "quantidade": 3, "valor": 75.50 }
  ]
}
```

---

### 4.3. Atualizar Status ou Encerrar Ocorrência
- **Método**: `PUT`
- **Rota**: `/prevencao/ocorrencias/OC-123456/status`
- **Payload (JSON)**:
```json
{
  "novoStatus": "Encerrada",
  "motivoEncerramento": "Mercadorias recuperadas integralmente no local.",
  "operador": "Supervisor Prevenção"
}
```

---

## 💻 5. Exemplos de Código para Outros Sistemas

### Exemplo em Python:
```python
import requests

API_URL = "http://192.168.40.67:4000/api/v1/integracao"
HEADERS = {
    "x-api-key": "bigmaster_jsa_api_secret_2026",
    "Content-Type": "application/json"
}

# Consultar estoque de uniformes
res = requests.get(f"{API_URL}/uniformes/estoque", headers=HEADERS)
print("Estoque:", res.json())

# Criar ocorrência na prevenção
nova_ocorrencia = {
    "tipo": "Consumo no Local",
    "filial": "Filial 1",
    "descricao": "Consumo de produto no salão sem pagamento.",
    "valor_estimado": 25.90,
    "recuperado": False,
    "operador": "Totem Fiscal"
}
resp_oc = requests.post(f"{API_URL}/prevencao/ocorrencias", json=nova_ocorrencia, headers=HEADERS)
print("Ocorrência criada:", resp_oc.json())
```

### Exemplo com cURL:
```bash
# Consultar estoque de uniformes
curl -X GET "http://192.168.40.67:4000/api/v1/integracao/uniformes/estoque" \
     -H "x-api-key: bigmaster_jsa_api_secret_2026"
```
