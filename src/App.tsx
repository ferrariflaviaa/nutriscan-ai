import {
  useEffect,
  useState,
  type ChangeEvent
} from "react";

import "./App.css";

import {
  treinarClassificador
} from "./services/training";

import {
  analisarComNutriScan,
  type ResultadoNutriScan
} from "./services/nutriscan";

import {
  avaliarModelo,
  type ResultadoAvaliacao
} from "./services/evaluation";

import {
  extrairTextoImagem,
  type ResultadoOCR
} from "./services/ocr";

import {
  interpretarTabelaNutricional,
  type DadosNutricionais
} from "./services/nutritionParser";

import {
  LIMIAR_TABELA
} from "./config/modelConfig";


function App() {

  // =====================================
  // IMAGEM
  // =====================================

  const [
    imagem,
    setImagem
  ] =
    useState<string | null>(
      null
    );


  const [
    arquivo,
    setArquivo
  ] =
    useState<File | null>(
      null
    );


  // =====================================
  // CLASSIFICAÇÃO
  // =====================================

  const [
    resultadoNutriScan,
    setResultadoNutriScan
  ] =
    useState<ResultadoNutriScan | null>(
      null
    );


  const [
    carregando,
    setCarregando
  ] =
    useState(false);


  // =====================================
  // TREINAMENTO
  // =====================================

  const [
    treinando,
    setTreinando
  ] =
    useState(false);


  const [
    statusTreino,
    setStatusTreino
  ] =
    useState("");


  // =====================================
  // AVALIAÇÃO
  // =====================================

  const [
    avaliando,
    setAvaliando
  ] =
    useState(false);


  const [
    progressoAvaliacao,
    setProgressoAvaliacao
  ] =
    useState("");


  const [
    resultadoAvaliacao,
    setResultadoAvaliacao
  ] =
    useState<ResultadoAvaliacao | null>(
      null
    );


  // =====================================
  // OCR
  // =====================================

  const [
    lendoTexto,
    setLendoTexto
  ] =
    useState(false);


  const [
    progressoOCR,
    setProgressoOCR
  ] =
    useState("");


  const [
    percentualOCR,
    setPercentualOCR
  ] =
    useState(0);


  const [
    resultadoOCR,
    setResultadoOCR
  ] =
    useState<ResultadoOCR | null>(
      null
    );


  // =====================================
  // NUTRIENTES
  // =====================================

  const [
    dadosNutricionais,
    setDadosNutricionais
  ] =
    useState<DadosNutricionais | null>(
      null
    );


  // =====================================
  // ERRO
  // =====================================

  const [
    erro,
    setErro
  ] =
    useState("");


  // =====================================
  // LIMPAR URL
  // =====================================

  useEffect(() => {

    return () => {

      if (
        imagem
      ) {

        URL.revokeObjectURL(
          imagem
        );

      }

    };

  }, [imagem]);


  // =====================================
  // SELECIONAR IMAGEM
  // =====================================

  function selecionarImagem(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];


    if (
      !file
    ) {
      return;
    }


    if (
      imagem
    ) {

      URL.revokeObjectURL(
        imagem
      );

    }


    const novaImagem =
      URL.createObjectURL(
        file
      );


    setArquivo(
      file
    );


    setImagem(
      novaImagem
    );


    setResultadoNutriScan(
      null
    );


    setResultadoOCR(
      null
    );


    setDadosNutricionais(
      null
    );


    setErro(
      ""
    );

  }


  // =====================================
  // TREINAR V1
  // =====================================

  async function treinar() {

    setTreinando(
      true
    );


    setErro(
      ""
    );


    setResultadoAvaliacao(
      null
    );


    setStatusTreino(
      "Preparando NutriScan V1..."
    );


    try {

      await treinarClassificador(
        setStatusTreino
      );


      setStatusTreino(
        "NutriScan V1 treinado. Agora faça a avaliação."
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Erro ao treinar o NutriScan V1."
      );

    } finally {

      setTreinando(
        false
      );

    }

  }


  // =====================================
  // AVALIAR V1
  // =====================================

  async function avaliarV1() {

    setAvaliando(
      true
    );


    setErro(
      ""
    );


    setResultadoAvaliacao(
      null
    );


    setProgressoAvaliacao(
      "Preparando avaliação..."
    );


    try {

      const resultado =
        await avaliarModelo(

          LIMIAR_TABELA,

          (
            atual,
            total
          ) => {

            setProgressoAvaliacao(
              `Avaliando ${atual}/${total}`
            );

          }

        );


      setResultadoAvaliacao(
        resultado
      );


      setProgressoAvaliacao(
        "Avaliação da V1 concluída!"
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Erro ao avaliar o NutriScan V1."
      );

    } finally {

      setAvaliando(
        false
      );

    }

  }


  // =====================================
  // ANALISAR IMAGEM
  // =====================================

  async function analisar() {

    if (
      !arquivo ||
      !imagem
    ) {
      return;
    }


    setCarregando(
      true
    );


    setErro(
      ""
    );


    setResultadoNutriScan(
      null
    );


    setResultadoOCR(
      null
    );


    setDadosNutricionais(
      null
    );


    try {

      const img =
        new Image();


      img.src =
        imagem;


      await new Promise<void>(
        (
          resolve,
          reject
        ) => {

          img.onload =
            () =>
              resolve();


          img.onerror =
            () =>
              reject(
                new Error(
                  "Erro ao carregar imagem."
                )
              );

        }
      );


      const resultado =
        await analisarComNutriScan(
          img
        );


      setResultadoNutriScan(
        resultado
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível analisar a imagem."
      );

    } finally {

      setCarregando(
        false
      );

    }

  }


  // =====================================
  // OCR
  // =====================================

  async function lerTabelaNutricional() {

    if (
      !imagem
    ) {
      return;
    }


    setLendoTexto(
      true
    );


    setErro(
      ""
    );


    setResultadoOCR(
      null
    );


    setDadosNutricionais(
      null
    );


    setProgressoOCR(
      "Preparando OCR..."
    );


    setPercentualOCR(
      0
    );


    try {

      const resultado =
        await extrairTextoImagem(

          imagem,

          dados => {

            setProgressoOCR(
              dados.status
            );


            setPercentualOCR(
              Math.round(
                dados.progresso *
                100
              )
            );

          }

        );


      setResultadoOCR(
        resultado
      );


      const nutrientes =
        interpretarTabelaNutricional(
          resultado.texto
        );


      setDadosNutricionais(
        nutrientes
      );


      setProgressoOCR(
        "Leitura concluída!"
      );


      setPercentualOCR(
        100
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível ler a tabela."
      );

    } finally {

      setLendoTexto(
        false
      );

    }

  }


  // =====================================
  // FORMATAR
  // =====================================

  function mostrarValor(
    valor:
      number |
      null,

    unidade:
      string
  ) {

    if (
      valor === null
    ) {

      return "Não identificado";

    }


    return `${valor} ${unidade}`;

  }


  // =====================================
  // JSX
  // =====================================

  return (

    <main className="app-container">


      <header>

        <h1>
          NutriScan AI
        </h1>

        <p>
          TensorFlow.js + Transfer Learning + OCR
        </p>

      </header>


      {/* ================================= */}
      {/* ÁREA DO DESENVOLVEDOR */}
      {/* ================================= */}

      <section>

        <h2>
          NutriScan V1
        </h2>


        <p>
          Treinamento reproduzível do
          classificador.
        </p>


        <button
          onClick={
            treinar
          }
          disabled={
            treinando
          }
        >

          {
            treinando
              ? "Treinando V1..."
              : "Treinar NutriScan V1"
          }

        </button>


        {
          statusTreino && (

            <p>
              {
                statusTreino
              }
            </p>

          )
        }


        <button
          onClick={
            avaliarV1
          }
          disabled={
            avaliando ||
            treinando
          }
          style={{
            marginLeft:
              "10px"
          }}
        >

          {
            avaliando
              ? "Avaliando..."
              : "Avaliar NutriScan V1"
          }

        </button>


        {
          progressoAvaliacao && (

            <p>
              {
                progressoAvaliacao
              }
            </p>

          )
        }


        {
          resultadoAvaliacao && (

            <div
              style={{
                margin:
                  "25px auto",

                maxWidth:
                  "600px"
              }}
            >

              <h3>
                Resultado da V1
              </h3>


              <p>
                Acurácia:{" "}
                <strong>
                  {
                    (
                      resultadoAvaliacao
                        .acuracia *
                      100
                    ).toFixed(2)
                  }
                  %
                </strong>
              </p>


              <p>
                Precisão:{" "}
                <strong>
                  {
                    (
                      resultadoAvaliacao
                        .precisao *
                      100
                    ).toFixed(2)
                  }
                  %
                </strong>
              </p>


              <p>
                Recall:{" "}
                <strong>
                  {
                    (
                      resultadoAvaliacao
                        .recall *
                      100
                    ).toFixed(2)
                  }
                  %
                </strong>
              </p>


              <p>
                F1-score:{" "}
                <strong>
                  {
                    (
                      resultadoAvaliacao
                        .f1Score *
                      100
                    ).toFixed(2)
                  }
                  %
                </strong>
              </p>


              <p>
                Falso positivo:{" "}
                {
                  resultadoAvaliacao
                    .falsoPositivo
                }
              </p>


              <p>
                Falso negativo:{" "}
                {
                  resultadoAvaliacao
                    .falsoNegativo
                }
              </p>

            </div>

          )
        }

      </section>


      <hr />


      {/* ================================= */}
      {/* SCANNER */}
      {/* ================================= */}

      <section>

        <h2>
          Escâner de rótulo
        </h2>


        <input
          type="file"
          accept="image/*"
          onChange={
            selecionarImagem
          }
        />


        {
          imagem && (

            <>

              <div>

                <img
                  src={
                    imagem
                  }
                  alt="Rótulo"
                  style={{
                    width:
                      "100%",

                    maxWidth:
                      "450px",

                    marginTop:
                      "20px",

                    borderRadius:
                      "10px"
                  }}
                />

              </div>


              <button
                onClick={
                  analisar
                }
                disabled={
                  carregando
                }
                style={{
                  marginTop:
                    "20px"
                }}
              >

                {
                  carregando
                    ? "Analisando..."
                    : "Analisar imagem"
                }

              </button>

            </>

          )
        }

      </section>


      {
        resultadoNutriScan && (

          <section
            style={{
              marginTop:
                "30px"
            }}
          >

            <h2>
              Resultado
            </h2>


            <h3>
              {
                resultadoNutriScan
                  .classe
              }
            </h3>


            <p>

              Score:{" "}

              <strong>

                {
                  (
                    resultadoNutriScan
                      .probabilidadeTabela *
                    100
                  ).toFixed(2)
                }

                %

              </strong>

            </p>


            <p>
              Threshold utilizado:{" "}
              {
                resultadoNutriScan
                  .limiarUtilizado
                  .toFixed(2)
              }
            </p>


            {
              resultadoNutriScan
                .classe ===
                "Tabela nutricional" && (

                <button
                  onClick={
                    lerTabelaNutricional
                  }
                  disabled={
                    lendoTexto
                  }
                >

                  {
                    lendoTexto
                      ? "Lendo..."
                      : "Ler tabela nutricional"
                  }

                </button>

              )
            }

          </section>

        )
      }


      {
        progressoOCR && (

          <section>

            <h3>
              OCR
            </h3>

            <p>

              {
                progressoOCR
              }

              {" "}

              {
                percentualOCR
              }

              %

            </p>

          </section>

        )
      }


      {/* ================================= */}
      {/* NUTRIENTES */}
      {/* ================================= */}

      {
        dadosNutricionais && (

          <section
            style={{
              maxWidth:
                "600px",

              margin:
                "40px auto",

              textAlign:
                "left"
            }}
          >

            <h2
              style={{
                textAlign:
                  "center"
              }}
            >
              Informações nutricionais
            </h2>


            <p>
              🔥 Energia:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .energiaKcal,

                    "kcal"
                  )
                }
              </strong>
            </p>


            <p>
              ⚡ Energia:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .energiaKj,

                    "kJ"
                  )
                }
              </strong>
            </p>


            <p>
              🥑 Gorduras:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .gordura,

                    "g"
                  )
                }
              </strong>
            </p>


            <p>
              Gorduras saturadas:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .gorduraSaturada,

                    "g"
                  )
                }
              </strong>
            </p>


            <p>
              🍞 Carboidratos:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .carboidratos,

                    "g"
                  )
                }
              </strong>
            </p>


            <p>
              🍬 Açúcares:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .acucares,

                    "g"
                  )
                }
              </strong>
            </p>


            <p>
              🌾 Fibra:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .fibra,

                    "g"
                  )
                }
              </strong>
            </p>


            <p>
              💪 Proteína:{" "}
              <strong>
                {
                  mostrarValor(
                    dadosNutricionais
                      .proteina,

                    "g"
                  )
                }
              </strong>
            </p>

          </section>

        )
      }


      {
        resultadoOCR && (

          <section>

            <h2>
              Texto bruto OCR
            </h2>


            <p>
              Confiança média:{" "}
              {
                resultadoOCR
                  .confianca
                  .toFixed(2)
              }
              %
            </p>


            <pre
              style={{
                maxWidth:
                  "700px",

                margin:
                  "20px auto",

                padding:
                  "20px",

                border:
                  "1px solid #444",

                borderRadius:
                  "10px",

                whiteSpace:
                  "pre-wrap",

                textAlign:
                  "left"
              }}
            >

              {
                resultadoOCR
                  .texto
              }

            </pre>

          </section>

        )
      }


      {
        erro && (

          <p
            style={{
              color:
                "#ff6b6b"
            }}
          >

            {
              erro
            }

          </p>

        )
      }


    </main>

  );

}


export default App;