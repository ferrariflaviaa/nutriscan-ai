import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

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

function embaralhar<T>(items: T[]): T[] {
  return [...items].sort(
    () => Math.random() - 0.5
  );
}

function criarAmostras(
  split: DatasetSplit,
  limitePorClasse: number
): Sample[] {

  const quantidade = Math.min(
    split["nutrition-label"].length,
    split.other.length,
    limitePorClasse
  );

  const positivas = embaralhar(
    split["nutrition-label"]
  )
    .slice(0, quantidade)
    .map(url => ({
      url,
      label: 1
    }));

  const negativas = embaralhar(
    split.other
  )
    .slice(0, quantidade)
    .map(url => ({
      url,
      label: 0
    }));

  return embaralhar([
    ...positivas,
    ...negativas
  ]);
}

function carregarImagem(
  src: string
): Promise<HTMLImageElement> {

  return new Promise(
    (resolve, reject) => {

      const image = new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            `Erro ao carregar ${src}`
          )
        );

      image.src = src;
    }
  );
}

async function extrairFeatures(
  model: mobilenet.MobileNet,
  samples: Sample[],
  onProgress?: (
    atual: number,
    total: number
  ) => void
) {

  const features: number[][] = [];
  const labels: number[] = [];

  for (
    let i = 0;
    i < samples.length;
    i++
  ) {

    const sample = samples[i];

    const image =
      await carregarImagem(sample.url);

    // Aqui está acontecendo o
    // transfer learning.
    const embedding = model.infer(
      image,
      true
    ) as tf.Tensor;

    const values =
      Array.from(
        await embedding.data()
      );

    features.push(values);
    labels.push(sample.label);

    embedding.dispose();

    onProgress?.(
      i + 1,
      samples.length
    );
  }

  const x = tf.tensor2d(features);

  const y = tf.tensor2d(
    labels,
    [labels.length, 1]
  );

  return {
    x,
    y,
    featureSize: features[0].length
  };
}

export async function treinarClassificador(
  atualizarStatus: (
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

  const manifest:
    DatasetManifest =
      await response.json();



  const trainSamples =
  criarAmostras(
    manifest.train,
    200
  );

  const validationSamples =
    criarAmostras(
      manifest.valid,
      30
    );


  atualizarStatus(
    "Extraindo características das imagens de treino..."
  );

  const train =
    await extrairFeatures(
      mobileNet,
      trainSamples,
      (atual, total) => {
        atualizarStatus(
          `Preparando treino: ${atual}/${total}`
        );
      }
    );


  atualizarStatus(
    "Preparando imagens de validação..."
  );

  const validation =
    await extrairFeatures(
      mobileNet,
      validationSamples
    );


  // ==========================
  // NOSSO MODELO
  // ==========================

  const classifier =
    tf.sequential();

  classifier.add(
    tf.layers.dense({
      inputShape: [
        train.featureSize
      ],
      units: 32,
      activation: "relu"
    })
  );

  classifier.add(
    tf.layers.dropout({
      rate: 0.2
    })
  );

  classifier.add(
    tf.layers.dense({
      units: 1,
      activation: "sigmoid"
    })
  );


  classifier.compile({
    optimizer:
      tf.train.adam(0.001),

    loss:
      "binaryCrossentropy",

    metrics: [
      "accuracy"
    ]
  });


  atualizarStatus(
    "Treinando NutriScan AI..."
  );


  await classifier.fit(
    train.x,
    train.y,
    {
      epochs: 30,

      batchSize: 16,

      shuffle: true,

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
              `Época ${epoch + 1}/20
              | Precisão: ${(accuracy * 100).toFixed(1)}%
              | Validação: ${(valAccuracy * 100).toFixed(1)}%`
            );
          }
      }
    }
  );


  // Salva o modelo no navegador.
  await classifier.save(
    "indexeddb://nutriscan-classifier"
  );


  train.x.dispose();
  train.y.dispose();

  validation.x.dispose();
  validation.y.dispose();


  atualizarStatus(
    "Modelo treinado e salvo!"
  );

  return classifier;
}