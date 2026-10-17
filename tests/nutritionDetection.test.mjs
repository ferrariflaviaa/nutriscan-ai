import test from 'node:test';
import assert from 'node:assert/strict';
import { textoContemTabelaNutricional } from '../src/services/nutritionDetection.ts';

test('aceita tabela brasileira lida da embalagem com valores sem unidades nas linhas', () => {
  assert.equal(textoContemTabelaNutricional(`INFORMAÇÃO NUTRICIONAL
Porção: 30 g
Valor energético 134 7%
Carboidratos 21 7%
Proteínas 2,3 3%`), true);
});

test('aceita vários nutrientes mesmo sem reconhecer o cabeçalho', () => {
  assert.equal(textoContemTabelaNutricional(`Carboidratos 21g
Proteínas 2,3g
Gorduras totais 4,3g
Sódio 102mg`), true);
});

test('não confirma uma tabela apenas pelo título ou por propaganda', () => {
  for (const texto of ['', 'Informação nutricional', 'Porção 30g\nRico em proteínas\nSem gorduras trans', 'Proteínas 10g\nCarboidratos 20g']) {
    assert.equal(textoContemTabelaNutricional(texto), false);
  }
});

test('não conta várias linhas do mesmo nutriente como nutrientes diferentes', () => {
  assert.equal(textoContemTabelaNutricional('Porção 30g\nProteínas 2g\nProteínas 3g\nProteínas 4g'), false);
});
