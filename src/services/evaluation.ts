import {
  analisarComNutriScan
} from "./nutriscan";

type DatasetSplit = {
  "nutrition-label": string[];
  other: string[];
};

type Manifest = {
  train: DatasetSplit;
  valid: DatasetSplit;
  test: DatasetSplit;
};

type Amostra = {
  url: string;
  esperado: 0 | 1;
};

type AmostraAvaliada = Amostra & {
  probabilidadeTabela: number;
};

export type ErroModelo = {
  url: string;

  esperado:
    | "Tabela nutricional"
    | "Não é tabela nutricional";

  previsto:
    | "Tabela nutricional"
    | "Não é tabela nutricional";

  probabilidadeTabela: number;

  tipo:
    | "Falso positivo"
    | "Falso negativo";
};

export type ResultadoAvaliacao = {
  limiar: number;

  total: number;

  acertos: number;
  erros: number;

  verdadeiroPositivo: number;
  verdadeiroNegativo: number;

  falsoPositivo: number;
  falsoNegativo: number;

  acuracia: number;
  precisao: number;
  recall: number;
  f1Score: number;

  errosDetalhados: ErroModelo[];
};

function carregarImagem(
  src: string
): Promise<HTMLImageElement> {

  return new Promise(
    (resolve, reject) => {

      const imagem = new Image();

      imagem.onload = () => {
        resolve(imagem);
      };

      imagem.onerror = () => {
        reject(
          new Error(
            `Erro ao carregar: ${src}`
          )
        );
      };

      imagem.src = src;
    }
  );
}


function calcularMetricas(
  amostras: AmostraAvaliada[],
  limiar: number
): ResultadoAvaliacao {

  let verdadeiroPositivo = 0;
  let verdadeiroNegativo = 0;

  let falsoPositivo = 0;
  let falsoNegativo = 0;

  const errosDetalhados: ErroModelo[] = [];


  for (const amostra of amostras) {

    const previsto =
      amostra.probabilidadeTabela >= limiar
        ? 1
        : 0;


    // Verdadeiro positivo

    if (
      amostra.esperado === 1 &&
      previsto === 1
    ) {
      verdadeiroPositivo++;
    }


    // Verdadeiro negativo

    if (
      amostra.esperado === 0 &&
      previsto === 0
    ) {
      verdadeiroNegativo++;
    }


    // Falso positivo

    if (
      amostra.esperado === 0 &&
      previsto === 1
    ) {

      falsoPositivo++;

      errosDetalhados.push({
        url: amostra.url,

        esperado:
          "Não é tabela nutricional",

        previsto:
          "Tabela nutricional",

        probabilidadeTabela:
          amostra.probabilidadeTabela,

        tipo:
          "Falso positivo"
      });
    }


    // Falso negativo

    if (
      amostra.esperado === 1 &&
      previsto === 0
    ) {

      falsoNegativo++;

      errosDetalhados.push({
        url: amostra.url,

        esperado:
          "Tabela nutricional",

        previsto:
          "Não é tabela nutricional",

        probabilidadeTabela:
          amostra.probabilidadeTabela,

        tipo:
          "Falso negativo"
      });
    }
  }


  const total =
    amostras.length;


  const acertos =
    verdadeiroPositivo +
    verdadeiroNegativo;


  const erros =
    falsoPositivo +
    falsoNegativo;


  const acuracia =
    total > 0
      ? acertos / total
      : 0;


  const precisao =
    verdadeiroPositivo +
      falsoPositivo >
    0
      ? verdadeiroPositivo /
        (
          verdadeiroPositivo +
          falsoPositivo
        )
      : 0;


  const recall =
    verdadeiroPositivo +
      falsoNegativo >
    0
      ? verdadeiroPositivo /
        (
          verdadeiroPositivo +
          falsoNegativo
        )
      : 0;


  const f1Score =
    precisao + recall > 0
      ? (
          2 *
          precisao *
          recall
        ) /
        (
          precisao +
          recall
        )
      : 0;


  return {
    limiar,

    total,

    acertos,
    erros,

    verdadeiroPositivo,
    verdadeiroNegativo,

    falsoPositivo,
    falsoNegativo,

    acuracia,
    precisao,
    recall,
    f1Score,

    errosDetalhados
  };
}


export async function compararLimiares(
  limiares: number[],
  atualizarProgresso?: (
    atual: number,
    total: number
  ) => void
): Promise<ResultadoAvaliacao[]> {

  const response = await fetch(
    "/training-data/manifest.json"
  );

  if (!response.ok) {

    throw new Error(
      "Não foi possível carregar o manifest."
    );

  }


  const manifest: Manifest =
    await response.json();


  const positivos: Amostra[] =
    manifest.test[
      "nutrition-label"
    ].map(
      (url) => ({
        url,
        esperado: 1
      })
    );


  const negativos: Amostra[] =
    manifest.test.other.map(
      (url) => ({
        url,
        esperado: 0
      })
    );


  const amostras: Amostra[] = [
    ...positivos,
    ...negativos
  ];


  const amostrasAvaliadas:
    AmostraAvaliada[] = [];


  // =====================================
  // A IA ANALISA CADA IMAGEM APENAS UMA VEZ
  // =====================================

  for (
    let i = 0;
    i < amostras.length;
    i++
  ) {

    const amostra =
      amostras[i];


    const imagem =
      await carregarImagem(
        amostra.url
      );


    const resultado =
      await analisarComNutriScan(
        imagem
      );


    amostrasAvaliadas.push({
      ...amostra,

      probabilidadeTabela:
        resultado.probabilidadeTabela
    });


    atualizarProgresso?.(
      i + 1,
      amostras.length
    );
  }


  // =====================================
  // MESMOS SCORES, THRESHOLDS DIFERENTES
  // =====================================

  return limiares.map(
    (limiar) =>
      calcularMetricas(
        amostrasAvaliadas,
        limiar
      )
  );
}


// Mantemos também a função antiga
// caso você precise dela futuramente.

export async function avaliarModelo(
  limiar = 0.5,
  atualizarProgresso?: (
    atual: number,
    total: number
  ) => void
): Promise<ResultadoAvaliacao> {

  const resultados =
    await compararLimiares(
      [limiar],
      atualizarProgresso
    );

  return resultados[0];
}