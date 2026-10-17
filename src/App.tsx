import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import "./App.css";

import {
  analisarComNutriScan,
  type ResultadoNutriScan,
} from "./services/nutriscan";

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


function App() {
  // ========================================
  // IMAGEM
  // ========================================

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


  // ========================================
  // CÂMERA
  // ========================================

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const streamRef =
    useRef<MediaStream | null>(
      null,
    );

  const [
    cameraAberta,
    setCameraAberta,
  ] =
    useState(false);

  const [
    carregandoCamera,
    setCarregandoCamera,
  ] =
    useState(false);


  // ========================================
  // PROCESSAMENTO
  // ========================================

  const [
    processando,
    setProcessando,
  ] =
    useState(false);

  const [
    etapa,
    setEtapa,
  ] =
    useState("");

  const [
    percentual,
    setPercentual,
  ] =
    useState(0);


  // ========================================
  // RESULTADOS
  // ========================================

  const [
    resultadoNutriScan,
    setResultadoNutriScan,
  ] =
    useState<ResultadoNutriScan | null>(
      null,
    );

  const [
    resultadoOCR,
    setResultadoOCR,
  ] =
    useState<ResultadoOCR | null>(
      null,
    );

  const [
    dadosNutricionais,
    setDadosNutricionais,
  ] =
    useState<DadosNutricionais | null>(
      null,
    );

  const [
    analiseNutricional,
    setAnaliseNutricional,
  ] =
    useState<ResultadoAnaliseNutricional | null>(
      null,
    );


  // ========================================
  // ERRO
  // ========================================

  const [
    erro,
    setErro,
  ] =
    useState("");


  // ========================================
  // CONECTAR CÂMERA AO VÍDEO
  // ========================================

  useEffect(() => {
    if (
      cameraAberta &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject =
        streamRef.current;

      videoRef.current
        .play()
        .catch(
          error => {
            console.error(
              "Erro ao iniciar preview:",
              error,
            );
          },
        );
    }
  }, [cameraAberta]);


  // ========================================
  // LIMPAR URL DA IMAGEM
  // ========================================

  useEffect(() => {
    return () => {
      if (imagem) {
        URL.revokeObjectURL(
          imagem,
        );
      }
    };
  }, [imagem]);


  // ========================================
  // DESLIGAR CÂMERA AO SAIR
  // ========================================

  useEffect(() => {
    return () => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            track => {
              track.stop();
            },
          );
      }
    };
  }, []);


  // ========================================
  // LIMPAR RESULTADOS
  // ========================================

  function limparResultados() {
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

    setEtapa(
      "",
    );

    setPercentual(
      0,
    );

    setErro(
      "",
    );
  }


  // ========================================
  // PARAR CÂMERA
  // ========================================

  function pararCamera() {
    if (
      streamRef.current
    ) {
      streamRef.current
        .getTracks()
        .forEach(
          track => {
            track.stop();
          },
        );

      streamRef.current =
        null;
    }


    if (
      videoRef.current
    ) {
      videoRef.current.srcObject =
        null;
    }


    setCameraAberta(
      false,
    );
  }


  // ========================================
  // ABRIR CÂMERA
  // ========================================

  async function abrirCamera() {
    setErro(
      "",
    );

    setCarregandoCamera(
      true,
    );


    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "Este navegador não oferece acesso à câmera.",
        );
      }


      pararCamera();


      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: {
                ideal: "environment",
              },

              width: {
                ideal: 1920,
              },

              height: {
                ideal: 1080,
              },
            },

            audio: false,
          });


      streamRef.current =
        stream;


      setCameraAberta(
        true,
      );

    } catch (error) {
      console.error(
        "Erro ao acessar câmera:",
        error,
      );


      if (
        error instanceof DOMException
      ) {
        if (
          error.name ===
          "NotAllowedError"
        ) {
          setErro(
            "Permissão da câmera negada. Autorize o acesso à câmera no navegador.",
          );

        } else if (
          error.name ===
          "NotFoundError"
        ) {
          setErro(
            "Nenhuma câmera foi encontrada neste dispositivo.",
          );

        } else {
          setErro(
            "Não foi possível abrir a câmera.",
          );
        }

      } else {
        setErro(
          "Não foi possível abrir a câmera.",
        );
      }

    } finally {
      setCarregandoCamera(
        false,
      );
    }
  }


  // ========================================
  // CAPTURAR FOTO
  // ========================================

  async function capturarFoto() {
    const video =
      videoRef.current;


    if (
      !video ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setErro(
        "A câmera ainda está carregando. Aguarde alguns segundos e tente novamente.",
      );

      return;
    }


    const canvas =
      document.createElement(
        "canvas",
      );


    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;


    const contexto =
      canvas.getContext(
        "2d",
      );


    if (
      !contexto
    ) {
      setErro(
        "Não foi possível capturar a imagem.",
      );

      return;
    }


    contexto.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    );


    const blob =
      await new Promise<Blob | null>(
        resolve => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.95,
          );
        },
      );


    if (
      !blob
    ) {
      setErro(
        "Não foi possível gerar a foto capturada.",
      );

      return;
    }


    const novoArquivo =
      new File(
        [blob],

        `nutriscan-${Date.now()}.jpg`,

        {
          type: "image/jpeg",
        },
      );


    if (
      imagem
    ) {
      URL.revokeObjectURL(
        imagem,
      );
    }


    const novaImagem =
      URL.createObjectURL(
        novoArquivo,
      );


    setArquivo(
      novoArquivo,
    );

    setImagem(
      novaImagem,
    );


    limparResultados();

    pararCamera();
  }


  // ========================================
  // SELECIONAR FOTO
  // ========================================

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


    pararCamera();


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


    limparResultados();


    event.target.value =
      "";
  }


  // ========================================
  // CARREGAR HTML IMAGE
  // ========================================

  async function carregarImagemHTML(
    origem: string,
  ): Promise<HTMLImageElement> {
    const img =
      new Image();


    img.src =
      origem;


    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        img.onload =
          () => {
            resolve();
          };


        img.onerror =
          () => {
            reject(
              new Error(
                "Erro ao carregar a imagem.",
              ),
            );
          };
      },
    );


    return img;
  }


  // ========================================
  // ANALISAR RÓTULO
  // ========================================

  async function analisarRotulo() {
    if (
      !arquivo ||
      !imagem
    ) {
      return;
    }


    setProcessando(
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
      // ====================================
      // 1. TENSORFLOW
      // ====================================

      setEtapa(
        "Detectando tabela nutricional...",
      );

      setPercentual(
        10,
      );


      const img =
        await carregarImagemHTML(
          imagem,
        );


      const classificacao =
        await analisarComNutriScan(
          img,
        );


      setResultadoNutriScan(
        classificacao,
      );


      setPercentual(
        25,
      );


      // ====================================
      // NÃO É TABELA
      // ====================================

      if (
        classificacao.classe !==
        "Tabela nutricional"
      ) {
        setEtapa(
          "Não foi possível identificar uma tabela nutricional.",
        );

        setPercentual(
          100,
        );

        return;
      }


      // ====================================
      // 2. OCR
      // ====================================

      setEtapa(
        "Lendo informações do rótulo...",
      );


      const resultadoTexto =
        await extrairTextoImagem(
          imagem,

          dados => {
            const progressoOCR =
              25 +
              Math.round(
                dados.progresso *
                55,
              );


            setPercentual(
              Math.min(
                progressoOCR,
                80,
              ),
            );


            setEtapa(
              dados.status,
            );
          },
        );


      setResultadoOCR(
        resultadoTexto,
      );


      // ====================================
      // 3. INTERPRETAÇÃO
      // ====================================

      setEtapa(
        "Interpretando nutrientes...",
      );

      setPercentual(
        85,
      );


      const nutrientes =
        interpretarTabelaNutricional(
          resultadoTexto.texto,
        );


      setDadosNutricionais(
        nutrientes,
      );


      // ====================================
      // 4. ANÁLISE NUTRICIONAL
      // ====================================

      setEtapa(
        "Analisando perfil nutricional...",
      );

      setPercentual(
        92,
      );


      const analise =
        analisarNutricionalmente(
          nutrientes,
          resultadoTexto.texto,
        );


      setAnaliseNutricional(
        analise,
      );


      setEtapa(
        "Análise concluída",
      );

      setPercentual(
        100,
      );

    } catch (error) {
      console.error(
        "Erro durante análise do NutriScan:",
        error,
      );


      setErro(
        "Não foi possível analisar o rótulo. Tente novamente com uma foto mais nítida.",
      );


      setEtapa(
        "",
      );

      setPercentual(
        0,
      );

    } finally {
      setProcessando(
        false,
      );
    }
  }


  // ========================================
  // FORMATAR NÚMERO
  // ========================================

  function formatarNumero(
    valor: number,
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


  // ========================================
  // MOSTRAR VALOR
  // ========================================

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


    return `${formatarNumero(
      valor,
    )} ${unidade}`;
  }


  return (
    <main className="app">

      {/* ================================= */}
      {/* HERO */}
      {/* ================================= */}

      <section className="hero">

        <div className="hero-badge">
          ✨ Inteligência Artificial aplicada à nutrição
        </div>


        <h1>
          NutriScan AI
        </h1>


        <p className="hero-description">
          Entenda sua tabela nutricional em segundos.
          Envie uma foto e receba uma análise automática
          dos principais nutrientes.
        </p>

      </section>


      {/* ================================= */}
      {/* SCANNER */}
      {/* ================================= */}

      <section className="scanner-card">

        <div className="section-title">

          <span className="section-icon">
            📷
          </span>


          <div>

            <h2>
              Analisar rótulo
            </h2>


            <p>
              Escolha uma imagem ou fotografe sua tabela nutricional.
            </p>

          </div>

        </div>


        <div className="capture-options">

          {/* ESCOLHER FOTO */}

          <label className="capture-card">

            <input
              type="file"
              accept="image/*"
              onChange={
                selecionarImagem
              }
            />


            <span className="capture-icon">
              📁
            </span>


            <strong>
              Escolher foto
            </strong>


            <span>
              Selecione uma imagem salva no dispositivo
            </span>

          </label>


          {/* TIRAR FOTO */}

          <button
            type="button"
            className="capture-card camera-card capture-camera-button"
            onClick={
              abrirCamera
            }
            disabled={
              carregandoCamera ||
              cameraAberta
            }
          >

            <span className="capture-icon">
              📷
            </span>


            <strong>

              {
                carregandoCamera
                  ? "Abrindo câmera..."
                  : cameraAberta
                    ? "Câmera aberta"
                    : "Tirar foto"
              }

            </strong>


            <span>
              Use sua webcam ou câmera do dispositivo
            </span>

          </button>

        </div>


        <p className="capture-tip">
          💡 Fotografe a tabela de frente, com boa iluminação e sem reflexos.
        </p>


        {/* ================================= */}
        {/* CÂMERA */}
        {/* ================================= */}

        {
          cameraAberta && (

            <div className="camera-panel">

              <div className="camera-live-badge">
                <span />
                Câmera ativa
              </div>


              <video
                ref={
                  videoRef
                }
                className="camera-preview"
                autoPlay
                playsInline
                muted
              />


              <div className="camera-actions">

                <button
                  type="button"
                  className="camera-cancel-button"
                  onClick={
                    pararCamera
                  }
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  className="camera-capture-button"
                  onClick={
                    capturarFoto
                  }
                >
                  📸 Capturar foto
                </button>

              </div>

            </div>

          )
        }


        {/* ================================= */}
        {/* PREVIEW */}
        {/* ================================= */}

        {
          imagem && (

            <div className="preview-area">

              <img
                src={
                  imagem
                }
                alt="Rótulo selecionado"
                className="preview-image"
              />


              <p className="file-name">
                {
                  arquivo?.name
                }
              </p>


              <button
                className="primary-button"
                onClick={
                  analisarRotulo
                }
                disabled={
                  processando
                }
              >

                {
                  processando
                    ? "Analisando..."
                    : "Analisar rótulo"
                }

              </button>

            </div>

          )
        }

      </section>


      {/* ================================= */}
      {/* PROCESSAMENTO */}
      {/* ================================= */}

      {
        etapa && (

          <section className="processing-card">

            <div className="processing-header">

              <span>
                {
                  percentual ===
                  100
                    ? "✓"
                    : "◌"
                }
              </span>


              <strong>
                {
                  etapa
                }
              </strong>


              <span>
                {
                  percentual
                }
                %
              </span>

            </div>


            <div className="progress-track">

              <div
                className="progress-bar"
                style={{
                  width:
                    `${percentual}%`,
                }}
              />

            </div>

          </section>

        )
      }


      {/* ================================= */}
      {/* NÃO É TABELA */}
      {/* ================================= */}

      {
        resultadoNutriScan &&
        resultadoNutriScan.classe !==
          "Tabela nutricional" && (

          <section className="result-card incomplete">

            <div className="result-status-icon">
              📷
            </div>


            <h2>
              Tabela não identificada
            </h2>


            <p>
              Não conseguimos encontrar uma tabela
              nutricional nessa imagem.
            </p>


            <div className="tip-box">
              Tire uma foto mais próxima da tabela,
              com boa iluminação e sem reflexos.
            </div>

          </section>

        )
      }


      {/* ================================= */}
      {/* RESULTADO */}
      {/* ================================= */}

      {
        analiseNutricional && (

          <section
            className={
              `result-card status-${analiseNutricional.status}`
            }
          >

            <header className="result-header">

              <div className="result-status-icon">

                {
                  analiseNutricional.status ===
                  "favoravel"
                    ? "✅"
                    : analiseNutricional.status ===
                        "atencao"
                      ? "⚠️"
                      : analiseNutricional.status ===
                          "parcial"
                        ? "🟡"
                        : "📷"
                }

              </div>


              <h2>
                {
                  analiseNutricional.titulo
                }
              </h2>


              <p>
                {
                  analiseNutricional.descricao
                }
              </p>

            </header>


            {/* ================================= */}
            {/* PROTEÍNA */}
            {/* ================================= */}

            <div className="protein-card">

              <div className="nutrient-title">

                <span>
                  💪
                </span>


                <h3>
                  Proteína
                </h3>

              </div>


              {
                analiseNutricional
                  .proteina
                  .valor !== null
                  ? (

                    <>

                      <p className="protein-value">

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


                      <p className="protein-description">

                        {
                          analiseNutricional
                            .proteina
                            .mensagem
                        }

                      </p>

                    </>

                  )
                  : (

                    <p className="not-found">
                      Não foi possível identificar a proteína
                      com segurança.
                    </p>

                  )
              }

            </div>


            {/* ================================= */}
            {/* ALERTAS */}
            {/* ================================= */}

            {
              analiseNutricional
                .alertas
                .length > 0 && (

                <div className="result-section">

                  <h3 className="result-section-title warning-title">
                    ⚠️ Pontos de atenção
                  </h3>


                  <div className="alert-list">

                    {
                      analiseNutricional
                        .alertas
                        .map(
                          alerta => (

                            <article
                              className="alert-card"
                              key={
                                alerta.nutriente
                              }
                            >

                              <strong>
                                🔴 {
                                  alerta.titulo
                                }
                              </strong>


                              <span className="alert-value">

                                {
                                  formatarNumero(
                                    alerta.valor,
                                  )
                                }

                                {" "}

                                {
                                  alerta.unidade
                                }

                              </span>


                              <small>

                                Limite de alto teor:{" "}

                                {
                                  formatarNumero(
                                    alerta.limite,
                                  )
                                }

                                {" "}

                                {
                                  alerta.unidade
                                }

                              </small>

                            </article>

                          ),
                        )
                    }

                  </div>

                </div>

              )
            }


            {/* ================================= */}
            {/* PONTOS POSITIVOS */}
            {/* ================================= */}

            {
              analiseNutricional
                .pontosPositivos
                .length > 0 && (

                <div className="result-section">

                  <h3 className="result-section-title positive-title">
                    ✅ Pontos positivos
                  </h3>


                  <div className="positive-list">

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

                              <span>
                                ✓
                              </span>


                              {
                                ponto
                              }

                            </p>

                          ),
                        )
                    }

                  </div>

                </div>

              )
            }


            {/* ================================= */}
            {/* INFORMAÇÕES */}
            {/* ================================= */}

            {
              analiseNutricional
                .observacoes
                .length > 0 && (

                <div className="result-section info-section">

                  <h3 className="result-section-title">
                    ℹ️ Informações
                  </h3>


                  {
                    analiseNutricional
                      .observacoes
                      .map(
                        (
                          observacao,
                          index,
                        ) => (

                          <p
                            key={
                              `${observacao}-${index}`
                            }
                          >
                            {
                              observacao
                            }
                          </p>

                        ),
                      )
                  }

                </div>

              )
            }


            {/* ================================= */}
            {/* FOTO INSUFICIENTE */}
            {/* ================================= */}

            {
              !analiseNutricional
                .podeConcluir && (

                <div className="tip-box">
                  📷 Tire outra foto mais próxima,
                  nítida e sem reflexos para tentar novamente.
                </div>

              )
            }


            <footer className="analysis-disclaimer">

              Esta análise considera os nutrientes
              identificados no rótulo e os critérios
              utilizados pelo NutriScan. Não substitui
              avaliação nutricional profissional.

            </footer>

          </section>

        )
      }


      {/* ================================= */}
      {/* NUTRIENTES IDENTIFICADOS */}
      {/* ================================= */}

      {
        dadosNutricionais && (

          <details className="details-card">

            <summary>
              Ver nutrientes identificados
            </summary>


            <div className="nutrient-grid">

              <div>
                <span>
                  🔥 Energia
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .energiaKcal,
                      "kcal",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🍞 Carboidratos
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .carboidratos,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🍬 Açúcares totais
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .acucaresTotais,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🎯 Açúcares adicionados
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .acucaresAdicionados,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  💪 Proteína
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .proteina,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🥑 Gorduras totais
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gordura,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  Gordura saturada
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gorduraSaturada,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  Gordura trans
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .gorduraTrans,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🌾 Fibra
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .fibra,
                      "g",
                    )
                  }
                </strong>
              </div>


              <div>
                <span>
                  🧂 Sódio
                </span>

                <strong>
                  {
                    mostrarValor(
                      dadosNutricionais
                        .sodio,
                      "mg",
                    )
                  }
                </strong>
              </div>

            </div>

          </details>

        )
      }


      {/* ================================= */}
      {/* DETALHES TÉCNICOS */}
      {/* ================================= */}

      {
        resultadoOCR && (

          <details className="details-card technical-details">

            <summary>
              Detalhes técnicos da análise
            </summary>


            <div className="technical-grid">

              <div>

                <span>
                  Classificador
                </span>


                <strong>

                  {
                    resultadoNutriScan
                      ? (
                        resultadoNutriScan
                          .probabilidadeTabela *
                        100
                      ).toFixed(2)
                      : "-"
                  }

                  %

                </strong>

              </div>


              <div>

                <span>
                  Confiança OCR
                </span>


                <strong>

                  {
                    resultadoOCR
                      .confianca
                      .toFixed(2)
                  }

                  %

                </strong>

              </div>


              <div>

                <span>
                  Estratégia OCR
                </span>


                <strong>
                  {
                    resultadoOCR
                      .modo ??
                    "não informado"
                  }
                </strong>

              </div>

            </div>


            <pre className="ocr-text">
              {
                resultadoOCR.texto
              }
            </pre>

          </details>

        )
      }


      {/* ================================= */}
      {/* ERRO */}
      {/* ================================= */}

      {
        erro && (

          <div className="error-box">
            ⚠️ {erro}
          </div>

        )
      }


      {/* ================================= */}
      {/* FOOTER */}
      {/* ================================= */}

      <footer className="app-footer">

        <strong>
          NutriScan AI
        </strong>


        <span>
          TensorFlow.js • Transfer Learning • OCR
        </span>

      </footer>

    </main>
  );
}


export default App;
