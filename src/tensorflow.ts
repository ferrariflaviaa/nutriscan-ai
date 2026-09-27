import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

let model: mobilenet.MobileNet | null = null;

export async function carregarModelo() {
  await tf.ready();

  console.log("TensorFlow backend:", tf.getBackend());

  if (!model) {
    model = await mobilenet.load();
  }

  return model;
}

export async function analisarImagem(
  image: HTMLImageElement
) {
  const modelo = await carregarModelo();

  const resultado = await modelo.classify(image, 5);

  return resultado;
}