import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();

const RAW_DIR = path.join(ROOT, "dataset");
const OUTPUT_DIR = path.join(ROOT, "dataset", "prepared");

const splits = ["train", "valid", "test"];

function criarPasta(caminho) {
    fs.mkdirSync(caminho, {
        recursive: true
    });
}

function existeSobreposicao(a, b) {
    return !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
    );
}

function encontrarRegiaoNegativa(
    imageWidth,
    imageHeight,
    annotations
) {
    // Tamanho aproximado de uma região da imagem
    const cropWidth = Math.max(
        100,
        Math.floor(imageWidth * 0.3)
    );

    const cropHeight = Math.max(
        100,
        Math.floor(imageHeight * 0.3)
    );

    if (
        cropWidth >= imageWidth ||
        cropHeight >= imageHeight
    ) {
        return null;
    }

    for (let tentativa = 0; tentativa < 50; tentativa++) {

        const x = Math.floor(
            Math.random() * (imageWidth - cropWidth)
        );

        const y = Math.floor(
            Math.random() * (imageHeight - cropHeight)
        );

        const candidato = {
            x,
            y,
            width: cropWidth,
            height: cropHeight
        };

        const colidiu = annotations.some(annotation => {

            const [ax, ay, aw, ah] =
                annotation.bbox;

            return existeSobreposicao(
                candidato,
                {
                    x: ax,
                    y: ay,
                    width: aw,
                    height: ah
                }
            );
        });

        if (!colidiu) {
            return candidato;
        }
    }

    return null;
}

async function processarSplit(split) {

    console.log(`\nProcessando: ${split}`);

    const splitPath =
        path.join(RAW_DIR, split);

    const jsonPath =
        path.join(
            splitPath,
            "_annotations.coco.json"
        );

    const coco = JSON.parse(
        fs.readFileSync(jsonPath, "utf8")
    );

    const positiveDir =
        path.join(
            OUTPUT_DIR,
            split,
            "nutrition-label"
        );

    const negativeDir =
        path.join(
            OUTPUT_DIR,
            split,
            "other"
        );

    criarPasta(positiveDir);
    criarPasta(negativeDir);

    const annotationsByImage = {};

    for (const annotation of coco.annotations) {

        if (!annotationsByImage[annotation.image_id]) {
            annotationsByImage[annotation.image_id] = [];
        }

        annotationsByImage[annotation.image_id]
            .push(annotation);
    }

    let positivos = 0;
    let negativos = 0;

    for (const image of coco.images) {

        const imagePath =
            path.join(
                splitPath,
                image.file_name
            );

        const annotations =
            annotationsByImage[image.id] || [];

        if (annotations.length === 0) {
            continue;
        }

        // ==============================
        // POSITIVOS
        // ==============================

        for (
            let index = 0;
            index < annotations.length;
            index++
        ) {

            const annotation =
                annotations[index];

            const [x, y, width, height] =
                annotation.bbox;

            const left =
                Math.max(0, Math.floor(x));

            const top =
                Math.max(0, Math.floor(y));

            const cropWidth =
                Math.min(
                    Math.floor(width),
                    image.width - left
                );

            const cropHeight =
                Math.min(
                    Math.floor(height),
                    image.height - top
                );

            if (
                cropWidth <= 0 ||
                cropHeight <= 0
            ) {
                continue;
            }

            const outputFile =
                path.join(
                    positiveDir,
                    `${image.id}_${index}.jpg`
                );

            await sharp(imagePath)
                .extract({
                    left,
                    top,
                    width: cropWidth,
                    height: cropHeight
                })
                .resize(224, 224, {
                    fit: "cover"
                })
                .jpeg({
                    quality: 90
                })
                .toFile(outputFile);

            positivos++;
        }


        // ==============================
        // NEGATIVOS
        // ==============================

        const regiaoNegativa =
            encontrarRegiaoNegativa(
                image.width,
                image.height,
                annotations
            );

        if (regiaoNegativa) {

            const outputFile =
                path.join(
                    negativeDir,
                    `${image.id}.jpg`
                );

            await sharp(imagePath)
                .extract({
                    left: regiaoNegativa.x,
                    top: regiaoNegativa.y,
                    width: regiaoNegativa.width,
                    height: regiaoNegativa.height
                })
                .resize(224, 224, {
                    fit: "cover"
                })
                .jpeg({
                    quality: 90
                })
                .toFile(outputFile);

            negativos++;
        }
    }

    console.log(
        `Nutrition labels: ${positivos}`
    );

    console.log(
        `Outras regiões: ${negativos}`
    );
}

async function main() {

    console.log(
        "Preparando dataset do NutriScan AI..."
    );

    for (const split of splits) {
        await processarSplit(split);
    }

    console.log(
        "\nDataset preparado com sucesso!"
    );
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});