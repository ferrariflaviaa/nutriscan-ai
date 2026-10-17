// ==========================================
// TIPOS
// ==========================================

export type DadosNutricionais = {
  energiaKcal: number | null;
  energiaKj: number | null;

  gordura: number | null;
  gorduraSaturada: number | null;
  gorduraTrans: number | null;

  carboidratos: number | null;

  acucares: number | null;

  acucaresTotais: number | null;
  acucaresAdicionados: number | null;

  fibra: number | null;
  proteina: number | null;

  sodio: number | null;
  sal: number | null;

  porcaoValor: number | null;
  porcaoUnidade: "g" | "ml" | null;
};


// ==========================================
// NORMALIZAÇÃO
// ==========================================

function removerAcentos(
  texto: string,
): string {
  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}


function normalizarLinha(
  linha: string,
): string {
  return removerAcentos(
    linha,
  )
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}


// ==========================================
// NÚMEROS
// ==========================================

function corrigirCaracteresNumericos(
  token: string,
): string {
  return token
    .replace(/[oO]/g, "0")
    .replace(/[sS]/g, "5")
    .replace(/[iIlL]/g, "1")
    .replace(",", ".")
    .trim();
}


function converterNumero(
  token: string,
): number | null {
  const corrigido =
    corrigirCaracteresNumericos(
      token,
    );

  const numero =
    Number(
      corrigido,
    );

  if (
    Number.isNaN(
      numero,
    ) ||
    !Number.isFinite(
      numero,
    )
  ) {
    return null;
  }

  return numero;
}


// ==========================================
// REMOVER %VD
// ==========================================

function removerPercentuais(
  linha: string,
): string {
  return linha
    .replace(
      /\d+(?:[.,]\d+)?\s*%\)?/g,
      " ",
    )
    .replace(
      /\*\*/g,
      " ",
    )
    .replace(
      /\|/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}


// ==========================================
// LINHA DECLARA GRAMAS
// ==========================================

function linhaDeclaraGramas(
  linha: string,
): boolean {
  const normalizada =
    normalizarLinha(
      linha,
    );

  /*
    Exemplos:

    Proteínas (g)
    Gorduras totais (g)
    Fibra alimentar (g)

    Nesse caso sabemos que o valor
    daquela linha está em gramas,
    mesmo que o OCR perca o "g"
    depois do número.
  */

  return (
    /\(\s*g\s*\)/i.test(
      normalizada,
    ) ||
    /\bgramas?\b/i.test(
      normalizada,
    )
  );
}


// ==========================================
// CORRIGIR "g" LIDO COMO 9
// ==========================================

function corrigirGComoNove(
  token: string,

  unidadeEsperada:
    "g" | "mg",

  linhaOriginal = "",
): number | null {
  const corrigido =
    corrigirCaracteresNumericos(
      token,
    );


  if (
    unidadeEsperada !==
    "g"
  ) {
    return converterNumero(
      corrigido,
    );
  }


  // ========================================
  // DECIMAL
  //
  // 4,3g -> 4.39
  // 9,0g -> 9.09
  // 0,7g -> 0.79
  // 6,9g -> 6.99
  // ========================================

  if (
    /^\d+\.\d9$/.test(
      corrigido,
    )
  ) {
    return Number(
      corrigido.slice(
        0,
        -1,
      ),
    );
  }


  // ========================================
  // g CONFUNDIDO COM 9
  //
  // 21g -> 219
  // 40g -> 409
  // 18g -> 189
  // ========================================

  if (
    /^\d{2,}9$/.test(
      corrigido,
    )
  ) {
    const semUltimoNove =
      corrigido.slice(
        0,
        -1,
      );

    const numero =
      Number(
        semUltimoNove,
      );

    if (
      !Number.isNaN(
        numero,
      ) &&
      numero <= 100
    ) {
      return numero;
    }
  }


  // ========================================
  // UM DÍGITO + g
  //
  // Proteínas (g) 49 -> 4
  // Fibra (g) 29 -> 2
  // ========================================

  if (
    linhaDeclaraGramas(
      linhaOriginal,
    ) &&
    /^\d9$/.test(
      corrigido,
    )
  ) {
    return Number(
      corrigido[0],
    );
  }


  return converterNumero(
    corrigido,
  );
}


