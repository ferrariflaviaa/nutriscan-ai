export type DadosNutricionais = {
  energiaKcal: number | null;
  energiaKj: number | null;

  gordura: number | null;
  gorduraSaturada: number | null;

  carboidratos: number | null;
  acucares: number | null;

  fibra: number | null;
  proteina: number | null;

  sodio: number | null;
  sal: number | null;
};


// ==========================================
// NORMALIZAÇÃO
// ==========================================

function normalizarLinha(
  linha: string
): string {

  return linha
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}


// ==========================================
// CORRIGIR NÚMEROS DO OCR
// ==========================================

function corrigirTokenNumerico(
  token: string
): string {

  return token
    .replace(/[oO]/g, "0")
    .replace(/[sS]/g, "5")
    .replace(/[iIlL]/g, "1")
    .replace(",", ".")
    .trim();
}


function converterNumero(
  token: string
): number | null {

  const corrigido =
    corrigirTokenNumerico(token);

  const numero =
    Number(corrigido);

  if (
    Number.isNaN(numero) ||
    !Number.isFinite(numero)
  ) {
    return null;
  }

  return numero;
}


// ==========================================
// EXTRAIR NÚMERO
// ==========================================

function extrairNumero(
  linha: string | null
): number | null {

  if (!linha) {
    return null;
  }

  const match =
    linha.match(
      /(\d+(?:[.,]\d+)?)\s*(?:mg|g)?/i
    );

  if (!match?.[1]) {
    return null;
  }

  return converterNumero(
    match[1]
  );
}


// ==========================================
// CORRIGIR CASOS DE "g" LIDO COMO 9
// ==========================================

function corrigirValorComUnidade(
  linha: string | null,
  valor: number | null
): number | null {

  if (
    !linha ||
    valor === null
  ) {
    return valor;
  }


  // Protein 03g -> 0.3g

  const decimalSemPonto =
    linha.match(
      /(?:^|\s)0(\d)\s*g(?:\s|$)/i
    );

  if (decimalSemPonto?.[1]) {

    return Number(
      `0.${decimalSemPonto[1]}`
    );

  }


  // 6.99 -> 6.9g
  // 0.59 -> 0.5g
  // 0.69 -> 0.6g

  const gVirouNove =
    linha.match(
      /(\d+\.\d)9\s*$/i
    );

  if (gVirouNove?.[1]) {

    return Number(
      gVirouNove[1]
    );

  }


  return valor;
}


// ==========================================
// PROCURAR LINHA POR PRIORIDADE
// ==========================================

function encontrarLinha(
  linhas: string[],
  validar: (
    linha: string
  ) => boolean
): string | null {

  for (
    const linhaOriginal of linhas
  ) {

    const linha =
      normalizarLinha(
        linhaOriginal
      );

    if (
      validar(linha)
    ) {

      return linha;

    }

  }

  return null;
}


// ==========================================
// ENERGIA
// ==========================================

function extrairEnergiaKj(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes("ener") ||
        linha.includes("energia")
    );

  if (!linha) {
    return null;
  }


  const match =
    linha.match(
      /(\d[\d.oOsSiIlL]*)\s*k\s*[jil1]/i
    );


  if (!match?.[1]) {
    return null;
  }


  return converterNumero(
    match[1]
  );
}


// ==========================================
// CALORIAS
// ==========================================

