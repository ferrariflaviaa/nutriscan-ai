import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

import {
  MODEL_SEED,
  MODEL_STORAGE_KEY,
  TRAIN_EPOCHS,
  TRAIN_IMAGES_PER_CLASS,
  VALID_IMAGES_PER_CLASS
} from "../config/modelConfig";

import {
  limparModeloNutriScan
} from "./nutriscan";


type DatasetSplit = {
  "nutrition-label": string[];
  other: string[];
};


type DatasetManifest = {
  train: DatasetSplit;
  valid: DatasetSplit;
  test: DatasetSplit;
};


type Sample = {
  url: string;
  label: number;
};


// ==========================================
// GERADOR PSEUDOALEATÓRIO COM SEED
// ==========================================

function criarRandomSeed(
  seed: number
) {

  let valor =
    seed >>> 0;


  return function () {

    valor +=
      0x6D2B79F5;


    let t =
      valor;


    t =
      Math.imul(
        t ^ (t >>> 15),
        t | 1
      );


    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61
      );


    return (
      (
        t ^ (t >>> 14)
      ) >>> 0
    ) / 4294967296;

  };

}


// ==========================================
// SHUFFLE DETERMINÍSTICO
// ==========================================

function embaralharDeterministico<T>(
  itens: T[],
  seed: number
): T[] {

  const resultado =
    [...itens];


  const random =
    criarRandomSeed(
      seed
    );


  for (
    let i =
      resultado.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        random() *
        (i + 1)
      );


    [
      resultado[i],
      resultado[j]
    ] =
      [
        resultado[j],
        resultado[i]
      ];

  }


  return resultado;

}


// ==========================================
// CRIAR AMOSTRAS
// ==========================================

function criarAmostras(
  split: DatasetSplit,
  limitePorClasse: number,
  seed: number
): Sample[] {

  const quantidade =
    Math.min(
      split[
        "nutrition-label"
      ].length,

      split.other.length,

      limitePorClasse
    );


  const positivas =
    embaralharDeterministico(
      split[
        "nutrition-label"
      ],
      seed
    )
      .slice(
        0,
        quantidade
      )
      .map(
        url => ({
          url,
          label: 1
        })
      );


  const negativas =
    embaralharDeterministico(
      split.other,
      seed + 1
    )
      .slice(
        0,
        quantidade
      )
      .map(
        url => ({
          url,
          label: 0
        })
      );


  return embaralharDeterministico(
    [
      ...positivas,
      ...negativas
    ],
    seed + 2
  );

}


// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(
  src: string
): Promise<HTMLImageElement> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();


      image.onload =
        () =>
          resolve(
            image
          );


      image.onerror =
        () =>
          reject(
            new Error(
              `Erro ao carregar ${src}`
            )
          );


      image.src =
        src;

    }
  );

}


// ==========================================
// EXTRAIR EMBEDDINGS
// ==========================================

async function extrairFeatures(
  model: mobilenet.MobileNet,

  samples: Sample[],

  onProgress?: (
    atual: number,
    total: number
  ) => void
) {

  const features:
    number[][] = [];


  const labels:
    number[] = [];


  for (
    let i = 0;

    i < samples.length;

    i++
  ) {

    const sample =
      samples[i];


    const image =
      await carregarImagem(
        sample.url
      );


    const embedding =
      model.infer(
        image,
        true
      ) as tf.Tensor;


    const values =
      Array.from(
        await embedding.data()
      );


    features.push(
      values
    );


    labels.push(
      sample.label
    );


    embedding.dispose();


    onProgress?.(
      i + 1,
      samples.length
    );

  }


  const x =
    tf.tensor2d(
      features
    );


  const y =
    tf.tensor2d(
      labels,
      [
        labels.length,
        1
      ]
    );


  return {
    x,
    y,

    featureSize:
      features[0].length
  };

}


// ==========================================
// TREINAMENTO
// ==========================================

