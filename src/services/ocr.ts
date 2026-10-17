import { createWorker, PSM } from "tesseract.js";
import { textoContemTabelaNutricional } from "./nutritionDetection";

// ==========================================
// TIPOS
// ==========================================

export type ResultadoOCR = {
  texto: string;
  confianca: number;
  rotacao?: number;

  modo?:
    | "original"
    | "processada"
    | "binaria"
    | "invertida"
    | "semVD"
    | "linhas";
};

export type ProgressoOCR = {
  progresso: number;
  status: string;
};

// ==========================================
// TIPOS INTERNOS
// ==========================================

type ModoOCR = NonNullable<ResultadoOCR["modo"]>;

type CandidatoOCR = {
  texto: string;
  confianca: number;
  modo: ModoOCR;
  pontuacao: number;
};

// ==========================================
// WORKER
// ==========================================

let worker:
  | Awaited<ReturnType<typeof createWorker>>
  | null = null;

let callbackProgresso:
  | ((dados: ProgressoOCR) => void)
  | null = null;

let progressoInicio = 0;
let progressoFim = 1;

// ==========================================
// TRADUZIR STATUS
// ==========================================

function traduzirStatus(
  status: string,
): string {
  const traducoes: Record<string, string> = {
    "loading tesseract core":
      "Carregando mecanismo OCR",

    "initializing tesseract":
      "Inicializando OCR",

    "loading language traineddata":
      "Carregando idiomas",

    "initializing api":
      "Preparando reconhecimento",

    "recognizing text":
      "Lendo texto da imagem",
  };

  return traducoes[status] ?? status;
}

// ==========================================
// PROGRESSO
// ==========================================

function definirFaixaProgresso(
  inicio: number,
  fim: number,
) {
  progressoInicio = inicio;
  progressoFim = fim;
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
        if (
          typeof message.progress !==
          "number"
        ) {
          return;
        }

        const intervalo =
          progressoFim -
          progressoInicio;

        const progressoGlobal =
          progressoInicio +
          message.progress *
            intervalo;

        callbackProgresso?.({
          progresso: Math.min(
            1,
            Math.max(
              0,
              progressoGlobal,
            ),
          ),

          status:
            traduzirStatus(
              message.status,
            ),
        });
      },
    },
  );

  await worker.setParameters({
    tessedit_pageseg_mode:
      PSM.SINGLE_BLOCK,

    preserve_interword_spaces:
      "1",
  });

  return worker;
}

// ==========================================
// CONFIGURAR PSM
// ==========================================

async function configurarPSM(
  modo:
    | typeof PSM.SINGLE_BLOCK
    | typeof PSM.SINGLE_LINE,
) {
  const ocr =
    await carregarWorker();

  await ocr.setParameters({
    tessedit_pageseg_mode:
      modo,

    preserve_interword_spaces:
      "1",
  });
}

// ==========================================
// CARREGAR IMAGEM
// ==========================================

function carregarImagem(
  origem:
    | string
    | HTMLImageElement,
): Promise<HTMLImageElement> {
  if (
    origem instanceof
    HTMLImageElement
  ) {
    return Promise.resolve(
      origem,
    );
  }

  return new Promise(
    (resolve, reject) => {
      const imagem =
        new Image();

      imagem.onload = () => {
        resolve(imagem);
      };

      imagem.onerror = () => {
        reject(
          new Error(
            "Erro ao carregar imagem para OCR.",
          ),
        );
      };

      imagem.src = origem;
    },
  );
}

// ==========================================
// CONTRASTE
// ==========================================

function aplicarContraste(
  valor: number,
  contraste: number,
): number {
  const fator =
    (259 *
      (contraste + 255)) /
    (255 *
      (259 - contraste));

  const resultado =
    fator *
      (valor - 128) +
    128;

  return Math.max(
    0,
    Math.min(
      255,
      resultado,
    ),
  );
}

// ==========================================
// ESCALA
// ==========================================

function calcularEscala(
  largura: number,
  altura: number,
): number {
  const escalaDesejada = 3;

  const maiorDimensao =
    Math.max(
      largura,
      altura,
    );

  const limite = 2400;

  if (
    maiorDimensao *
      escalaDesejada <=
    limite
  ) {
    return escalaDesejada;
  }

  return (
    limite /
    maiorDimensao
  );
}

