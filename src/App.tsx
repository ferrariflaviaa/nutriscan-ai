import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

import "./App.css";

import {
  treinarClassificador,
} from "./services/training";

import {
  analisarComNutriScan,
  type ResultadoNutriScan,
} from "./services/nutriscan";

import {
  avaliarModelo,
  type ResultadoAvaliacao,
} from "./services/evaluation";

import {
  extrairTextoImagem,
  type ResultadoOCR,
} from "./services/ocr";

import {
  interpretarTabelaNutricional,
  type DadosNutricionais,
} from "./services/nutritionParser";

import {
  analisarNutricionalmente,
  type ResultadoAnaliseNutricional,
} from "./services/nutritionAnalysis";

import {
  LIMIAR_TABELA,
} from "./config/modelConfig";


function App() {

  // =====================================
  // IMAGEM
  // =====================================

  const [
    imagem,
    setImagem,
  ] =
    useState<string | null>(
      null,
    );


  const [
    arquivo,
    setArquivo,
  ] =
    useState<File | null>(
      null,
    );


  // =====================================
  // CLASSIFICAÇÃO
  // =====================================

  const [
    resultadoNutriScan,
    setResultadoNutriScan,
  ] =
    useState<ResultadoNutriScan | null>(
      null,
    );


  const [
    carregando,
    setCarregando,
  ] =
    useState(false);


  // =====================================
  // TREINAMENTO
  // =====================================

  const [
    treinando,
    setTreinando,
  ] =
    useState(false);


  const [
    statusTreino,
    setStatusTreino,
  ] =
    useState("");


  // =====================================
  // AVALIAÇÃO
  // =====================================

  const [
    avaliando,
    setAvaliando,
  ] =
    useState(false);


  const [
    progressoAvaliacao,
    setProgressoAvaliacao,
  ] =
    useState("");


  const [
    resultadoAvaliacao,
    setResultadoAvaliacao,
  ] =
    useState<ResultadoAvaliacao | null>(
      null,
    );


  // =====================================
  // OCR
  // =====================================

  const [
    lendoTexto,
    setLendoTexto,
  ] =
    useState(false);


  const [
    progressoOCR,
    setProgressoOCR,
  ] =
    useState("");


  const [
    percentualOCR,
    setPercentualOCR,
  ] =
    useState(0);


  const [
    resultadoOCR,
    setResultadoOCR,
  ] =
    useState<ResultadoOCR | null>(
      null,
    );


  // =====================================
  // NUTRIENTES
  // =====================================

  const [
    dadosNutricionais,
    setDadosNutricionais,
  ] =
    useState<DadosNutricionais | null>(
      null,
    );


  // =====================================
  // ANÁLISE NUTRICIONAL
  // =====================================

  const [
    analiseNutricional,
    setAnaliseNutricional,
  ] =
    useState<ResultadoAnaliseNutricional | null>(
      null,
    );


  // =====================================
  // ERRO
  // =====================================

  const [
    erro,
    setErro,
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
          imagem,
        );

      }

    };

  }, [imagem]);


  // =====================================
  // SELECIONAR IMAGEM
  // =====================================

  function selecionarImagem(
    event:
      ChangeEvent<HTMLInputElement>,
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
        imagem,
      );

    }


    const novaImagem =
      URL.createObjectURL(
        file,
      );


    setArquivo(
      file,
    );


    setImagem(
      novaImagem,
    );


    setResultadoNutriScan(
      null,
    );


    setResultadoOCR(
      null,
    );


    setDadosNutricionais(
      null,
    );


    setAnaliseNutricional(
      null,
    );


    setProgressoOCR(
      "",
    );


    setPercentualOCR(
      0,
    );


    setErro(
      "",
    );

  }


  // =====================================
  // TREINAR V1
  // =====================================

  async function treinar() {

    setTreinando(
      true,
    );


    setErro(
      "",
    );


    setResultadoAvaliacao(
      null,
    );


    setStatusTreino(
      "Preparando NutriScan V1...",
    );


    try {

      await treinarClassificador(
        setStatusTreino,
      );


      setStatusTreino(
        "NutriScan V1 treinado. Agora faça a avaliação.",
      );

    } catch (
      error
    ) {

      console.error(
        error,
      );


      setErro(
        "Erro ao treinar o NutriScan V1.",
      );

    } finally {

      setTreinando(
        false,
      );

    }

  }


  // =====================================
  // AVALIAR V1
  // =====================================

  async function avaliarV1() {

    setAvaliando(
      true,
    );


    setErro(
      "",
    );


    setResultadoAvaliacao(
      null,
    );


    setProgressoAvaliacao(
      "Preparando avaliação...",
    );


    try {

      const resultado =
        await avaliarModelo(

          LIMIAR_TABELA,

          (
            atual,
            total,
          ) => {

            setProgressoAvaliacao(
              `Avaliando ${atual}/${total}`,
            );

          },

        );


      setResultadoAvaliacao(
        resultado,
      );


      setProgressoAvaliacao(
        "Avaliação da V1 concluída!",
      );

    } catch (
      error
    ) {

      console.error(
        error,
      );


      setErro(
        "Erro ao avaliar o NutriScan V1.",
      );

    } finally {

      setAvaliando(
        false,
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
      true,
    );


    setErro(
      "",
    );


    setResultadoNutriScan(
      null,
    );


    setResultadoOCR(
      null,
    );


    setDadosNutricionais(
      null,
    );


    setAnaliseNutricional(
      null,
    );


    try {

      const img =
        new Image();


      img.src =
        imagem;


      await new Promise<void>((
        resolve,
        reject,
      ) => {

        img.onload =
          () =>
            resolve();


        img.onerror =
          () =>
            reject(
              new Error(
                "Erro ao carregar imagem.",
              ),
            );

      });


      const resultado =
        await analisarComNutriScan(
          img,
        );


      setResultadoNutriScan(
        resultado,
      );

    } catch (
      error
    ) {

      console.error(
        error,
      );


      setErro(
        "Não foi possível analisar a imagem.",
      );

    } finally {

      setCarregando(
        false,
      );

    }

  }


  // =====================================
  // OCR + ANÁLISE AUTOMÁTICA
  // =====================================

  async function lerTabelaNutricional() {

    if (
      !imagem
    ) {

      return;

    }


    setLendoTexto(
      true,
    );


    setErro(
      "",
    );


    setResultadoOCR(
      null,
    );


    setDadosNutricionais(
      null,
    );


    setAnaliseNutricional(
      null,
    );


    setProgressoOCR(
      "Preparando OCR...",
    );


    setPercentualOCR(
      0,
    );


    try {

      const resultado =
        await extrairTextoImagem(

          imagem,

          dados => {

            setProgressoOCR(
              dados.status,
            );


            setPercentualOCR(
              Math.round(
                dados.progresso *
                100,
              ),
            );

          },

        );


      setResultadoOCR(
        resultado,
      );


      // ==================================
      // PARSER
      // ==================================

      const nutrientes =
        interpretarTabelaNutricional(
          resultado.texto,
        );


      setDadosNutricionais(
        nutrientes,
      );


      // ==================================
      // ANÁLISE AUTOMÁTICA
      // ==================================

      const analise =
        analisarNutricionalmente(

          nutrientes,

          resultado.texto,

        );


      setAnaliseNutricional(
        analise,
      );


      setProgressoOCR(
        "Análise concluída!",
      );


      setPercentualOCR(
        100,
      );

    } catch (
      error
    ) {

      console.error(
        error,
      );


      setErro(
        "Não foi possível ler e analisar a tabela.",
      );

    } finally {

      setLendoTexto(
        false,
      );

    }

  }


  // =====================================
  // FORMATAR
  // =====================================

  function mostrarValor(
    valor:
      number | null,

    unidade:
      string,
  ) {

    if (
      valor === null
    ) {

      return "Não identificado";

    }


    return `${valor} ${unidade}`;

  }


  function formatarNumero(
    valor:
      number,
  ) {

    return valor
      .toFixed(2)
      .replace(
        /\.?0+$/,
        "",
      )
      .replace(
        ".",
        ",",
      );

  }


  // =====================================
  // JSX
  // =====================================

  return (

    <main className="app-container">


      {/* ================================= */}
      {/* CABEÇALHO */}
      {/* ================================= */}

      <header>

        <h1>
          NutriScan AI
        </h1>


        <p>
          Análise inteligente de tabelas nutricionais
        </p>

      </header>


      {/* ================================= */}
      {/* DESENVOLVEDOR */}
      {/* ================================= */}

      <details
        style={{
          maxWidth:
            "700px",

          margin:
            "20px auto",

          padding:
            "15px",

          border:
            "1px solid #333",

          borderRadius:
            "12px",
        }}
      >

        <summary
          style={{
            cursor:
              "pointer",

            fontWeight:
              "bold",
          }}
        >
          Ferramentas de desenvolvimento
        </summary>


        <section>

          <h2>
            NutriScan V1
          </h2>


          <p>
            TensorFlow.js + Transfer Learning
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
                ? "Treinando..."
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
                "10px",
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

      </details>


      <hr />


      {/* ================================= */}
      {/* SCANNER */}
      {/* ================================= */}

      <section>

        <h2>
          Escâner de rótulo
        </h2>


        <p>
          Envie uma foto da tabela nutricional.
        </p>


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
                  alt="Tabela nutricional"
                  style={{
                    width:
                      "100%",

                    maxWidth:
                      "450px",

                    marginTop:
                      "20px",

                    borderRadius:
                      "12px",
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
                    "20px",
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


      {/* ================================= */}
      {/* CLASSIFICAÇÃO */}
      {/* ================================= */}

      {
        resultadoNutriScan && (

          <section
            style={{
              marginTop:
                "30px",
            }}
          >

            <h2>
              Detecção
            </h2>


            <h3>
              {
                resultadoNutriScan
                  .classe
              }
            </h3>


            <p>

              Confiança do classificador:{" "}

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
                      ? "Analisando tabela..."
                      : "Analisar tabela nutricional"
                  }

                </button>

              )
            }

          </section>

        )
      }


      {/* ================================= */}
      {/* PROGRESSO */}
      {/* ================================= */}

      {
        progressoOCR && (

          <section>

            <h3>
              Processamento
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
      {/* RESULTADO PRINCIPAL */}
      {/* ================================= */}

      {
        analiseNutricional && (

          <section
            style={{
              maxWidth:
                "720px",

              margin:
                "40px auto",

              padding:
                "28px",

              border:
                "1px solid #444",

              borderRadius:
                "18px",

              textAlign:
                "left",
            }}
          >


            {/* STATUS */}

            <div
              style={{
                textAlign:
                  "center",

                marginBottom:
                  "30px",
              }}
            >

              <div
                style={{
                  fontSize:
                    "42px",
                }}
              >

                {
                  analiseNutricional
                    .status ===
                    "favoravel"
                    ? "🟢"
                    : analiseNutricional
                        .status ===
                        "atencao"
                      ? "⚠️"
                      : analiseNutricional
                          .status ===
                          "parcial"
                        ? "🟡"
                        : "📷"
                }

              </div>


              <h2>
                {
                  analiseNutricional
                    .titulo
                }
              </h2>


              <p>
                {
                  analiseNutricional
                    .descricao
                }
              </p>

            </div>


            {/* PROTEÍNA */}

            <div
              style={{
                padding:
                  "18px",

                border:
                  "1px solid #444",

                borderRadius:
                  "12px",

                marginBottom:
                  "18px",
              }}
            >

              <h3>
                💪 Proteína
              </h3>


              {
                analiseNutricional
                  .proteina
                  .valor !==
                  null
                  ? (

                    <>

                      <p
                        style={{
                          fontSize:
                            "22px",
                        }}
                      >

                        <strong>

                          {
                            formatarNumero(
                              analiseNutricional
                                .proteina
                                .valor,
                            )
                          }

                          {" "}g

                        </strong>

                        {" "}

                        {
                          analiseNutricional
                            .proteina
                            .referencia
                        }

                      </p>


                      <p>

                        {
                          analiseNutricional
                            .proteina
                            .nivel ===
                            "boa"
                            ? "✅ "
                            : ""
                        }

                        {
                          analiseNutricional
                            .proteina
                            .mensagem
                        }

                      </p>

                    </>

                  )
                  : (

                    <p>
                      Proteína não identificada.
                    </p>

                  )
              }

            </div>


            {/* ALERTAS */}

            {
              analiseNutricional
                .alertas.length >
                0 && (

                <div>

                  <h3>
                    ⚠️ Pontos de atenção
                  </h3>


                  {
                    analiseNutricional
                      .alertas.map(
                        alerta => (

                          <div
                            key={
                              alerta
                                .nutriente
                            }
                            style={{
                              padding:
                                "16px",

                              border:
                                "1px solid #a44",

                              borderRadius:
                                "12px",

                              marginBottom:
                                "12px",
                            }}
                          >

                            <strong>
                              🔴 {
                                alerta
                                  .titulo
                              }
                            </strong>


                            <p>

                              {
                                formatarNumero(
                                  alerta
                                    .valor,
                                )
                              }

                              {" "}

                              {
                                alerta
                                  .unidade
                              }

                            </p>


                            <small>

                              Limite de alto teor:{" "}

                              {
                                formatarNumero(
                                  alerta
                                    .limite,
                                )
                              }

                              {" "}

                              {
                                alerta
                                  .unidade
                              }

                            </small>

                          </div>

                        ),
                      )
                  }

                </div>

              )
            }


            {/* PONTOS POSITIVOS */}

            {
              analiseNutricional
                .pontosPositivos
                .length >
                0 && (

                <div
                  style={{
                    marginTop:
                      "25px",
                  }}
                >

                  <h3>
                    ✅ Pontos positivos
                  </h3>


                  {
                    analiseNutricional
                      .pontosPositivos
                      .map(
                        (
                          ponto,
                          index,
                        ) => (

                          <p
                            key={
                              `${ponto}-${index}`
                            }
                          >
                            ✅ {ponto}
                          </p>

                        ),
                      )
                  }

                </div>

              )
            }


            {/* DADOS NÃO IDENTIFICADOS */}

            {
              analiseNutricional
                .observacoes
                .length >
                0 && (

                <div
                  style={{
                    marginTop:
                      "25px",

                    opacity:
                      0.85,
                  }}
                >

                  <h3>
                    Informações
                  </h3>


                  {
                    analiseNutricional
                      .observacoes
                      .map(
                        (
                          item,
                          index,
                        ) => (

                          <p
                            key={
                              `${item}-${index}`
                            }
                          >
                            • {item}
                          </p>

                        ),
                      )
                  }

                </div>

              )
            }


            {
              !analiseNutricional
                .podeConcluir && (

                <div
                  style={{
                    marginTop:
                      "25px",

                    padding:
                      "18px",

                    border:
                      "1px solid #d99",

                    borderRadius:
                      "12px",

                    textAlign:
                      "center",
                  }}
                >

                  📷 Tire outra foto mais próxima,
                  nítida e sem reflexo para tentar
                  novamente.

                </div>

              )
            }


            <p
              style={{
                marginTop:
                  "30px",

                fontSize:
                  "12px",

                opacity:
                  0.65,

                textAlign:
                  "center",
              }}
            >

              A avaliação considera os nutrientes
              identificados na tabela e os critérios
              de alto teor para açúcares adicionados,
              gordura saturada e sódio. Não substitui
              avaliação nutricional profissional.

            </p>

          </section>

        )
      }


      {/* ================================= */}
      {/* NUTRIENTES EXTRAÍDOS */}
      {/* ================================= */}

      {
        dadosNutricionais && (

          <details
            style={{
              maxWidth:
                "700px",

              margin:
                "30px auto",
            }}
          >

            <summary
              style={{
                cursor:
                  "pointer",

                fontWeight:
                  "bold",
              }}
            >
              Ver nutrientes identificados
            </summary>


            <section
              style={{
                textAlign:
                  "left",

                padding:
                  "20px",
              }}
            >

              <p>
                🔥 Energia:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .energiaKcal,

                      "kcal",
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

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                🍬 Açúcares totais:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .acucaresTotais,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                🍭 Açúcares adicionados:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .acucaresAdicionados,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                💪 Proteínas:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .proteina,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                🥑 Gorduras totais:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gordura,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                Gordura saturada:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gorduraSaturada,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                Gordura trans:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gorduraTrans,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                🌾 Fibra alimentar:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .fibra,

                      "g",
                    )
                  }
                </strong>
              </p>


              <p>
                🧂 Sódio:{" "}
                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .sodio,

                      "mg",
                    )
                  }
                </strong>
              </p>

            </section>

          </details>

        )
      }


      {/* ================================= */}
      {/* OCR DEBUG */}
      {/* ================================= */}

      {
        resultadoOCR && (

          <details
            style={{
              maxWidth:
                "760px",

              margin:
                "30px auto",
            }}
          >

            <summary
              style={{
                cursor:
                  "pointer",

                fontWeight:
                  "bold",
              }}
            >
              Detalhes técnicos do OCR
            </summary>


            <section>

              <p>

                Confiança média:{" "}

                {
                  resultadoOCR
                    .confianca
                    .toFixed(2)
                }

                %

              </p>


              <p>

                Estratégia utilizada:{" "}

                <strong>

                  {
                    resultadoOCR
                      .modo ??
                    "não informado"
                  }

                </strong>

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
                    "left",
                }}
              >

                {
                  resultadoOCR
                    .texto
                }

              </pre>

            </section>

          </details>

        )
      }


      {/* ================================= */}
      {/* ERRO */}
      {/* ================================= */}

      {
        erro && (

          <p
            style={{
              color:
                "#ff6b6b",

              fontWeight:
                "bold",
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