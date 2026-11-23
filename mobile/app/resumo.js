import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecalhoTela } from '../src/components/CabecalhoTela';
import { Carregando } from '../src/components/Carregando';
import { Cartao } from '../src/components/Cartao';
import { CartaoMetrica } from '../src/components/CartaoMetrica';
import { ErroConexao } from '../src/components/ErroConexao';
import { comprovanteService } from '../src/services/comprovanteService';
import { cores, espacamentos, raios } from '../src/theme';
import { estiloDaCategoria } from '../src/theme/categorias';
import { fontes } from '../src/theme/fontes';
import { mensagemDeErro } from '../src/utils/erros';
import { formatarMoeda } from '../src/utils/formatacao';
import { formatarMesAno, mesAnterior, mesPosterior } from '../src/utils/mes';
import { calcularPercentual } from '../src/utils/resumoCalculos';
import {
  MENSAGEM_FORMATO_INVALIDO,
  RespostaFormatoInvalidoError,
  resumoValido,
} from '../src/utils/resumoApi';

// Seta do seletor desabilitada (frame "Resumo do mês - sem gastos" do Figma).
const COR_SETA_DESABILITADA = 'rgba(255, 255, 255, 0.25)';

function SetaDoSeletor({ simbolo, rotulo, desabilitada, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitada}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={8}
      style={{ paddingHorizontal: 10 }}
    >
      <Text
        style={{
          fontFamily: fontes.textoForte,
          fontSize: 24,
          lineHeight: 36,
          color: desabilitada ? COR_SETA_DESABILITADA : cores.destaque,
        }}
      >
        {simbolo}
      </Text>
    </Pressable>
  );
}