// ==========================================
// ENCONTRAR LINHA
// ==========================================

function encontrarLinha(
  linhas: string[],

  validar: (
    linhaNormalizada:
      string,
  ) => boolean,
): string | null {
  for (
    const linhaOriginal of
    linhas
  ) {
    const normalizada =
      normalizarLinha(
        linhaOriginal,
      );

    if (
      validar(
        normalizada,
      )
    ) {
      return linhaOriginal;
    }
  }

  return null;
}


// ==========================================
// EXTRAIR QUANTIDADE
// ==========================================

function extrairQuantidade(
  linhaOriginal:
    string | null,

  unidadeEsperada:
    "g" | "mg",
): number | null {
  if (
    !linhaOriginal
  ) {
    return null;
  }


  const linha =
    normalizarLinha(
      linhaOriginal,
    );


  const semPercentual =
    removerPercentuais(
      linha,
    );


  // ========================================
  // mg EXPLÍCITO
  // ========================================

  const matchMg =
    semPercentual.match(
      /(\d+(?:\.\d+)?)\s*mg\b/i,
    );


  if (
    matchMg?.[1]
  ) {
    return converterNumero(
      matchMg[1],
    );
  }


  // ========================================
  // g EXPLÍCITO
  //
  // Carboidratos 60g 36g
  // Gordura saturada 8g 4.8g
  //
  // Pegamos o primeiro valor.
  // ========================================

  const matchG =
    semPercentual.match(
      /(\d+(?:\.\d+)?)\s*g\b/i,
    );


  if (
    matchG?.[1]
  ) {
    const token =
      matchG[1];


    // 09g -> 0.9g
    // 03g -> 0.3g

    if (
      /^0\d$/.test(
        token,
      )
    ) {
      return Number(
        `0.${token.substring(1)}`,
      );
    }


    return converterNumero(
      token,
    );
  }


  // ========================================
  // PADRÃO BRASILEIRO
  //
  // Açúcares totais (g) 409 -> 40
  // Proteínas (g) 49 -> 4
  // Gorduras totais (g) 189 -> 18
  // Fibra alimentar (g) 29 -> 2
  // ========================================

  if (
    unidadeEsperada ===
      "g" &&
    linhaDeclaraGramas(
      linhaOriginal,
    )
  ) {
    const numeros =
      semPercentual.match(
        /\b\d+(?:\.\d+)?\b/g,
      );


    if (
      !numeros ||
      numeros.length === 0
    ) {
      return null;
    }


    const token =
      corrigirCaracteresNumericos(
        numeros[0],
      );


    // ======================================
    // 409 -> 40
    // 189 -> 18
    // 219 -> 21
    // ======================================

    if (
      /^\d{2,}9$/.test(
        token,
      )
    ) {
      const corrigido =
        token.slice(
          0,
          -1,
        );


      const numero =
        Number(
          corrigido,
        );


      if (
        !Number.isNaN(
          numero,
        ) &&
        numero <= 100
      ) {
        return numero;
      }
    }


    // ======================================
    // 49 -> 4
    // 29 -> 2
    // ======================================

    if (
      /^\d9$/.test(
        token,
      )
    ) {
      return Number(
        token[0],
      );
    }


    // ======================================
    // 4.39 -> 4.3
    // 0.79 -> 0.7
    // ======================================

    if (
      /^\d+\.\d9$/.test(
        token,
      )
    ) {
      return Number(
        token.slice(
          0,
          -1,
        ),
      );
    }


    return converterNumero(
      token,
    );
  }


  // ========================================
  // FALLBACK
  // ========================================

  const numeros =
    semPercentual.match(
      /\b\d+(?:\.\d+)?\b/g,
    );


  if (
    !numeros ||
    numeros.length === 0
  ) {
    return null;
  }


  return corrigirGComoNove(
    numeros[0],

    unidadeEsperada,

    linhaOriginal,
  );
}


// ==========================================
// PORÇÃO
// ==========================================