// ==========================================
// CRIAR CANVAS BASE
// ==========================================

async function criarCanvasBase(
  origem:
    | string
    | HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const imagem =
    await carregarImagem(
      origem,
    );

  const escala =
    calcularEscala(
      imagem.naturalWidth,
      imagem.naturalHeight,
    );

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    Math.round(
      imagem.naturalWidth *
        escala,
    );

  canvas.height =
    Math.round(
      imagem.naturalHeight *
        escala,
    );

  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o canvas.",
    );
  }

  contexto.imageSmoothingEnabled =
    true;

  contexto.imageSmoothingQuality =
    "high";

  contexto.drawImage(
    imagem,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas;
}

// ==========================================
// APLICAR CINZA + CONTRASTE EM CANVAS
// ==========================================

function processarCanvasContraste(
  canvas: HTMLCanvasElement,
  contraste = 75,
): HTMLCanvasElement {
  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível processar o canvas.",
    );
  }

  const imageData =
    contexto.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

  const pixels =
    imageData.data;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    const r =
      pixels[i];

    const g =
      pixels[i + 1];

    const b =
      pixels[i + 2];

    let cinza =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    cinza =
      aplicarContraste(
        cinza,
        contraste,
      );

    pixels[i] =
      cinza;

    pixels[i + 1] =
      cinza;

    pixels[i + 2] =
      cinza;
  }

  contexto.putImageData(
    imageData,
    0,
    0,
  );

  return canvas;
}

// ==========================================
// IMAGEM PROCESSADA
// ==========================================

async function prepararImagemProcessada(
  origem:
    | string
    | HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const canvas =
    await criarCanvasBase(
      origem,
    );

  return processarCanvasContraste(
    canvas,
    75,
  );
}

// ==========================================
// OTSU
// ==========================================

function calcularLimiarOtsu(
  tonsCinza: number[],
): number {
  const histograma =
    new Array<number>(
      256,
    ).fill(0);

  for (
    const valor of
    tonsCinza
  ) {
    const indice =
      Math.max(
        0,
        Math.min(
          255,
          Math.round(valor),
        ),
      );

    histograma[indice]++;
  }

  const total =
    tonsCinza.length;

  let somaTotal = 0;

  for (
    let i = 0;
    i < 256;
    i++
  ) {
    somaTotal +=
      i *
      histograma[i];
  }

  let pesoFundo = 0;
  let somaFundo = 0;

  let maiorVariancia =
    -1;

  let melhorLimiar =
    127;

  for (
    let limiar = 0;
    limiar < 256;
    limiar++
  ) {
    pesoFundo +=
      histograma[
        limiar
      ];

    if (
      pesoFundo === 0
    ) {
      continue;
    }

    const pesoFrente =
      total -
      pesoFundo;

    if (
      pesoFrente === 0
    ) {
      break;
    }

    somaFundo +=
      limiar *
      histograma[
        limiar
      ];

    const mediaFundo =
      somaFundo /
      pesoFundo;

    const mediaFrente =
      (
        somaTotal -
        somaFundo
      ) /
      pesoFrente;

    const variancia =
      pesoFundo *
      pesoFrente *
      Math.pow(
        mediaFundo -
          mediaFrente,
        2,
      );

    if (
      variancia >
      maiorVariancia
    ) {
      maiorVariancia =
        variancia;

      melhorLimiar =
        limiar;
    }
  }

  return melhorLimiar;
}

// ==========================================
// IMAGEM BINÁRIA
// ==========================================

async function prepararImagemBinaria(
  origem:
    | string
    | HTMLImageElement,
  inverter: boolean,
): Promise<HTMLCanvasElement> {
  const canvas =
    await criarCanvasBase(
      origem,
    );

  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível processar a imagem binária.",
    );
  }

  const imageData =
    contexto.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

  const pixels =
    imageData.data;

  const tonsCinza:
    number[] = [];

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    const r =
      pixels[i];

    const g =
      pixels[i + 1];

    const b =
      pixels[i + 2];

    const cinza =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    tonsCinza.push(
      cinza,
    );
  }

  const limiar =
    calcularLimiarOtsu(
      tonsCinza,
    );

  let indiceCinza = 0;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    const cinza =
      tonsCinza[
        indiceCinza++
      ];

    let valor =
      cinza >= limiar
        ? 255
        : 0;

    if (inverter) {
      valor =
        255 - valor;
    }

    pixels[i] =
      valor;

    pixels[i + 1] =
      valor;

    pixels[i + 2] =
      valor;
  }

  contexto.putImageData(
    imageData,
    0,
    0,
  );

  return canvas;
}

