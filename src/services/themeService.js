// src/services/themeService.js

export const LISTA_TEMAS = [
  {
    id: "escuro",
    nome: "Escuro",
    corFundo: "#000000",
    corTexto: "#ffffff",
    corBorda: "#ffffff",
  },
  {
    id: "claro",
    nome: "Claro",
    corFundo: "#ffffff",
    corTexto: "#000000",
    corBorda: "#d1d5db",
  },
  {
    id: "azul",
    nome: "Azul",
    corFundo: "#0b1e36",
    corTexto: "#ffffff",
    corBorda: "#38bdf8",
  },
  {
    id: "verde",
    nome: "Verde",
    corFundo: "#00897b",
    corTexto: "#ffffff",
    corBorda: "#2dd4bf",
  },
  {
    id: "rosa",
    nome: "Rosa",
    corFundo: "#e11d48",
    corTexto: "#ffffff",
    corBorda: "#fb7185",
  },
  {
    id: "laranja",
    nome: "Laranja",
    corFundo: "#f97316",
    corTexto: "#ffffff",
    corBorda: "#fb923c",
  },
];

export const obterTemaSalvo = () => {
  try {
    return localStorage.getItem("jsa_theme") || "escuro";
  } catch {
    return "escuro";
  }
};

export const aplicarTema = (themeId) => {
  const temaValido = LISTA_TEMAS.some((t) => t.id === themeId) ? themeId : "escuro";
  try {
    localStorage.setItem("jsa_theme", temaValido);
    
    // Aplica no html e body para máxima compatibilidade com CSS
    document.documentElement.setAttribute("data-theme", temaValido);
    document.body.setAttribute("data-theme", temaValido);
    
    // Remove classes anteriores e adiciona a nova
    document.body.classList.remove(
      "theme-escuro",
      "theme-claro",
      "theme-azul",
      "theme-verde",
      "theme-rosa",
      "theme-laranja"
    );
    document.body.classList.add(`theme-${temaValido}`);

    // Emite evento global para que componentes reajam se necessário
    window.dispatchEvent(
      new CustomEvent("jsa_theme_change", { detail: { theme: temaValido } })
    );
  } catch (e) {
    console.warn("Erro ao aplicar tema:", e);
  }
  return temaValido;
};

// Inicialização imediata ao carregar o bundle
if (typeof window !== "undefined") {
  aplicarTema(obterTemaSalvo());
}
