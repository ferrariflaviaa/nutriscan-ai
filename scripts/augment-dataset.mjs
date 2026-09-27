import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();

const SOURCE = path.join(
  ROOT,
  "dataset",
  "prepared",
  "train"
);

const OUTPUT = path.join(
  ROOT,
  "dataset",
  "augmented",
  "train"
);

const CLASSES = [
  "nutrition-label",
  "other"
];

function criarPasta(caminho) {
  fs.mkdirSync(
    caminho,
    {
      recursive: true
    }
  );
}

function limparPasta(caminho) {
  if (fs.existsSync(caminho)) {
    fs.rmSync(
      caminho,
      {
        recursive: true,
        force: true
      }
    );
  }

  criarPasta(caminho);
}

function ehImagem(nome) {
  return /\.(jpg|jpeg|png|webp)$/i.test(
    nome
  );
}

async function gerarVariacoes(
  arquivoEntrada,
  pastaSaida,
  nomeBase
) {
  // ============================
  // 1. ORIGINAL
  // ============================

  await sharp(arquivoEntrada)
    .resize(
      224,
      224,
      {
        fit: "cover"
      }
    )
    .jpeg({
      quality: 90
    })
    .toFile(
      path.join(
        pastaSaida,
        `${nomeBase}_original.jpg`
      )
    );


  // ============================
  // 2. ROTAÇÃO 180°
  // ============================

  await sharp(arquivoEntrada)
    .rotate(180)
    .resize(
      224,
      224,
      {
        fit: "cover"
      }
    )
    .jpeg({
      quality: 90
    })
    .toFile(
      path.join(
        pastaSaida,
        `${nomeBase}_rot180.jpg`
      )
    );


  // ============================
  // 3. IMAGEM MAIS CLARA
  // ============================

  await sharp(arquivoEntrada)
    .modulate({
      brightness: 1.2
    })
    .resize(
      224,
      224,
      {
        fit: "cover"
      }
    )
    .jpeg({
      quality: 90
    })
    .toFile(
      path.join(
        pastaSaida,
        `${nomeBase}_bright.jpg`
      )
    );


  // ============================
  // 4. IMAGEM MAIS ESCURA
  // ============================

  await sharp(arquivoEntrada)
    .modulate({
      brightness: 0.8
    })
    .resize(
      224,
      224,
      {
        fit: "cover"
      }
    )
    .jpeg({
      quality: 90
    })
    .toFile(
      path.join(
        pastaSaida,
        `${nomeBase}_dark.jpg`
      )
    );


  // ============================
  // 5. LEVE DESFOQUE
  // ============================

  await sharp(arquivoEntrada)
    .blur(0.8)
    .resize(
      224,
      224,
      {
        fit: "cover"
      }
    )
    .jpeg({
      quality: 90
    })
    .toFile(
      path.join(
        pastaSaida,
        `${nomeBase}_blur.jpg`
      )
    );
}

async function processarClasse(
  classe
) {
  const pastaOrigem =
    path.join(
      SOURCE,
      classe
    );

  const pastaDestino =
    path.join(
      OUTPUT,
      classe
    );

  criarPasta(
    pastaDestino
  );

  const arquivos =
    fs
      .readdirSync(
        pastaOrigem
      )
      .filter(
        ehImagem
      );

  console.log(
    `\nClasse: ${classe}`
  );

  console.log(
    `Imagens originais: ${arquivos.length}`
  );

  let processadas = 0;

  for (const arquivo of arquivos) {
    const arquivoEntrada =
      path.join(
        pastaOrigem,
        arquivo
      );

    const nomeBase =
      path.parse(
        arquivo
      ).name;

    await gerarVariacoes(
      arquivoEntrada,
      pastaDestino,
      nomeBase
    );

    processadas++;

    if (
      processadas % 20 === 0
    ) {
      console.log(
        `Processadas ${processadas}/${arquivos.length}`
      );
    }
  }

  console.log(
    `Total gerado: ${
      arquivos.length * 5
    }`
  );
}

async function main() {
  console.log(
    "=============================="
  );

  console.log(
    "NutriScan AI - Data Augmentation"
  );

  console.log(
    "=============================="
  );


  limparPasta(
    path.join(
      ROOT,
      "dataset",
      "augmented"
    )
  );


  for (
    const classe of CLASSES
  ) {
    await processarClasse(
      classe
    );
  }


  console.log(
    "\n✅ Data augmentation concluído!"
  );

  console.log(
    `Dataset criado em: ${OUTPUT}`
  );
}

main().catch(
  (error) => {
    console.error(
      "Erro:",
      error
    );

    process.exit(1);
  }
);