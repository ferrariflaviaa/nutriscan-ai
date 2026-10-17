import type {
  DadosNutricionais,
} from "./nutritionParser";


// ==========================================
// TIPOS
// ==========================================

export type StatusNutricional =
  | "favoravel"
  | "atencao"
  | "parcial"
  | "insuficiente";


export type TipoAlimento =
  | "solido"
  | "liquido"
  | "desconhecido";


export type AlertaNutricional = {
  nutriente: string;
  titulo: string;
  valor: number;
  limite: number;
  unidade: string;
};


export type DestaqueProteina = {
  valor: number | null;

  referencia: string;

  nivel:
    | "boa"
    | "moderada"
    | "baixa"
    | "nao-identificada";

  mensagem: string;
};


export type ResultadoAnaliseNutricional = {
  status: StatusNutricional;

  titulo: string;

  descricao: string;

  tipoAlimento: TipoAlimento;

  referencia: string | null;

  alertas: AlertaNutricional[];

  pontosPositivos: string[];

  observacoes: string[];

  proteina: DestaqueProteina;

  nutrientesAvaliados: number;

  podeConcluir: boolean;
};


// ==========================================
// LIMITES UTILIZADOS
// ==========================================

const LIMITES = {
  solido: {
    acucaresAdicionados: 15,
    gorduraSaturada: 6,
    sodio: 600,
  },

  liquido: {
    acucaresAdicionados: 7.5,
    gorduraSaturada: 3,
    sodio: 300,
  },
};


// ==========================================
// REFERÊNCIA DA TABELA
// ==========================================

type ReferenciaTabela = {
  tipo: TipoAlimento;

  fator: number | null;

  descricao: string | null;

  baseProteina: string;
};


// ==========================================
// NORMALIZAR TEXTO
// ==========================================

function normalizarTexto(
  texto: string,
): string {

  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase();
}


// ==========================================
// DETECTAR REFERÊNCIA
// ==========================================

function detectarReferencia(
  dados: DadosNutricionais,
  textoOCR: string,
): ReferenciaTabela {

  const texto =
    normalizarTexto(
      textoOCR,
    );


  // ========================================
  // TABELA COM COLUNA 100 ml
  // ========================================

  if (
    /\b100\s*ml\b/i.test(
      texto,
    )
  ) {

    return {
      tipo: "liquido",

      fator: 1,

      descricao: "100 ml",

      baseProteina: "por 100 ml",
    };
  }


  // ========================================
  // TABELA COM COLUNA 100 g
  // ========================================

  if (
    /\b100\s*g\b/i.test(
      texto,
    )
  ) {

    return {
      tipo: "solido",

      fator: 1,

      descricao: "100 g",

      baseProteina: "por 100 g",
    };
  }


  // ========================================
  // TABELA SOMENTE POR PORÇÃO
  // ========================================

  if (
    dados.porcaoValor !== null &&
    dados.porcaoValor > 0 &&
    dados.porcaoUnidade !== null
  ) {

    const unidade =
      dados.porcaoUnidade;


    return {
      tipo:
        unidade === "ml"
          ? "liquido"
          : "solido",

      fator:
        100 /
        dados.porcaoValor,

      descricao:
        unidade === "ml"
          ? "100 ml"
          : "100 g",

      baseProteina:
        `por porção de ${dados.porcaoValor} ${unidade}`,
    };
  }


  // ========================================
  // NÃO CONSEGUIU IDENTIFICAR
  // ========================================

  return {
    tipo: "desconhecido",

    fator: null,

    descricao: null,

    baseProteina:
      "na referência da tabela",
  };
}


// ==========================================
// NORMALIZAR VALOR PARA 100 g / 100 ml
// ==========================================

function normalizarPara100(
  valor: number | null,
  fator: number | null,
): number | null {

  if (
    valor === null ||
    fator === null
  ) {
    return null;
  }


  return valor * fator;
}


// ==========================================
// ANALISAR PROTEÍNA
// ==========================================

