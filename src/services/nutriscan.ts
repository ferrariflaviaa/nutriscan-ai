import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

import {
  LIMIAR_TABELA,
} from "../config/modelConfig";


// ==========================================
// CAMINHO DO MODELO DE PRODUÇÃO
// ==========================================

const MODEL_URL =
  `${import.meta.env.BASE_URL}models/nutriscan-v1.json`;


// ==========================================
// CACHE DOS MODELOS
// ==========================================

let mobileNetModel:
  mobilenet.MobileNet | null = null;

let classifier:
  tf.LayersModel | null = null;


// ==========================================
// RESULTADO
// ==========================================

export type ResultadoNutriScan = {
  classe:
    | "Tabela nutricional"
    | "Não é tabela nutricional";

  confianca: number;

  probabilidadeTabela: number;

  limiarUtilizado: number;
};


// ==========================================
// MODELOS CARREGADOS
// ==========================================

type ModelosCarregados = {
  mobileNetModel: mobilenet.MobileNet;
  classifier: tf.LayersModel;
};


// ==========================================
// CARREGAR MODELOS
// ==========================================

async function carregarModelos():
  Promise<ModelosCarregados> {

  await tf.ready();


  // ========================================
  // MOBILENET
  // ========================================

  if (!mobileNetModel) {
    console.log(
      "Carregando MobileNet...",
    );


    mobileNetModel =
      await mobilenet.load();


    console.log(
      "MobileNet carregada com sucesso.",
    );
  }


  // ========================================
  // CLASSIFICADOR NUTRISCAN
  // ========================================

  if (!classifier) {
    console.log(
      "Carregando classificador NutriScan V1...",
    );

    console.log(
      "URL do modelo:",
      MODEL_URL,
    );


    try {
      classifier =
        await tf.loadLayersModel(
          MODEL_URL,
        );

    } catch (error) {
      console.error(
        "Erro ao carregar o modelo estático do NutriScan:",
        error,
      );

      throw error;
    }


    console.log(
      "NutriScan V1 carregado com sucesso.",
    );
  }


  return {
    mobileNetModel,
    classifier,
  };
}


// ==========================================
// ANALISAR
// ==========================================

export async function analisarComNutriScan(
  image: HTMLImageElement,
): Promise<ResultadoNutriScan> {

  const {
    mobileNetModel: mobileNet,
    classifier: modeloClassificador,
  } =
    await carregarModelos();


  let embedding:
    tf.Tensor | null = null;

  let prediction:
    tf.Tensor | null = null;


  try {
    // ======================================
    // GERAR EMBEDDING
    // ======================================

    embedding =
      mobileNet.infer(
        image,
        true,
      ) as tf.Tensor;


    // ======================================
    // CLASSIFICAR
    // ======================================

    prediction =
      modeloClassificador.predict(
        embedding,
      ) as tf.Tensor;


    const valores =
      await prediction.data();


    const scoreTabela =
      Number(
        valores[0],
      );


    // ======================================
    // SEGURANÇA
    // ======================================

    if (
      !Number.isFinite(
        scoreTabela,
      )
    ) {
      throw new Error(
        "O classificador retornou um valor inválido.",
      );
    }


    // ======================================
    // RESULTADO
    // ======================================

    const ehTabela =
      scoreTabela >=
      LIMIAR_TABELA;


    const confianca =
      ehTabela
        ? scoreTabela
        : 1 - scoreTabela;


    return {
      classe:
        ehTabela
          ? "Tabela nutricional"
          : "Não é tabela nutricional",

      confianca,

      probabilidadeTabela:
        scoreTabela,

      limiarUtilizado:
        LIMIAR_TABELA,
    };

  } finally {
    embedding?.dispose();

    prediction?.dispose();
  }
}


// ==========================================
// LIMPAR CACHE DO CLASSIFICADOR
// ==========================================

export function limparModeloNutriScan() {
  if (classifier) {
    classifier.dispose();

    classifier =
      null;
  }
}
