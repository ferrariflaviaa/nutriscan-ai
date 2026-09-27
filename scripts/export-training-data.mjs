import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const AUGMENTED =
  path.join(
    ROOT,
    "dataset",
    "augmented"
  );

const PREPARED =
  path.join(
    ROOT,
    "dataset",
    "prepared"
  );

const DESTINATION =
  path.join(
    ROOT,
    "public",
    "training-data"
  );

const CLASSES = [
  "nutrition-label",
  "other"
];

function ehImagem(nome) {
  return /\.(jpg|jpeg|png|webp)$/i.test(
    nome
  );
}

function criarPasta(caminho) {
  fs.mkdirSync(
    caminho,
    {
      recursive: true
    }
  );
}

if (
  fs.existsSync(
    DESTINATION
  )
) {
  fs.rmSync(
    DESTINATION,
    {
      recursive: true,
      force: true
    }
  );
}

criarPasta(
  DESTINATION
);

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

function copiarSplit(
  split,
  origemBase
) {
  console.log(
    `\nExportando ${split}...`
  );

  for (
    const classe of CLASSES
  ) {
    const origem =
      path.join(
        origemBase,
        split,
        classe
      );

    const destino =
      path.join(
        DESTINATION,
        split,
        classe
      );

    criarPasta(
      destino
    );

    const arquivos =
      fs
        .readdirSync(
          origem
        )
        .filter(
          ehImagem
        );

    for (
      const arquivo of arquivos
    ) {
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


// ======================================
// TRAIN usa AUGMENTED
// ======================================

copiarSplit(
  "train",
  AUGMENTED
);


// ======================================
// VALID continua ORIGINAL
// ======================================

copiarSplit(
  "valid",
  PREPARED
);


// ======================================
// TEST continua ORIGINAL
// ======================================

copiarSplit(
  "test",
  PREPARED
);


// ======================================
// MANIFEST
// ======================================

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
  "\n✅ Dataset exportado!"
);

console.log(
  "\nResumo:"
);

console.log(
  JSON.stringify(
    {
      train: {
        nutritionLabel:
          manifest.train[
            "nutrition-label"
          ].length,

        other:
          manifest.train.other.length
      },

      valid: {
        nutritionLabel:
          manifest.valid[
            "nutrition-label"
          ].length,

        other:
          manifest.valid.other.length
      },

      test: {
        nutritionLabel:
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