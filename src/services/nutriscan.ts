import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

let mobileNetModel: mobilenet.MobileNet | null = null;

let classifier: tf.LayersModel | null = null;


// ==========================================
// THRESHOLD ESCOLHIDO APÓS AVALIAÇÃO
// ==========================================

export const LIMIAR_TABELA = 0.40;


// ==========================================
// CARREGAR MODELOS
// ==========================================

async function carregarModelos() {

  await tf.ready();


  if (!mobileNetModel) {

    mobileNetModel =
      await mobilenet.load();

  }


  if (!classifier) {

    classifier =
      await tf.loadLayersModel(
        "indexeddb://nutriscan-classifier"
      );

  }


  return {
    mobileNetModel,
    classifier
  };
}


// ==========================================
// TIPO DO RESULTADO
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
// ANALISAR IMAGEM
// ==========================================

export async function analisarComNutriScan(
  image: HTMLImageElement
): Promise<ResultadoNutriScan> {

  const {
    mobileNetModel,
    classifier
  } =
    await carregarModelos();


  // ========================================
  // MOBILE NET
  //
  // Converte a imagem em características
  // visuais.
  // ========================================

  const embedding =
    mobileNetModel.infer(
      image,
      true
    ) as tf.Tensor;


  // ========================================
  // NOSSO CLASSIFICADOR
  // ========================================

  const prediction =
    classifier.predict(
      embedding
    ) as tf.Tensor;


  const valores =
    await prediction.data();


  const scoreTabela =
    valores[0];


  // ========================================
  // DECISÃO
  //
  // Antes:
  // score >= 0.50
  //
  // Agora:
  // score >= 0.40
  // ========================================

  const ehTabela =
    scoreTabela >= LIMIAR_TABELA;


  const confianca =
    ehTabela
      ? scoreTabela
      : 1 - scoreTabela;


  // ========================================
  // LIBERAR MEMÓRIA
  // ========================================

  embedding.dispose();

  prediction.dispose();


  // ========================================
  // RESULTADO
  // ========================================

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
// LIMPAR MODELO DA MEMÓRIA
//
// Isso será útil quando treinarmos novamente.
// ==========================================

export function limparModeloNutriScan() {

  if (classifier) {

    classifier.dispose();

    classifier = null;

  }

}