export async function treinarClassificador(
  atualizarStatus:
    (
      texto: string
    ) => void
) {

  await tf.ready();


  atualizarStatus(
    "Carregando MobileNet..."
  );


  const mobileNet =
    await mobilenet.load();


  const response =
    await fetch(
      "/training-data/manifest.json"
    );


  if (!response.ok) {

    throw new Error(
      "Não foi possível carregar o dataset."
    );

  }


  const manifest:
    DatasetManifest =
      await response.json();


  // ========================================
  // DATASET FIXO
  // ========================================

  const trainSamples =
    criarAmostras(
      manifest.train,

      TRAIN_IMAGES_PER_CLASS,

      MODEL_SEED
    );


  const validationSamples =
    criarAmostras(
      manifest.valid,

      VALID_IMAGES_PER_CLASS,

      MODEL_SEED + 100
    );


  console.log(
    "Treino:",
    trainSamples.length
  );


  console.log(
    "Validação:",
    validationSamples.length
  );


  atualizarStatus(
    "Extraindo características do treinamento..."
  );


  const train =
    await extrairFeatures(

      mobileNet,

      trainSamples,

      (
        atual,
        total
      ) => {

        atualizarStatus(
          `Preparando treino: ${atual}/${total}`
        );

      }

    );


  atualizarStatus(
    "Preparando validação..."
  );


  const validation =
    await extrairFeatures(
      mobileNet,
      validationSamples
    );


  // ========================================
  // MODELO COM PESOS INICIAIS FIXOS
  // ========================================

  const classifier =
    tf.sequential();


  classifier.add(

    tf.layers.dense({

      inputShape: [
        train.featureSize
      ],

      units: 32,

      activation:
        "relu",

      kernelInitializer:
        tf.initializers.glorotUniform({
          seed:
            MODEL_SEED
        }),

      biasInitializer:
        tf.initializers.zeros()

    })

  );


  /*
    Removemos Dropout nesta versão.

    Dropout adicionava outra fonte
    de aleatoriedade ao treinamento.
  */


  classifier.add(

    tf.layers.dense({

      units: 1,

      activation:
        "sigmoid",

      kernelInitializer:
        tf.initializers.glorotUniform({
          seed:
            MODEL_SEED + 1
        }),

      biasInitializer:
        tf.initializers.zeros()

    })

  );


  classifier.compile({

    optimizer:
      tf.train.adam(
        0.001
      ),

    loss:
      "binaryCrossentropy",

    metrics: [
      "accuracy"
    ]

  });


  atualizarStatus(
    "Treinando NutriScan V1..."
  );


  await classifier.fit(

    train.x,
    train.y,

    {

      epochs:
        TRAIN_EPOCHS,

      batchSize:
        16,

      // MUITO IMPORTANTE:
      // ordem dos dados não muda.
      shuffle:
        false,

      validationData: [
        validation.x,
        validation.y
      ],

      callbacks: {

        onEpochEnd:
          async (
            epoch,
            logs
          ) => {

            const accuracy =
              logs?.acc ??
              logs?.accuracy ??
              0;


            const valAccuracy =
              logs?.val_acc ??
              logs?.val_accuracy ??
              0;


            atualizarStatus(

              `Época ${
                epoch + 1
              }/${TRAIN_EPOCHS}
               | Treino: ${
                 (
                   accuracy *
                   100
                 ).toFixed(1)
               }%
               | Validação: ${
                 (
                   valAccuracy *
                   100
                 ).toFixed(1)
               }%`

            );

          }

      }

    }

  );


  // ========================================
  // REMOVER V1 ANTIGA, SE EXISTIR
  // ========================================

  try {

    const modelos =
      await tf.io.listModels();


    if (
      modelos[
        MODEL_STORAGE_KEY
      ]
    ) {

      await tf.io.removeModel(
        MODEL_STORAGE_KEY
      );

    }

  } catch {

    // Primeira execução:
    // modelo ainda não existe.

  }


  // ========================================
  // SALVAR V1
  // ========================================

  await classifier.save(
    MODEL_STORAGE_KEY
  );


  /*
    Se nutriscan.ts já havia carregado
    um modelo antigo, removemos o cache.

    Na próxima análise ele carregará a
    V1 recém-salva.
  */

  limparModeloNutriScan();


  // ========================================
  // MEMÓRIA
  // ========================================

  train.x.dispose();
  train.y.dispose();

  validation.x.dispose();
  validation.y.dispose();


  atualizarStatus(
    "NutriScan V1 treinado e salvo!"
  );


  return classifier;

}