function extrairPorcao(
  linhas: string[],
): {
  valor: number | null;
  unidade:
    "g" | "ml" | null;
} {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "porcao:",
        ) ||
        linha.startsWith(
          "porcao ",
        ),
    );


  if (
    !linha
  ) {
    return {
      valor: null,
      unidade: null,
    };
  }


  const normalizada =
    normalizarLinha(
      linha,
    );


  const match =
    normalizada.match(
      /porcao(?:\s*:|\s+de)?\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/i,
    );


  if (
    !match?.[1] ||
    !match?.[2]
  ) {
    return {
      valor: null,
      unidade: null,
    };
  }


  return {
    valor:
      converterNumero(
        match[1],
      ),

    unidade:
      match[2] ===
        "ml"
        ? "ml"
        : "g",
  };
}


// ==========================================
// ENERGIA
// ==========================================

function encontrarLinhaEnergia(
  linhas: string[],
): string | null {
  return encontrarLinha(
    linhas,

    linha =>
      linha.includes(
        "valor energetico",
      ) ||
      linha.includes(
        "energy",
      ) ||
      linha.includes(
        "calories",
      ),
  );
}


function extrairEnergiaKj(
  linhas: string[],
): number | null {
  const linhaOriginal =
    encontrarLinhaEnergia(
      linhas,
    );


  if (
    !linhaOriginal
  ) {
    return null;
  }


  const linha =
    normalizarLinha(
      linhaOriginal,
    );


  const match =
    linha.match(
      /(\d+(?:\.\d+)?)\s*k\s*[jil1]\b/i,
    );


  if (
    !match?.[1]
  ) {
    return null;
  }


  return converterNumero(
    match[1],
  );
}


function extrairEnergiaKcal(
  linhas: string[],

  energiaKj:
    number | null,
): number | null {
  const linhaOriginal =
    encontrarLinhaEnergia(
      linhas,
    );


  if (
    !linhaOriginal
  ) {
    return null;
  }


  const linha =
    normalizarLinha(
      linhaOriginal,
    );


  // ========================================
  // kcal EXPLÍCITO
  // ========================================

  const matchKcal =
    linha.match(
      /(\d+(?:\.\d+)?)\s*kcal\b/i,
    );


  if (
    matchKcal?.[1]
  ) {
    let kcal =
      converterNumero(
        matchKcal[1],
      );


    if (
      kcal === null
    ) {
      return null;
    }


    // ======================================
    // CORREÇÃO USANDO RELAÇÃO kJ / kcal
    // ======================================

    if (
      energiaKj !== null &&
      kcal > 0
    ) {
      const esperado =
        energiaKj /
        4.184;


      const diferenca =
        Math.abs(
          kcal -
          esperado,
        ) /
        esperado;


      if (
        diferenca >
        0.15
      ) {
        const texto =
          String(
            kcal,
          );


        if (
          texto.length >=
          4
        ) {
          const semPrimeiro =
            Number(
              texto.substring(
                1,
              ),
            );


          const diferencaCorrigida =
            Math.abs(
              semPrimeiro -
              esperado,
            ) /
            esperado;


          if (
            diferencaCorrigida <=
            0.15
          ) {
            kcal =
              semPrimeiro;
          }
        }
      }
    }


    return kcal;
  }


  // ========================================
  // FORMATO AMERICANO
  // ========================================

  const matchCalories =
    linha.match(
      /calories\s+(\d+(?:\.\d+)?)/i,
    );


  if (
    matchCalories?.[1]
  ) {
    return converterNumero(
      matchCalories[1],
    );
  }


  return null;
}


// ==========================================
// CARBOIDRATOS
// ==========================================

function extrairCarboidratos(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        (
          linha.includes(
            "carboidratos",
          ) ||
          linha.includes(
            "carboidrato",
          ) ||
          linha.includes(
            "carbohydrate",
          )
        ) &&
        !linha.includes(
          "acucar",
        ) &&
        !linha.includes(
          "sugar",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// AÇÚCARES TOTAIS
// ==========================================

function extrairAcucaresTotais(
  linhas: string[],
): number | null {
  const linhaTotais =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "acucares totais",
        ) ||
        linha.includes(
          "total sugars",
        ),
    );


  if (
    linhaTotais
  ) {
    return extrairQuantidade(
      linhaTotais,
      "g",
    );
  }


  const linhaGenerica =
    encontrarLinha(
      linhas,

      linha =>
        (
          linha.startsWith(
            "acucar",
          ) ||
          linha.startsWith(
            "acucares",
          ) ||
          linha.includes(
            "sugars",
          )
        ) &&
        !linha.includes(
          "adicionado",
        ) &&
        !linha.includes(
          "added",
        ),
    );


  return extrairQuantidade(
    linhaGenerica,
    "g",
  );
}


