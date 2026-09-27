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
  compararLimiares,
  type ResultadoAvaliacao
} from "./services/evaluation";


function App() {

  // ==========================================
  // IMAGEM
  // ==========================================

  const [imagem, setImagem] =
    useState<string | null>(null);

  const [arquivo, setArquivo] =
    useState<File | null>(null);


  // ==========================================
  // RESULTADO INDIVIDUAL
  // ==========================================

  const [
    resultadoNutriScan,
    setResultadoNutriScan
  ] =
    useState<ResultadoNutriScan | null>(
      null
    );


  const [carregando, setCarregando] =
    useState(false);


  // ==========================================
  // TREINAMENTO
  // ==========================================

  const [treinando, setTreinando] =
    useState(false);

  const [
    statusTreino,
    setStatusTreino
  ] =
    useState("");


  // ==========================================
  // AVALIAÇÃO DE THRESHOLD
  // ==========================================

  const [avaliando, setAvaliando] =
    useState(false);

  const [
    progressoAvaliacao,
    setProgressoAvaliacao
  ] =
    useState("");

  const [
    resultadosThreshold,
    setResultadosThreshold
  ] =
    useState<ResultadoAvaliacao[]>([]);


  const [
    resultadoSelecionado,
    setResultadoSelecionado
  ] =
    useState<ResultadoAvaliacao | null>(
      null
    );


  // ==========================================
  // ERROS
  // ==========================================

  const [erro, setErro] =
    useState("");


  // ==========================================
  // LIMPAR URL TEMPORÁRIA
  // ==========================================

  useEffect(() => {

    return () => {

      if (imagem) {
        URL.revokeObjectURL(imagem);
      }

    };

  }, [imagem]);


  // ==========================================
  // SELECIONAR IMAGEM
  // ==========================================

  function selecionarImagem(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    if (imagem) {
      URL.revokeObjectURL(imagem);
    }


    const novaImagem =
      URL.createObjectURL(file);


    setArquivo(file);

    setImagem(novaImagem);

    setResultadoNutriScan(null);

    setErro("");
  }


  // ==========================================
  // TREINAR
  // ==========================================

  async function treinar() {

    setTreinando(true);

    setErro("");

    setStatusTreino(
      "Iniciando treinamento..."
    );


    try {

      await treinarClassificador(
        (status) => {

          setStatusTreino(status);

        }
      );


      setStatusTreino(
        "Modelo NutriScan AI treinado e salvo com sucesso!"
      );


      setResultadosThreshold([]);

      setResultadoSelecionado(null);

    } catch (error) {

      console.error(
        "Erro durante treinamento:",
        error
      );


      setErro(
        "Ocorreu um erro durante o treinamento."
      );


      setStatusTreino("");

    } finally {

      setTreinando(false);

    }
  }


  // ==========================================
  // ANALISAR IMAGEM
  // ==========================================

  async function analisar() {

    if (!arquivo || !imagem) {
      return;
    }


    setCarregando(true);

    setErro("");

    setResultadoNutriScan(null);


    try {

      const img =
        new Image();


      img.src =
        imagem;


      await new Promise<void>(
        (resolve, reject) => {

          img.onload =
            () => resolve();


          img.onerror =
            () => {

              reject(
                new Error(
                  "Não foi possível carregar a imagem."
                )
              );

            };

        }
      );


      const resultado =
        await analisarComNutriScan(
          img
        );


      setResultadoNutriScan(
        resultado
      );

    } catch (error) {

      console.error(
        "Erro na análise:",
        error
      );


      setErro(
        "Não foi possível analisar a imagem."
      );

    } finally {

      setCarregando(false);

    }
  }


  // ==========================================
  // COMPARAR THRESHOLDS
  // ==========================================

  async function executarComparacao() {

    setAvaliando(true);

    setErro("");

    setResultadosThreshold([]);

    setResultadoSelecionado(null);

    setProgressoAvaliacao(
      "Preparando avaliação..."
    );


    try {

      const resultados =
        await compararLimiares(
          [
            0.50,
            0.45,
            0.40,
            0.35
          ],

          (atual, total) => {

            setProgressoAvaliacao(
              `Analisando ${atual}/${total}`
            );

          }
        );


      setResultadosThreshold(
        resultados
      );


      // Inicialmente mostramos detalhes
      // do threshold 0.50.

      setResultadoSelecionado(
        resultados[0]
      );


      setProgressoAvaliacao(
        "Comparação concluída!"
      );

    } catch (error) {

      console.error(
        "Erro na comparação:",
        error
      );


      setErro(
        "Não foi possível comparar os thresholds."
      );


      setProgressoAvaliacao("");

    } finally {

      setAvaliando(false);

    }
  }


  // ==========================================
  // INTERFACE
  // ==========================================

  return (

    <main className="app-container">


      {/* CABEÇALHO */}

      <header>

        <h1>
          NutriScan AI
        </h1>

        <p>
          Análise inteligente de rótulos
          utilizando TensorFlow.js
        </p>

      </header>


      {/* ================================= */}
      {/* TREINAMENTO */}
      {/* ================================= */}

      <section className="training-section">

        <h2>
          Treinamento do modelo
        </h2>

        <p>
          Treine o classificador para
          identificar tabelas nutricionais.
        </p>


        <button
          onClick={treinar}
          disabled={treinando}
        >

          {
            treinando
              ? "Treinando..."
              : "Treinar NutriScan AI"
          }

        </button>


        {
          statusTreino && (

            <p>
              {statusTreino}
            </p>

          )
        }

      </section>


      <hr />


      {/* ================================= */}
      {/* ANÁLISE INDIVIDUAL */}
      {/* ================================= */}

      <section className="scanner-section">

        <h2>
          Analisar imagem
        </h2>

        <p>
          Selecione uma imagem para verificar
          se ela contém uma tabela nutricional.
        </p>


        <input
          type="file"
          accept="image/*"
          onChange={selecionarImagem}
        />


        {
          imagem && (

            <>

              <div>

                <img
                  src={imagem}
                  alt="Imagem selecionada"
                  style={{
                    width: "100%",
                    maxWidth: "450px",
                    marginTop: "20px",
                    borderRadius: "10px"
                  }}
                />

              </div>


              <button
                onClick={analisar}
                disabled={carregando}
                style={{
                  marginTop: "16px"
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
      {/* RESULTADO INDIVIDUAL */}
      {/* ================================= */}

      {
        resultadoNutriScan && (

          <section
            style={{
              marginTop: "30px"
            }}
          >

            <h2>
              Resultado do NutriScan AI
            </h2>


            <h3
              style={{
                fontSize: "28px"
              }}
            >

              {
                resultadoNutriScan.classe
              }

            </h3>


            <p>

              Confiança:{" "}

              <strong>

                {
                  (
                    resultadoNutriScan
                      .confianca
                    * 100
                  ).toFixed(2)
                }

                %

              </strong>

            </p>


            <p>

              Score de tabela nutricional:{" "}

              <strong>

                {
                  (
                    resultadoNutriScan
                      .probabilidadeTabela
                    * 100
                  ).toFixed(2)
                }

                %

              </strong>

            </p>

          </section>

        )
      }


      <hr
        style={{
          marginTop: "40px"
        }}
      />


      {/* ================================= */}
      {/* THRESHOLD */}
      {/* ================================= */}

      <section
        style={{
          marginTop: "30px",
          marginBottom: "50px"
        }}
      >

        <h2>
          Experimento de Threshold
        </h2>

        <p>
          Compare diferentes limites de decisão
          usando o mesmo conjunto de teste.
        </p>


        <button
          onClick={executarComparacao}
          disabled={avaliando}
        >

          {
            avaliando
              ? "Avaliando..."
              : "Comparar thresholds"
          }

        </button>


        {
          progressoAvaliacao && (

            <p>
              {progressoAvaliacao}
            </p>

          )
        }


        {/* ================================= */}
        {/* TABELA COMPARATIVA */}
        {/* ================================= */}

        {
          resultadosThreshold.length > 0 && (

            <>

              <h2
                style={{
                  marginTop: "35px"
                }}
              >
                Comparação dos resultados
              </h2>


              <div
                style={{
                  overflowX: "auto"
                }}
              >

                <table
                  style={{
                    width: "100%",
                    maxWidth: "900px",
                    margin: "20px auto",
                    borderCollapse: "collapse"
                  }}
                >

                  <thead>

                    <tr>

                      <th>
                        Threshold
                      </th>

                      <th>
                        Acurácia
                      </th>

                      <th>
                        Precisão
                      </th>

                      <th>
                        Recall
                      </th>

                      <th>
                        F1
                      </th>

                      <th>
                        FP
                      </th>

                      <th>
                        FN
                      </th>

                      <th>
                        Detalhes
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      resultadosThreshold.map(
                        (resultado) => (

                          <tr
                            key={
                              resultado.limiar
                            }
                          >

                            <td>
                              {
                                resultado.limiar
                                  .toFixed(2)
                              }
                            </td>


                            <td>

                              {
                                (
                                  resultado.acuracia *
                                  100
                                ).toFixed(2)
                              }

                              %

                            </td>


                            <td>

                              {
                                (
                                  resultado.precisao *
                                  100
                                ).toFixed(2)
                              }

                              %

                            </td>


                            <td>

                              {
                                (
                                  resultado.recall *
                                  100
                                ).toFixed(2)
                              }

                              %

                            </td>


                            <td>

                              {
                                (
                                  resultado.f1Score *
                                  100
                                ).toFixed(2)
                              }

                              %

                            </td>


                            <td>

                              {
                                resultado
                                  .falsoPositivo
                              }

                            </td>


                            <td>

                              {
                                resultado
                                  .falsoNegativo
                              }

                            </td>


                            <td>

                              <button
                                onClick={() =>
                                  setResultadoSelecionado(
                                    resultado
                                  )
                                }
                              >
                                Ver erros
                              </button>

                            </td>

                          </tr>

                        )
                      )
                    }

                  </tbody>

                </table>

              </div>

            </>

          )
        }


        {/* ================================= */}
        {/* DETALHES DO THRESHOLD */}
        {/* ================================= */}

        {
          resultadoSelecionado && (

            <section
              style={{
                marginTop: "40px"
              }}
            >

              <h2>

                Threshold{" "}

                {
                  resultadoSelecionado
                    .limiar
                    .toFixed(2)
                }

              </h2>


              <p>

                Acertos:{" "}

                <strong>
                  {
                    resultadoSelecionado
                      .acertos
                  }
                </strong>

                {" / "}

                {
                  resultadoSelecionado
                    .total
                }

              </p>


              <p>

                Erros:{" "}

                <strong>
                  {
                    resultadoSelecionado
                      .erros
                  }
                </strong>

              </p>


              <p>

                Falso positivo:{" "}

                <strong>
                  {
                    resultadoSelecionado
                      .falsoPositivo
                  }
                </strong>

              </p>


              <p>

                Falso negativo:{" "}

                <strong>
                  {
                    resultadoSelecionado
                      .falsoNegativo
                  }
                </strong>

              </p>


              {/* ================================= */}
              {/* IMAGENS ERRADAS */}
              {/* ================================= */}

              {
                resultadoSelecionado
                  .errosDetalhados
                  .length > 0 && (

                  <>

                    <h2
                      style={{
                        marginTop: "40px"
                      }}
                    >
                      Erros com este threshold
                    </h2>


                    <div
                      style={{
                        display: "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(250px, 1fr))",

                        gap: "20px",

                        marginTop: "25px"
                      }}
                    >

                      {
                        resultadoSelecionado
                          .errosDetalhados
                          .map(
                            (
                              erroModelo,
                              index
                            ) => (

                              <article
                                key={
                                  `${erroModelo.url}-${index}`
                                }
                                style={{
                                  border:
                                    "1px solid #444",

                                  borderRadius:
                                    "12px",

                                  padding:
                                    "15px",

                                  background:
                                    "#1d1d22",

                                  textAlign:
                                    "left"
                                }}
                              >

                                <img
                                  src={
                                    erroModelo.url
                                  }
                                  alt={
                                    `Erro ${index + 1}`
                                  }
                                  style={{
                                    width:
                                      "100%",

                                    height:
                                      "220px",

                                    objectFit:
                                      "contain",

                                    background:
                                      "#111",

                                    borderRadius:
                                      "8px"
                                  }}
                                />


                                <h3>

                                  {
                                    erroModelo.tipo
                                  }

                                </h3>


                                <p>

                                  Esperado:{" "}

                                  <strong>

                                    {
                                      erroModelo
                                        .esperado
                                    }

                                  </strong>

                                </p>


                                <p>

                                  Modelo:{" "}

                                  <strong>

                                    {
                                      erroModelo
                                        .previsto
                                    }

                                  </strong>

                                </p>


                                <p>

                                  Score tabela:{" "}

                                  <strong>

                                    {
                                      (
                                        erroModelo
                                          .probabilidadeTabela
                                        * 100
                                      ).toFixed(2)
                                    }

                                    %

                                  </strong>

                                </p>

                              </article>

                            )
                          )
                      }

                    </div>

                  </>

                )
              }

            </section>

          )
        }

      </section>


      {/* ================================= */}
      {/* ERRO GLOBAL */}
      {/* ================================= */}

      {
        erro && (

          <div
            style={{
              padding: "15px",
              margin: "20px",
              border:
                "1px solid #ff6b6b",
              borderRadius: "8px"
            }}
          >

            {erro}

          </div>

        )
      }

    </main>

  );
}


export default App;