// Pílula do cabeçalho: ‹ Novembro 2026 ›
function SeletorDeMes({ mes, anteriorDesabilitado, posteriorDesabilitado, onAnterior, onPosterior }) {
  return (
    <View
      style={{
        backgroundColor: cores.superficieSobrePrimaria,
        borderRadius: raios.pilula,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <SetaDoSeletor
        simbolo="‹"
        rotulo="Mês anterior"
        desabilitada={anteriorDesabilitado}
        onPress={onAnterior}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{ fontFamily: fontes.titulo, fontSize: 16, lineHeight: 24, color: '#FFFFFF' }}
      >
        {mes ? formatarMesAno(mes) : ' '}
      </Text>
      <SetaDoSeletor
        simbolo="›"
        rotulo="Próximo mês"
        desabilitada={posteriorDesabilitado}
        onPress={onPosterior}
      />
    </View>
  );
}

// Uma categoria do cartão "Gastos por categoria": nome, valor com porcentagem e
// barra na cor da categoria. A última linha tem o mesmo respiro embaixo do Figma.
function BarraDaCategoria({ categoria, percentual, ultima }) {
  const { cor } = estiloDaCategoria(categoria.nome);

  return (
    <View style={{ paddingTop: 18, paddingBottom: ultima ? 18 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontes.subtitulo, fontSize: 14, lineHeight: 21, color: cores.textoPrincipal }}>
          {categoria.nome}
        </Text>
        <Text style={{ fontFamily: fontes.numero, fontSize: 13.5, lineHeight: 20.25, color: cores.primaria }}>
          {formatarMoeda(categoria.total)} ({percentual}%)
        </Text>
      </View>
      <View
        style={{
          marginTop: 6,
          height: 10,
          borderRadius: raios.barra,
          backgroundColor: cores.trilha,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 10,
            width: `${percentual}%`,
            borderRadius: raios.barra,
            backgroundColor: cor,
          }}
        />
      </View>
    </View>
  );
}

function CartaoSemGastos({ mes }) {
  return (
    <Cartao
      preenchimento={0}
      estilo={{ marginTop: espacamentos.xl, paddingHorizontal: espacamentos.xxl, paddingVertical: 48, alignItems: 'center' }}
    >
      <Text
        style={{
          fontFamily: fontes.titulo,
          fontSize: 17,
          lineHeight: 25.5,
          color: cores.textoCorpo,
          textAlign: 'center',
        }}
      >
        Nenhum gasto neste mês
      </Text>
      <Text
        style={{
          fontFamily: fontes.texto,
          fontSize: 14,
          lineHeight: 21,
          color: cores.textoSecundario,
          textAlign: 'center',
          marginTop: 6,
        }}
      >
        Não há comprovantes registrados em {formatarMesAno(mes)}.
      </Text>
    </Cartao>
  );
}

export default function Resumo() {
  const insets = useSafeAreaInsets();

  // Mês mostrado no seletor, já atualizado ao navegar (antes da resposta
  // chegar) para o título nunca ficar "atrasado" em relação ao clique.
  const [mesExibido, setMesExibido] = useState(null);
  const [mesAtual, setMesAtual] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Descarta respostas de requisições antigas ao trocar de mês rapidamente.
  const idRequisicaoRef = useRef(0);
  const mesAtualRef = useRef(null);
  // Mês (ou undefined, na primeira carga) pedido na última tentativa, para o
  // "tentar de novo" repetir exatamente o mês que falhou.
  const mesAlvoRef = useRef(undefined);

  const carregar = useCallback(async (mes) => {
    idRequisicaoRef.current += 1;
    const idRequisicao = idRequisicaoRef.current;
    mesAlvoRef.current = mes;
    setCarregando(true);
    setErro(null);
    if (mes) setMesExibido(mes);

    try {
      // Primeira carga: sem parâmetro "mes", para a API definir o mês atual
      // (evita calcular o mês pelo relógio do aparelho).
      const resposta = await comprovanteService.resumo(mes ? { mes } : undefined);
      if (idRequisicao !== idRequisicaoRef.current) return;

      const dados = resposta.data?.data;
      if (!resumoValido(dados)) {
        throw new RespostaFormatoInvalidoError();
      }

      if (!mesAtualRef.current) {
        mesAtualRef.current = dados.mes;
        setMesAtual(dados.mes);
      }

      setMesExibido(dados.mes);
      setResumo(dados);
    } catch (erroCapturado) {
      if (idRequisicao !== idRequisicaoRef.current) return;
      setErro(
        erroCapturado instanceof RespostaFormatoInvalidoError
          ? MENSAGEM_FORMATO_INVALIDO
          : mensagemDeErro(erroCapturado)
      );
    } finally {
      if (idRequisicao === idRequisicaoRef.current) setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const irParaMesAnterior = useCallback(() => {
    carregar(mesAnterior(mesExibido));
  }, [carregar, mesExibido]);

  const irParaMesPosterior = useCallback(() => {
    carregar(mesPosterior(mesExibido));
  }, [carregar, mesExibido]);

  const tentarDeNovo = useCallback(() => {
    carregar(mesAlvoRef.current);
  }, [carregar]);

  const temMes = Boolean(mesExibido);
  const noMesAtual = temMes && mesExibido === mesAtual;
  const temGastos = Boolean(resumo && resumo.quantidade > 0);

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundoTela }}>
      <CabecalhoTela titulo="Resumo do Mês">
        <SeletorDeMes
          mes={mesExibido}
          anteriorDesabilitado={!temMes || carregando}
          posteriorDesabilitado={!temMes || carregando || noMesAtual}
          onAnterior={irParaMesAnterior}
          onPosterior={irParaMesPosterior}
        />
      </CabecalhoTela>

      <ScrollView
        contentContainerStyle={{ padding: espacamentos.xl, paddingBottom: espacamentos.xl + insets.bottom }}
      >
        {erro ? (
          <ErroConexao tentarNovamente={tentarDeNovo} mensagem={erro} />
        ) : carregando ? (
          <Carregando />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: espacamentos.md }}>
              <CartaoMetrica
                rotulo="Total gasto"
                valor={formatarMoeda(resumo?.total ?? 0)}
                estilo={{ flex: 1 }}
              />
              <CartaoMetrica
                rotulo="Comprovantes"
                valor={String(resumo?.quantidade ?? 0)}
                estilo={{ flex: 1 }}
              />
            </View>

            {temGastos ? (
              <Cartao estilo={{ marginTop: espacamentos.xl }}>
                <Text
                  accessibilityRole="header"
                  style={{ fontFamily: fontes.titulo, fontSize: 16, lineHeight: 24, color: cores.primaria }}
                >
                  Gastos por categoria
                </Text>
                {resumo.porCategoria.map((categoria, indice) => (
                  <BarraDaCategoria
                    key={categoria.categoriaId}
                    categoria={categoria}
                    percentual={calcularPercentual(categoria.total, resumo.total)}
                    ultima={indice === resumo.porCategoria.length - 1}
                  />
                ))}
              </Cartao>
            ) : (
              <CartaoSemGastos mes={mesExibido} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
