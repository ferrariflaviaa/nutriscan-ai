import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SOURCE = path.join(
  ROOT,
  "dataset",
  "prepared"
);

const DESTINATION = path.join(
  ROOT,
  "public",
  "training-data"
);

const SPLITS = [
  "train",
  "valid",
  "test"
];

const CLASSES = [
  "nutrition-label",
  "other"
];

function ehImagem(nome) {
  return /\.(jpg|jpeg|png|webp)$/i.test(nome);
}

function criarPasta(caminho) {
  fs.mkdirSync(
    caminho,
    {
      recursive: true
    }
  );
}

if (fs.existsSync(DESTINATION)) {

  fs.rmSync(
    DESTINATION,
    {
      recursive: true,
      force: true
    }
  );

}

criarPasta(DESTINATION);

const manifest = {
  train: {
    "nutrition-label": [],
    other: []
  },

  valid: {
    "nutrition-label": [],
    other: []
  },

  test: {
    "nutrition-label": [],
    other: []
  }
};

for (const split of SPLITS) {

  console.log(`\nExportando ${split}...`);

  for (const classe of CLASSES) {

    const origem = path.join(
      SOURCE,
      split,
      classe
    );

    const destino = path.join(
      DESTINATION,
      split,
      classe
    );

    criarPasta(destino);

    // sort() garante ordem estável.
    const arquivos = fs
      .readdirSync(origem)
      .filter(ehImagem)
      .sort();

    for (const arquivo of arquivos) {

      fs.copyFileSync(
        path.join(
          origem,
          arquivo
        ),

        path.join(
          destino,
          arquivo
        )
      );

      manifest[split][classe].push(
        `/training-data/${split}/${classe}/${encodeURIComponent(
          arquivo
        )}`
      );

    }

    console.log(
      `${classe}: ${arquivos.length}`
    );

  }

}

fs.writeFileSync(
  path.join(
    DESTINATION,
    "manifest.json"
  ),

  JSON.stringify(
    manifest,
    null,
    2
  )
);

console.log(
  "\n✅ Dataset original exportado."
);

console.log(
  JSON.stringify(
    {
      train: {
        tabela:
          manifest.train[
            "nutrition-label"
          ].length,

        other:
          manifest.train.other.length
      },

      valid: {
        tabela:
          manifest.valid[
            "nutrition-label"
          ].length,

        other:
          manifest.valid.other.length
      },

      test: {
        tabela:
          manifest.test[
            "nutrition-label"
          ].length,

        other:
          manifest.test.other.length
      }
    },
    null,
    2
  )
);