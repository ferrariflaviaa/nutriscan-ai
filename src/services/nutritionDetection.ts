// Exige diferentes nutrientes com valores para não aceitar apenas o título
// ou textos promocionais da embalagem como uma tabela.
export function textoContemTabelaNutricional(texto: string): boolean {
  const normalizado = texto.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const linhas = normalizado.split(/\r?\n/);
  const nutrientes = [
    /valor energetico|\bcalori[ae]s\b|\benergy\b/,
    /carboidratos?|carbohydrates?/,
    /acucares|sugars?/,
    /proteinas?|proteins?/,
    /gorduras? totais|gordura total|total fat/,
    /gorduras? saturadas?|saturated fat/,
    /gorduras? trans|trans fat/,
    /fibras?|fibers?|fibres?/,
    /sodio|sodium/,
  ];
  const quantidade = nutrientes.filter(nutriente => linhas.some(linha =>
    nutriente.test(linha) && /\d+(?:[.,]\d+)?/.test(linha),
  )).length;
  const cabecalho = /informacao nutricional|nutrition facts|porcao|serving size/.test(normalizado);
  return quantidade >= 4 || (cabecalho && quantidade >= 3);
}
