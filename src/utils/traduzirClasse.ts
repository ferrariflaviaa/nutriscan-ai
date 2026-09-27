const traducoes: Record<string, string> = {
  "oil filter": "Filtro de óleo",
  "packet": "Pacote",
  "pill bottle": "Frasco de comprimidos",

  "toilet tissue, toilet paper, bathroom tissue":
    "Papel higiênico",

  "plastic bag": "Sacola plástica",

  "menu": "Cardápio",

  "book jacket, dust cover, dust jacket, dust wrapper":
    "Capa de livro",

  "laptop, laptop computer":
    "Notebook",

  "desktop computer":
    "Computador de mesa",

  "hard disc, hard disk, fixed disk":
    "Disco rígido"
};

export function traduzirClasse(
  classe: string
): string {

  return traducoes[classe] ?? classe;
}