function extrairEnergiaKcal(
  linhas: string[],
  energiaKj: number | null
): number | null {

  // ----------------------------------------
  // FORMATO EUROPEU / BRASILEIRO
  //
  // 660 kJ / 158 kcal
  // ----------------------------------------

  const linhaEnergia =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes("ener") ||
        linha.includes("energia")
    );


  if (linhaEnergia) {

    const kcalMatch =
      linhaEnergia.match(
        /(\d[\d.oOsSiIlL]*)\s*kcal/i
      );


    if (kcalMatch?.[1]) {

      const token =
        corrigirTokenNumerico(
          kcalMatch[1]
        );


      let kcal =
        Number(token);


      if (
        !Number.isNaN(kcal)
      ) {

        // Se temos kJ, usamos para validar.
        if (
          energiaKj !== null
        ) {

          const esperado =
            energiaKj / 4.184;


          const diferenca =
            Math.abs(
              kcal - esperado
            ) / esperado;


          if (
            diferenca > 0.15 &&
            token.length >= 4
          ) {

            // 1158 -> 158

            const semPrimeiro =
              Number(
                token.substring(1)
              );


            if (
              !Number.isNaN(
                semPrimeiro
              )
            ) {

              const diferencaCorrigida =
                Math.abs(
                  semPrimeiro -
                  esperado
                ) / esperado;


              if (
                diferencaCorrigida <
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

    }

  }


  // ----------------------------------------
  // FORMATO AMERICANO
  //
  // Calories 100
  // Calories 100 Calories from Fat 100
  // ----------------------------------------

  const linhaCalories =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes(
          "calories"
        )
    );


  if (
    linhaCalories
  ) {

    const match =
      linhaCalories.match(
        /calories\s+(\d+(?:\.\d+)?)/i
      );


    if (
      match?.[1]
    ) {

      return Number(
        match[1]
      );

    }

  }


  return null;
}


// ==========================================
// GORDURA TOTAL
// ==========================================

function extrairGordura(
  linhas: string[]
): number | null {

  /*
    Primeiro procuramos explicitamente:

    Total Fat 11g
    Total Fat 4g
    Gorduras Totais

    Também aceitamos OCR cortado:

    al Fat 4g

    Mas rejeitamos:

    Calories from Fat 100
    Fat Cal 35
    Saturated Fat
    Trans Fat
  */

  const linha =
    encontrarLinha(
      linhas,
      linha => {

        const temFat =
          linha.includes("fat");

        const temGordura =
          linha.includes(
            "gordura"
          );

        if (
          !temFat &&
          !temGordura
        ) {

          return false;

        }


        if (
          linha.includes(
            "from fat"
          ) ||
          linha.includes(
            "fat cal"
          ) ||
          linha.includes(
            "saturated"
          ) ||
          linha.includes(
            "aturated"
          ) ||
          linha.includes(
            "trans fat"
          )
        ) {

          return false;

        }


        return (
          /\d+(?:\.\d+)?\s*g/i
            .test(linha)
        );

      }
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// GORDURA SATURADA
// ==========================================

function extrairSaturada(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        (
          linha.includes(
            "saturat"
          ) ||
          linha.includes(
            "aturated"
          ) ||
          linha.includes(
            "saturada"
          )
        ) &&
        /\d/.test(linha)
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// CARBOIDRATOS
// ==========================================

function extrairCarboidratos(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        (
          linha.includes(
            "carbohyd"
          ) ||
          linha.includes(
            "carboidr"
          )
        )
        &&
        !linha.includes(
          "sugar"
        )
    );


  if (
    !linha ||
    !/\d/.test(linha)
  ) {

    return null;

  }


  return extrairNumero(
    linha
  );
}


// ==========================================
// AÇÚCAR
// ==========================================

function extrairAcucares(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes(
          "sugar"
        ) ||
        linha.includes(
          "acucar"
        ) ||
        linha.includes(
          "açúcar"
        )
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// FIBRA
// ==========================================

function extrairFibra(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes(
          "fibre"
        ) ||
        linha.includes(
          "fiber"
        ) ||
        linha.includes(
          "fibra"
        )
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// PROTEÍNA
// ==========================================

function extrairProteina(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes(
          "protein"
        ) ||
        linha.includes(
          "proteina"
        ) ||
        linha.includes(
          "proteína"
        )
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// SÓDIO
// ==========================================

function extrairSodio(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.includes(
          "sodium"
        ) ||
        linha.includes(
          "sodio"
        ) ||
        linha.includes(
          "sódio"
        )
    );


  return extrairNumero(
    linha
  );
}


// ==========================================
// SAL
// ==========================================

function extrairSal(
  linhas: string[]
): number | null {

  const linha =
    encontrarLinha(
      linhas,
      linha =>
        linha.startsWith(
          "salt"
        ) ||
        linha.startsWith(
          "sal "
        )
    );


  let valor =
    extrairNumero(
      linha
    );


  valor =
    corrigirValorComUnidade(
      linha,
      valor
    );


  return valor;
}


// ==========================================
// INTERPRETADOR PRINCIPAL
// ==========================================

export function interpretarTabelaNutricional(
  textoOCR: string
): DadosNutricionais {

  const linhas =
    textoOCR
      .split(/\r?\n/)
      .map(
        linha =>
          linha.trim()
      )
      .filter(
        linha =>
          linha.length > 0
      );


  const energiaKj =
    extrairEnergiaKj(
      linhas
    );


  const energiaKcal =
    extrairEnergiaKcal(
      linhas,
      energiaKj
    );


  return {

    energiaKcal,

    energiaKj,

    gordura:
      extrairGordura(
        linhas
      ),

    gorduraSaturada:
      extrairSaturada(
        linhas
      ),

    carboidratos:
      extrairCarboidratos(
        linhas
      ),

    acucares:
      extrairAcucares(
        linhas
      ),

    fibra:
      extrairFibra(
        linhas
      ),

    proteina:
      extrairProteina(
        linhas
      ),

    sodio:
      extrairSodio(
        linhas
      ),

    sal:
      extrairSal(
        linhas
      )

  };

}