// ==========================================
// REMOVER COLUNA %VD
// ==========================================

async function prepararImagemSemVD(
  origem:
    | string
    | HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const original =
    await criarCanvasBase(
      origem,
    );

  /*
    Removemos a região mais à direita.

    Exemplo:

    Proteínas | 1,6 g | 2%

    deve ficar próximo de:

    Proteínas | 1,6 g
  */

  const larguraUtil =
    Math.round(
      original.width *
        0.8,
    );

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    larguraUtil;

  canvas.height =
    original.height;

  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o recorte sem %VD.",
    );
  }

  contexto.drawImage(
    original,

    0,
    0,
    larguraUtil,
    original.height,

    0,
    0,
    larguraUtil,
    original.height,
  );

  return processarCanvasContraste(
    canvas,
    70,
  );
}

// ==========================================
// RECORTAR UMA REGIÃO
// ==========================================

function recortarCanvas(
  origem: HTMLCanvasElement,

  x: number,
  y: number,
  largura: number,
  altura: number,
): HTMLCanvasElement {
  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    Math.max(
      1,
      Math.round(largura),
    );

  canvas.height =
    Math.max(
      1,
      Math.round(altura),
    );

  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível recortar a imagem.",
    );
  }

  contexto.drawImage(
    origem,

    Math.round(x),
    Math.round(y),
    Math.round(largura),
    Math.round(altura),

    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas;
}

// ==========================================
// CRIAR LINHAS DA TABELA
// ==========================================

async function prepararLinhasTabela(
  origem:
    | string
    | HTMLImageElement,
): Promise<HTMLCanvasElement[]> {
  /*
    Usamos a versão processada porque
    tivemos resultados melhores do que
    simplesmente usar a imagem original.
  */

  const base =
    await prepararImagemProcessada(
      origem,
    );

  /*
    A tabela brasileira costuma ocupar
    aproximadamente essa região.

    Não estamos incluindo:
    - grande parte do cabeçalho
    - texto explicativo inferior
    - coluna %VD da extrema direita

    Esta ainda é uma estratégia
    experimental.
  */

  const xInicial =
    base.width *
    0.05;

  const xFinal =
    base.width *
    0.82;

  const yInicial =
    base.height *
    0.16;

  const yFinal =
    base.height *
    0.73;

  const largura =
    xFinal -
    xInicial;

  const alturaRegiao =
    yFinal -
    yInicial;

  /*
    A tabela que estamos testando possui
    aproximadamente 10 linhas relevantes.
  */

  const quantidadeLinhas =
    10;

  const alturaLinha =
    alturaRegiao /
    quantidadeLinhas;

  const linhas:
    HTMLCanvasElement[] =
      [];

  for (
    let i = 0;
    i <
    quantidadeLinhas;
    i++
  ) {
    /*
      Pequeno espaço adicional acima
      e abaixo para não cortar letras,
      vírgulas ou unidades.
    */

    const padding =
      alturaLinha *
      0.20;

    let y =
      yInicial +
      i *
        alturaLinha -
      padding;

    let altura =
      alturaLinha +
      padding *
        2;

    if (y < 0) {
      y = 0;
    }

    if (
      y + altura >
      base.height
    ) {
      altura =
        base.height -
        y;
    }

    const linha =
      recortarCanvas(
        base,
        xInicial,
        y,
        largura,
        altura,
      );

    linhas.push(
      linha,
    );
  }

  return linhas;
}

// ==========================================
// OCR NORMAL
// ==========================================

async function executarOCR(
  imagem:
    | string
    | HTMLImageElement
    | HTMLCanvasElement,
) {
  const ocr =
    await carregarWorker();

  await configurarPSM(
    PSM.SINGLE_BLOCK,
  );

  return await ocr.recognize(
    imagem,
  );
}