function analisarProteina(
  valor: number | null,
  referencia: string,
): DestaqueProteina {

  // ========================================
  // PROTEÇÃO CONTRA VALORES ABSURDOS DO OCR
  // ========================================

  if (
    valor === null ||
    valor < 0 ||
    valor > 100
  ) {
    return {
      valor: null,

      referencia,

      nivel: "nao-identificada",

      mensagem:
        "Não foi possível identificar a quantidade de proteína com segurança.",
    };
  }


  if (
    valor >= 10
  ) {
    return {
      valor,

      referencia,

      nivel: "boa",

      mensagem:
        "Boa quantidade de proteína na referência analisada.",
    };
  }


  if (
    valor >= 5
  ) {
    return {
      valor,

      referencia,

      nivel: "moderada",

      mensagem:
        "Quantidade moderada de proteína na referência analisada.",
    };
  }


  return {
    valor,

    referencia,

    nivel: "baixa",

    mensagem:
      "Baixa quantidade de proteína na referência analisada.",
  };
}


// ==========================================
// ANÁLISE PRINCIPAL
// ==========================================

export function analisarNutricionalmente(
  dados: DadosNutricionais,
  textoOCR: string,
): ResultadoAnaliseNutricional {

  // ========================================
  // REFERÊNCIA
  // ========================================

  const referencia =
    detectarReferencia(
      dados,
      textoOCR,
    );


  // ========================================
  // PROTEÍNA
  // ========================================

  const proteina =
    analisarProteina(
      dados.proteina,
      referencia.baseProteina,
    );


  // ========================================
  // RESULTADOS
  // ========================================

  const alertas:
    AlertaNutricional[] =
      [];


  const pontosPositivos:
    string[] =
      [];


  const observacoes:
    string[] =
      [];


  // ========================================
  // NÃO CONSEGUIU IDENTIFICAR REFERÊNCIA
  // ========================================

  if (
    referencia.tipo ===
      "desconhecido" ||
    referencia.fator ===
      null
  ) {

    return {
      status:
        "insuficiente",

      titulo:
        "Análise incompleta",

      descricao:
        "Não foi possível identificar a referência da tabela nutricional.",

      tipoAlimento:
        "desconhecido",

      referencia:
        null,

      alertas,

      pontosPositivos,

      observacoes: [
        "Tente tirar uma foto mais próxima e nítida da tabela nutricional.",
      ],

      proteina,

      nutrientesAvaliados:
        0,

      podeConcluir:
        false,
    };
  }


  // ========================================
  // TIPO
  // ========================================

  const tipo =
    referencia.tipo;


  const limites =
    tipo === "liquido"
      ? LIMITES.liquido
      : LIMITES.solido;


  // ========================================
  // NORMALIZAR NUTRIENTES
  // ========================================

  const acucaresAdicionados =
    normalizarPara100(
      dados.acucaresAdicionados,
      referencia.fator,
    );


  const gorduraSaturada =
    normalizarPara100(
      dados.gorduraSaturada,
      referencia.fator,
    );


  const sodio =
    normalizarPara100(
      dados.sodio,
      referencia.fator,
    );


  let nutrientesAvaliados =
    0;


  // ========================================
  // AÇÚCARES ADICIONADOS
  // ========================================

  if (
    acucaresAdicionados !==
    null
  ) {

    nutrientesAvaliados++;


    if (
      acucaresAdicionados >=
      limites.acucaresAdicionados
    ) {

      alertas.push({
        nutriente:
          "Açúcares adicionados",

        titulo:
          "Alto em açúcares adicionados",

        valor:
          acucaresAdicionados,

        limite:
          limites.acucaresAdicionados,

        unidade:
          tipo === "liquido"
            ? "g/100 ml"
            : "g/100 g",
      });

    } else {

      pontosPositivos.push(
        "Açúcares adicionados abaixo do limite de alto teor.",
      );
    }

  } else {

    observacoes.push(
      "Açúcares adicionados não foram identificados.",
    );
  }


  // ========================================
  // GORDURA SATURADA
  // ========================================

  if (
    gorduraSaturada !==
    null
  ) {

    nutrientesAvaliados++;


    if (
      gorduraSaturada >=
      limites.gorduraSaturada
    ) {

      alertas.push({
        nutriente:
          "Gordura saturada",

        titulo:
          "Alto em gordura saturada",

        valor:
          gorduraSaturada,

        limite:
          limites.gorduraSaturada,

        unidade:
          tipo === "liquido"
            ? "g/100 ml"
            : "g/100 g",
      });

    } else {

      pontosPositivos.push(
        "Gordura saturada abaixo do limite de alto teor.",
      );
    }

  } else {

    observacoes.push(
      "Gordura saturada não foi identificada.",
    );
  }


  // ========================================
  // SÓDIO
  // ========================================

  if (
    sodio !== null
  ) {

    nutrientesAvaliados++;


    if (
      sodio >=
      limites.sodio
    ) {

      alertas.push({
        nutriente:
          "Sódio",

        titulo:
          "Alto em sódio",

        valor:
          sodio,

        limite:
          limites.sodio,

        unidade:
          tipo === "liquido"
            ? "mg/100 ml"
            : "mg/100 g",
      });

    } else {

      pontosPositivos.push(
        "Sódio abaixo do limite de alto teor.",
      );
    }

  } else {

    observacoes.push(
      "Sódio não foi identificado.",
    );
  }


  // ========================================
  // PROTEÍNA
  // ========================================

  if (
    proteina.nivel ===
    "boa"
  ) {

    pontosPositivos.push(
      `Boa quantidade de proteína: ${proteina.valor} g ${proteina.referencia}.`,
    );

  } else if (
    proteina.nivel ===
    "moderada"
  ) {

    pontosPositivos.push(
      `Quantidade moderada de proteína: ${proteina.valor} g ${proteina.referencia}.`,
    );

  }


  // ========================================
  // SEM NUTRIENTES CRÍTICOS
  // ========================================

  if (
    nutrientesAvaliados ===
    0
  ) {

    return {
      status:
        "insuficiente",

      titulo:
        "Não foi possível concluir",

      descricao:
        "O sistema não conseguiu identificar os nutrientes necessários para avaliar o produto.",

      tipoAlimento:
        tipo,

      referencia:
        referencia.descricao,

      alertas,

      pontosPositivos,

      observacoes: [
        ...observacoes,

        "Tente tirar outra foto mais próxima, bem iluminada e sem reflexos.",
      ],

      proteina,

      nutrientesAvaliados,

      podeConcluir:
        false,
    };
  }


  // ========================================
  // PRODUTO COM ALERTAS
  // ========================================

  if (
    alertas.length > 0
  ) {

    return {
      status:
        "atencao",

      titulo:
        alertas.length >= 2
          ? "Produto com vários pontos de atenção"
          : "Produto com ponto de atenção",

      descricao:
        "Foram identificados nutrientes em quantidade considerada alta nos critérios avaliados.",

      tipoAlimento:
        tipo,

      referencia:
        referencia.descricao,

      alertas,

      pontosPositivos,

      observacoes,

      proteina,

      nutrientesAvaliados,

      podeConcluir:
        true,
    };
  }


  // ========================================
  // ANÁLISE PARCIAL
  // ========================================

  if (
    nutrientesAvaliados <
    2
  ) {

    return {
      status:
        "parcial",

      titulo:
        "Perfil parcialmente favorável",

      descricao:
        "Não foram encontrados alertas nos dados identificados, mas faltaram informações para uma análise mais completa.",

      tipoAlimento:
        tipo,

      referencia:
        referencia.descricao,

      alertas,

      pontosPositivos,

      observacoes,

      proteina,

      nutrientesAvaliados,

      podeConcluir:
        true,
    };
  }


  // ========================================
  // PERFIL FAVORÁVEL
  // ========================================

  return {
    status:
      "favoravel",

    titulo:
      "Perfil nutricional favorável",

    descricao:
      "Não foram identificados níveis altos dos nutrientes críticos avaliados.",

    tipoAlimento:
      tipo,

    referencia:
      referencia.descricao,

    alertas,

    pontosPositivos,

    observacoes,

    proteina,

    nutrientesAvaliados,

    podeConcluir:
      true,
  };
}