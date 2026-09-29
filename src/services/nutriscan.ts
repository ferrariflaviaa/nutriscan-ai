import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

import {
  LIMIAR_TABELA,
  MODEL_STORAGE_KEY
} from "../config/modelConfig";


let mobileNetModel:
  mobilenet.MobileNet |
  null = null;


let classifier:
  tf.LayersModel |
  null = null;


// ==========================================
// RESULTADO
// ==========================================

export type ResultadoNutriScan = {

  classe:
    | "Tabela nutricional"
    | "Não é tabela nutricional";

  confianca:
    number;

  probabilidadeTabela:
    number;

  limiarUtilizado:
    number;

};


// ==========================================
// CARREGAR MODELOS
// ==========================================

async function carregarModelos() {

  await tf.ready();


  if (
    !mobileNetModel
  ) {

    mobileNetModel =
      await mobilenet.load();

  }


  if (
    !classifier
  ) {

    classifier =
      await tf.loadLayersModel(
        MODEL_STORAGE_KEY
      );

  }


  return {
    mobileNetModel,
    classifier
  };

}


// ==========================================
// ANALISAR
// ==========================================

export async function analisarComNutriScan(
  image: HTMLImageElement
): Promise<ResultadoNutriScan> {

  const {
    mobileNetModel,
    classifier
  } =
    await carregarModelos();


  const embedding =
    mobileNetModel.infer(
      image,
      true
    ) as tf.Tensor;


  const prediction =
    classifier.predict(
      embedding
    ) as tf.Tensor;


  const valores =
    await prediction.data();


  const scoreTabela =
    valores[0];


  const ehTabela =
    scoreTabela >=
    LIMIAR_TABELA;


  const confianca =
    ehTabela
      ? scoreTabela
      : 1 - scoreTabela;


  embedding.dispose();

  prediction.dispose();


  return {

    classe:
      ehTabela
        ? "Tabela nutricional"
        : "Não é tabela nutricional",

    confianca,

    probabilidadeTabela:
      scoreTabela,

    limiarUtilizado:
      LIMIAR_TABELA

  };

}


// ==========================================
// LIMPAR CACHE DO MODELO
// ==========================================

export function limparModeloNutriScan() {

  if (
    classifier
  ) {

    classifier.dispose();

    classifier =
      null;

  }

}