// ==========================================
// OCR POR LINHAS
// ==========================================

async function executarOCRPorLinhas(
  imagem:
    | string
    | HTMLImageElement,
): Promise<{
  texto: string;
  confianca: number;
}> {
  const ocr =
    await carregarWorker();

  const linhas =
    await prepararLinhasTabela(
      imagem,
    );

  const textos:
    string[] = [];

  const confiancas:
    number[] = [];

  /*
    Aqui está a principal mudança.

    Cada recorte será interpretado
    como UMA ÚNICA LINHA.
  */

  await configurarPSM(
    PSM.SINGLE_LINE,
  );

  for (
    let i = 0;
    i < linhas.length;
    i++
  ) {
    const inicio =
      0.72 +
      (i /
        linhas.length) *
        0.25;

    const fim =
      0.72 +
      ((i + 1) /
        linhas.length) *
        0.25;

    definirFaixaProgresso(
      inicio,
      fim,
    );

    callbackProgresso?.({
      progresso:
        inicio,

      status:
        `Lendo linha ${i + 1} de ${linhas.length}`,
    });

    const resultado =
      await ocr.recognize(
        linhas[i],
      );

    const texto =
      resultado.data.text
        .replace(
          /\r?\n/g,
          " ",
        )
        .replace(
          /\s+/g,
          " ",
        )
        .trim();

    /*
      Evitamos adicionar resultados
      completamente vazios ou ruído
      muito pequeno.
    */

    if (
      texto.length >= 2 &&
      /[a-zA-ZÀ-ÿ0-9]/.test(
        texto,
      )
    ) {
      textos.push(
        texto,
      );

      confiancas.push(
        resultado.data.confidence,
      );

      console.log(
        `OCR linha ${i + 1}:`,
        texto,
      );
    }
  }

  /*
    Voltamos para SINGLE_BLOCK
    para não afetar futuras leituras.
  */

  await configurarPSM(
    PSM.SINGLE_BLOCK,
  );

  const confiancaMedia =
    confiancas.length > 0
      ? confiancas.reduce(
          (total, valor) =>
            total +
            valor,
          0,
        ) /
        confiancas.length
      : 0;

  return {
    texto:
      textos.join(
        "\n",
      ),

    confianca:
      confiancaMedia,
  };
}

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
// PONTUAÇÃO DO OCR
// ==========================================

function calcularPontuacaoOCR(
  texto: string,
  confianca: number,
): number {
  const normalizado =
    normalizarTexto(
      texto,
    );

  const linhas =
    normalizado
      .split(/\r?\n/)
      .map(
        (linha) =>
          linha.trim(),
      )
      .filter(
        (linha) =>
          linha.length >
          0,
      );

  let pontos = 0;

  // ========================================
  // CABEÇALHO
  // ========================================

  if (
    normalizado.includes(
      "informacao nutricional",
    ) ||
    normalizado.includes(
      "nutrition facts",
    )
  ) {
    pontos += 6;
  }

  // ========================================
  // PORÇÃO
  // ========================================

  if (
    linhas.some(
      (linha) =>
        linha.includes(
          "porcao",
        ) &&
        /\d/.test(
          linha,
        ),
    )
  ) {
    pontos += 4;
  }

  // ========================================
  // NUTRIENTES
  // ========================================

  const gruposNutrientes =
    [
      [
        "valor energetico",
        "calories",
        "energy",
      ],

      [
        "carboidratos",
        "carbohydrate",
      ],

      [
        "acucares",
        "sugars",
      ],

      [
        "proteinas",
        "proteina",
        "protein",
      ],

      [
        "gorduras totais",
        "gordura total",
        "total fat",
      ],

      [
        "gorduras saturadas",
        "gordura saturada",
        "saturated fat",
      ],

      [
        "gorduras trans",
        "gordura trans",
        "trans fat",
      ],

      [
        "fibra alimentar",
        "fibras alimentares",
        "fiber",
        "fibre",
      ],

      [
        "sodio",
        "sodium",
      ],
    ];

  for (
    const grupo of
    gruposNutrientes
  ) {
    const linha =
      linhas.find(
        (linha) =>
          grupo.some(
            (termo) =>
              linha.includes(
                termo,
              ),
          ),
      );

    if (!linha) {
      continue;
    }

    // encontrou o nome
    pontos += 2;

    /*
      Muito importante:

      damos vários pontos quando
      nutriente + quantidade aparecem
      juntos.

      Exemplo:

      Proteínas 1,6 g
      Sódio 28 mg
    */

    const temQuantidade =
      /\d+(?:[.,]\d+)?\s*(?:mg|g|kcal|kj)\b/i.test(
        linha,
      );

    if (
      temQuantidade
    ) {
      pontos += 7;
    }
  }

  // ========================================
  // QUANTIDADE DE VALORES
  // ========================================

  const unidades =
    normalizado.match(
      /\d+(?:[.,]\d+)?\s*(?:mg|g|kcal|kj)\b/gi,
    );

  if (unidades) {
    pontos +=
      Math.min(
        unidades.length,
        12,
      );
  }

  // Confiança como critério secundário
  pontos +=
    confianca /
    20;

  return pontos;
}

