import { createWorker, PSM } from "tesseract.js";

// ==========================================
// TIPOS
// ==========================================

export type ResultadoOCR = {
  texto: string;
  confianca: number;

  modo?: "original" | "processada";
};

export type ProgressoOCR = {
  progresso: number;
  status: string;
};

// ==========================================
// WORKER
// ==========================================

let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

let callbackProgresso: ((dados: ProgressoOCR) => void) | null = null;

// ==========================================
// TRADUZIR STATUS
// ==========================================

function traduzirStatus(status: string): string {
  const traducoes: Record<string, string> = {
    "loading tesseract core": "Carregando mecanismo OCR",

    "initializing tesseract": "Inicializando OCR",

    "loading language traineddata": "Carregando idiomas",

    "initializing api": "Preparando reconhecimento",

    "recognizing text": "Lendo texto da imagem",
  };

  return traducoes[status] ?? status;
}

// ==========================================
// CARREGAR WORKER
// ==========================================

async function carregarWorker() {
  if (worker) {
    return worker;
  }

  worker = await createWorker(
    ["por", "eng"],
    1,
    {
      logger: (message) => {
        if (typeof message.progress === "number") {
          callbackProgresso?.({
            progresso: message.progress,
            status: traduzirStatus(message.status)
          });
        }
      }
    }
  );

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1"
  });

  return worker;
}

// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(
  origem: string | HTMLImageElement,
): Promise<HTMLImageElement> {
  if (origem instanceof HTMLImageElement) {
    return Promise.resolve(origem);
  }

  return new Promise((resolve, reject) => {
    const imagem = new Image();

    imagem.onload = () => {
      resolve(imagem);
    };

    imagem.onerror = () => {
      reject(new Error("Erro ao carregar imagem para OCR."));
    };

    imagem.src = origem;
  });
}

// ==========================================
// CONTRASTE
// ==========================================

function aplicarContraste(valor: number, contraste: number): number {
  const fator = (259 * (contraste + 255)) / (255 * (259 - contraste));

  const resultado = fator * (valor - 128) + 128;

  return Math.max(
    0,

    Math.min(255, resultado),
  );
}

// ==========================================
// PRÉ-PROCESSAR IMAGEM
// ==========================================

async function prepararImagemOCR(
  origem: string | HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const imagem = await carregarImagem(origem);

  // ========================================
  // AUMENTAR RESOLUÇÃO
  // ========================================

  const escala = 3;

  const canvas = document.createElement("canvas");

  canvas.width = imagem.naturalWidth * escala;

  canvas.height = imagem.naturalHeight * escala;

  const contexto = canvas.getContext(
    "2d",

    {
      willReadFrequently: true,
    },
  );

  if (!contexto) {
    throw new Error("Não foi possível criar o canvas.");
  }

  contexto.imageSmoothingEnabled = true;

  contexto.imageSmoothingQuality = "high";

  contexto.drawImage(
    imagem,

    0,
    0,

    canvas.width,
    canvas.height,
  );

  // ========================================
  // PEGAR PIXELS
  // ========================================

  const imageData = contexto.getImageData(
    0,
    0,

    canvas.width,
    canvas.height,
  );

  const pixels = imageData.data;

  // ========================================
  // GRAYSCALE + CONTRASTE
  // ========================================

  const contraste = 70;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];

    const g = pixels[i + 1];

    const b = pixels[i + 2];

    // grayscale perceptual

    let cinza = 0.299 * r + 0.587 * g + 0.114 * b;

    cinza = aplicarContraste(cinza, contraste);

    pixels[i] = cinza;

    pixels[i + 1] = cinza;

    pixels[i + 2] = cinza;
  }

  contexto.putImageData(
    imageData,

    0,
    0,
  );

  return canvas;
}

// ==========================================
// OCR EM UMA IMAGEM
// ==========================================

async function executarOCR(
  imagem: string | HTMLImageElement | HTMLCanvasElement,
) {
  const ocr = await carregarWorker();

  return await ocr.recognize(imagem);
}

// ==========================================
// EXTRAIR TEXTO
// ==========================================

export async function extrairTextoImagem(
  imagem: string | HTMLImageElement,

  onProgress?: (dados: ProgressoOCR) => void,
): Promise<ResultadoOCR> {
  callbackProgresso = onProgress ?? null;

  try {
    // ======================================
    // TESTE 1:
    // IMAGEM ORIGINAL
    // ======================================

    callbackProgresso?.({
      progresso: 0.05,

      status: "Testando imagem original",
    });

    const original = await executarOCR(imagem);

    // ======================================
    // TESTE 2:
    // IMAGEM PROCESSADA
    // ======================================

    callbackProgresso?.({
      progresso: 0.55,

      status: "Melhorando imagem para leitura",
    });

    const canvas = await prepararImagemOCR(imagem);

    callbackProgresso?.({
      progresso: 0.65,

      status: "Lendo imagem processada",
    });

    const processada = await executarOCR(canvas);

    // ======================================
    // COMPARAR RESULTADOS
    // ======================================

    const confiancaOriginal = original.data.confidence;

    const confiancaProcessada = processada.data.confidence;

    console.log("OCR original:", confiancaOriginal);

    console.log(original.data.text);

    console.log("OCR processado:", confiancaProcessada);

    console.log(processada.data.text);

    // ======================================
    // ESCOLHER MELHOR RESULTADO
    // ======================================

    if (confiancaProcessada > confiancaOriginal) {
      return {
        texto: processada.data.text.trim(),

        confianca: confiancaProcessada,

        modo: "processada",
      };
    }

    return {
      texto: original.data.text.trim(),

      confianca: confiancaOriginal,

      modo: "original",
    };
  } finally {
    callbackProgresso = null;
  }
}