// ==========================================
// AÇÚCARES ADICIONADOS
// ==========================================

function extrairAcucaresAdicionados(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "acucares adicionados",
        ) ||
        linha.includes(
          "added sugars",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// PROTEÍNA
// ==========================================

function extrairProteina(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "proteina",
        ) ||
        linha.includes(
          "protein",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// GORDURAS TOTAIS
// ==========================================

function extrairGorduraTotal(
  linhas: string[],
): number | null {
  const linhaTotal =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "gorduras totais",
        ) ||
        linha.includes(
          "gordura total",
        ) ||
        linha.includes(
          "total fat",
        ),
    );


  if (
    linhaTotal
  ) {
    return extrairQuantidade(
      linhaTotal,
      "g",
    );
  }


  const fallback =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "fat",
        ) &&
        !linha.includes(
          "saturated",
        ) &&
        !linha.includes(
          "aturated",
        ) &&
        !linha.includes(
          "trans",
        ) &&
        !linha.includes(
          "from fat",
        ) &&
        !linha.includes(
          "fat cal",
        ),
    );


  return extrairQuantidade(
    fallback,
    "g",
  );
}


// ==========================================
// GORDURA SATURADA
// ==========================================

function extrairGorduraSaturada(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "gorduras saturadas",
        ) ||
        linha.includes(
          "gordura saturada",
        ) ||
        linha.includes(
          "saturated fat",
        ) ||
        linha.includes(
          "aturated fat",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// GORDURA TRANS
// ==========================================

function extrairGorduraTrans(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "gorduras trans",
        ) ||
        linha.includes(
          "gordura trans",
        ) ||
        linha.includes(
          "trans fat",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// FIBRA
// ==========================================

function extrairFibra(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "fibra alimentar",
        ) ||
        linha.includes(
          "fibras alimentares",
        ) ||
        linha.includes(
          "fiber",
        ) ||
        linha.includes(
          "fibre",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// SÓDIO
// ==========================================

function extrairSodio(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.includes(
          "sodio",
        ) ||
        linha.includes(
          "sodium",
        ),
    );


  return extrairQuantidade(
    linha,
    "mg",
  );
}


// ==========================================
// SAL
// ==========================================

function extrairSal(
  linhas: string[],
): number | null {
  const linha =
    encontrarLinha(
      linhas,

      linha =>
        linha.startsWith(
          "sal ",
        ) ||
        linha.startsWith(
          "salt ",
        ),
    );


  return extrairQuantidade(
    linha,
    "g",
  );
}


// ==========================================
// PROTEÇÃO CONTRA VALORES IMPOSSÍVEIS
// ==========================================

function textoTemReferencia100g(
  textoOCR: string,
): boolean {
  const texto =
    removerAcentos(
      textoOCR,
    )
      .toLowerCase()
      .replace(
        /,/g,
        ".",
      );


  return /\b100\s*g\b/i.test(
    texto,
  );
}


// ==========================================
// VALIDAR NUTRIENTE EM GRAMAS
// ==========================================

function validarValorEmGramas(
  valor: number | null,

  porcaoValor: number | null,

  porcaoUnidade:
    "g" | "ml" | null,

  referencia100g: boolean,
): number | null {
  if (
    valor === null
  ) {
    return null;
  }


  // Valor negativo é inválido.
  if (
    valor < 0
  ) {
    return null;
  }


  // ========================================
  // REFERÊNCIA DE 100 g
  //
  // Um nutriente individual não pode
  // ultrapassar 100 g em 100 g de produto.
  // ========================================

  if (
    referencia100g &&
    valor > 100
  ) {
    console.warn(
      "NutriScan descartou valor impossível:",
      valor,
      "g em referência de 100 g",
    );

    return null;
  }


  // ========================================
  // TABELA POR PORÇÃO EM GRAMAS
  //
  // Exemplo:
  //
  // porção = 30 g
  // proteína = 2089 g
  //
  // impossível.
  // ========================================

  if (
    !referencia100g &&
    porcaoValor !== null &&
    porcaoValor > 0 &&
    porcaoUnidade ===
      "g" &&
    valor >
      porcaoValor
  ) {
    console.warn(
      "NutriScan descartou valor maior que a própria porção:",
      valor,
      "g / porção de",
      porcaoValor,
      "g",
    );

    return null;
  }


  // ========================================
  // SEM REFERÊNCIA CONFIÁVEL
  //
  // Valores em gramas acima de 100
  // são considerados suspeitos.
  // ========================================

  if (
    !referencia100g &&
    (
      porcaoValor ===
        null ||
      porcaoUnidade !==
        "g"
    ) &&
    valor > 100
  ) {
    console.warn(
      "NutriScan descartou valor suspeito sem referência confiável:",
      valor,
      "g",
    );

    return null;
  }


  return valor;
}


// ==========================================
// SANITIZAR DADOS NUTRICIONAIS
// ==========================================

function sanitizarDadosNutricionais(
  dados: DadosNutricionais,
  textoOCR: string,
): DadosNutricionais {
  const referencia100g =
    textoTemReferencia100g(
      textoOCR,
    );


  const validarGramas = (
    valor:
      number | null,
  ) =>
    validarValorEmGramas(
      valor,

      dados.porcaoValor,

      dados.porcaoUnidade,

      referencia100g,
    );


  const acucaresTotais =
    validarGramas(
      dados.acucaresTotais,
    );


  return {
    ...dados,


    carboidratos:
      validarGramas(
        dados.carboidratos,
      ),


    acucares:
      acucaresTotais,


    acucaresTotais,


    acucaresAdicionados:
      validarGramas(
        dados.acucaresAdicionados,
      ),


    proteina:
      validarGramas(
        dados.proteina,
      ),


    gordura:
      validarGramas(
        dados.gordura,
      ),


    gorduraSaturada:
      validarGramas(
        dados.gorduraSaturada,
      ),


    gorduraTrans:
      validarGramas(
        dados.gorduraTrans,
      ),


    fibra:
      validarGramas(
        dados.fibra,
      ),


    sal:
      validarGramas(
        dados.sal,
      ),
  };
}


// ==========================================
// INTERPRETADOR PRINCIPAL
// ==========================================

export function interpretarTabelaNutricional(
  textoOCR: string,
): DadosNutricionais {
  const linhas =
    textoOCR
      .split(
        /\r?\n/,
      )
      .map(
        linha =>
          linha.trim(),
      )
      .filter(
        linha =>
          linha.length >
          0,
      );


  // ========================================
  // PORÇÃO
  // ========================================

  const porcao =
    extrairPorcao(
      linhas,
    );


  // ========================================
  // ENERGIA
  // ========================================

  const energiaKj =
    extrairEnergiaKj(
      linhas,
    );


  const energiaKcal =
    extrairEnergiaKcal(
      linhas,

      energiaKj,
    );


  // ========================================
  // AÇÚCARES
  // ========================================

  const acucaresTotais =
    extrairAcucaresTotais(
      linhas,
    );


  // ========================================
  // MONTAR DADOS
  // ========================================

  const dados:
    DadosNutricionais = {

    energiaKcal,

    energiaKj,


    gordura:
      extrairGorduraTotal(
        linhas,
      ),


    gorduraSaturada:
      extrairGorduraSaturada(
        linhas,
      ),


    gorduraTrans:
      extrairGorduraTrans(
        linhas,
      ),


    carboidratos:
      extrairCarboidratos(
        linhas,
      ),


    // Compatibilidade com código antigo
    acucares:
      acucaresTotais,


    acucaresTotais,


    acucaresAdicionados:
      extrairAcucaresAdicionados(
        linhas,
      ),


    fibra:
      extrairFibra(
        linhas,
      ),


    proteina:
      extrairProteina(
        linhas,
      ),


    sodio:
      extrairSodio(
        linhas,
      ),


    sal:
      extrairSal(
        linhas,
      ),


    porcaoValor:
      porcao.valor,


    porcaoUnidade:
      porcao.unidade,
  };


  // ========================================
  // ÚLTIMA CAMADA DE SEGURANÇA
  // ========================================

  return sanitizarDadosNutricionais(
    dados,

    textoOCR,
  );
}