// ==========================================
// CRIAR CANDIDATO
// ==========================================

function criarCandidato(
  texto: string,
  confianca: number,
  modo: ModoOCR,
): CandidatoOCR {
  return {
    texto:
      texto.trim(),

    confianca,

    modo,

    pontuacao:
      calcularPontuacaoOCR(
        texto,
        confianca,
      ),
  };
}

// ==========================================
// EXTRAIR TEXTO
// ==========================================

async function girarImagem(imagem: HTMLImageElement, graus: number) {
  const canvas = document.createElement("canvas");
  const lateral = graus === 90 || graus === 270;
  canvas.width = lateral ? imagem.naturalHeight : imagem.naturalWidth;
  canvas.height = lateral ? imagem.naturalWidth : imagem.naturalHeight;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível ajustar a orientação da imagem.");
  contexto.translate(canvas.width / 2, canvas.height / 2);
  contexto.rotate(graus * Math.PI / 180);
  contexto.drawImage(imagem, -imagem.naturalWidth / 2, -imagem.naturalHeight / 2);
  return carregarImagem(canvas.toDataURL("image/png"));
}

export async function extrairTextoImagem(
  imagem:
    | string
    | HTMLImageElement,

  onProgress?: (
    dados: ProgressoOCR,
  ) => void,
): Promise<ResultadoOCR> {
  callbackProgresso =
    onProgress ??
    null;

  try {
    const candidatos:
      CandidatoOCR[] =
      [];

    // ======================================
    // TESTE 1
    // ORIGINAL
    // ======================================

    callbackProgresso?.({
      progresso: 0.02,
      status:
        "Testando imagem original",
    });

    definirFaixaProgresso(
      0.02,
      0.14,
    );

    let original =
      await executarOCR(
        imagem,
      );

    let rotacao = 0;
    // Fotos do celular podem chegar de lado ou de cabeça para baixo.
    // Corrige antes de aplicar contraste e os recortes da tabela.
    if (!textoContemTabelaNutricional(original.data.text)) {
      const base = await carregarImagem(imagem);
      let melhorPontuacao = calcularPontuacaoOCR(original.data.text, original.data.confidence);
      for (const graus of [90, 270, 180]) {
        callbackProgresso?.({ progresso: 0.14, status: "Ajustando orientação da tabela" });
        definirFaixaProgresso(0.14, 0.14);
        const girada = await girarImagem(base, graus);
        const leitura = await executarOCR(girada);
        const pontuacao = calcularPontuacaoOCR(leitura.data.text, leitura.data.confidence);
        if (textoContemTabelaNutricional(leitura.data.text) || pontuacao > melhorPontuacao) {
          melhorPontuacao = pontuacao;
          original = leitura;
          imagem = girada;
          rotacao = graus;
        }
        if (textoContemTabelaNutricional(original.data.text)) break;
      }
    }

    candidatos.push(
      criarCandidato(
        original.data.text,
        original.data.confidence,
        "original",
      ),
    );

    // ======================================
    // TESTE 2
    // CONTRASTE
    // ======================================

    callbackProgresso?.({
      progresso: 0.15,
      status:
        "Aplicando contraste",
    });

    const canvasProcessado =
      await prepararImagemProcessada(
        imagem,
      );

    definirFaixaProgresso(
      0.15,
      0.28,
    );

    const processada =
      await executarOCR(
        canvasProcessado,
      );

    candidatos.push(
      criarCandidato(
        processada.data.text,
        processada.data.confidence,
        "processada",
      ),
    );

    // ======================================
    // TESTE 3
    // BINÁRIO
    // ======================================

    callbackProgresso?.({
      progresso: 0.29,
      status:
        "Testando preto e branco",
    });

    const canvasBinario =
      await prepararImagemBinaria(
        imagem,
        false,
      );

    definirFaixaProgresso(
      0.29,
      0.42,
    );

    const binaria =
      await executarOCR(
        canvasBinario,
      );

    candidatos.push(
      criarCandidato(
        binaria.data.text,
        binaria.data.confidence,
        "binaria",
      ),
    );

    // ======================================
    // TESTE 4
    // BINÁRIO INVERTIDO
    // ======================================

    callbackProgresso?.({
      progresso: 0.43,
      status:
        "Testando contraste invertido",
    });

    const canvasInvertido =
      await prepararImagemBinaria(
        imagem,
        true,
      );

    definirFaixaProgresso(
      0.43,
      0.56,
    );

    const invertida =
      await executarOCR(
        canvasInvertido,
      );

    candidatos.push(
      criarCandidato(
        invertida.data.text,
        invertida.data.confidence,
        "invertida",
      ),
    );

    // ======================================
    // TESTE 5
    // SEM %VD
    // ======================================

    callbackProgresso?.({
      progresso: 0.57,
      status:
        "Lendo tabela sem coluna %VD",
    });

    const canvasSemVD =
      await prepararImagemSemVD(
        imagem,
      );

    definirFaixaProgresso(
      0.57,
      0.70,
    );

    const semVD =
      await executarOCR(
        canvasSemVD,
      );

    candidatos.push(
      criarCandidato(
        semVD.data.text,
        semVD.data.confidence,
        "semVD",
      ),
    );

    // ======================================
    // TESTE 6
    // OCR POR LINHAS
    // ======================================

    callbackProgresso?.({
      progresso: 0.71,
      status:
        "Lendo nutrientes linha por linha",
    });

    const porLinhas =
      await executarOCRPorLinhas(
        imagem,
      );

    candidatos.push(
      criarCandidato(
        porLinhas.texto,
        porLinhas.confianca,
        "linhas",
      ),
    );

    // ======================================
    // COMPARAR RESULTADOS
    // ======================================

    candidatos.sort(
      (a, b) => {
        const diferencaTabela = Number(textoContemTabelaNutricional(b.texto)) -
          Number(textoContemTabelaNutricional(a.texto));
        if (diferencaTabela !== 0) return diferencaTabela;

        if (
          b.pontuacao !==
          a.pontuacao
        ) {
          return (
            b.pontuacao -
            a.pontuacao
          );
        }

        return (
          b.confianca -
          a.confianca
        );
      },
    );

    const melhor =
      candidatos[0];

    // ======================================
    // DEBUG
    // ======================================

    console.table(
      candidatos.map(
        (candidato) => ({
          modo:
            candidato.modo,

          confianca:
            candidato.confianca.toFixed(
              2,
            ),

          pontuacao:
            candidato.pontuacao.toFixed(
              2,
            ),
        }),
      ),
    );

    for (
      const candidato of
      candidatos
    ) {
      console.log(
        `===== OCR ${candidato.modo} =====`,
      );

      console.log(
        candidato.texto,
      );
    }

    console.log(
      "OCR escolhido:",
      melhor.modo,
    );

    callbackProgresso?.({
      progresso: 1,
      status:
        "Leitura concluída",
    });

    return {
      texto:
        melhor.texto,

      confianca:
        melhor.confianca,

      modo:
        melhor.modo,
      rotacao,
    };
  } finally {
    /*
      Garante que o próximo OCR
      volte ao comportamento padrão.
    */

    if (worker) {
      await worker.setParameters({
        tessedit_pageseg_mode:
          PSM.SINGLE_BLOCK,

        preserve_interword_spaces:
          "1",
      });
    }

    callbackProgresso =
      null;

    progressoInicio = 0;
    progressoFim = 1;
  }
}
