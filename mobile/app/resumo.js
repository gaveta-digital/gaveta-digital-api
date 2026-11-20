import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Carregando } from '../src/components/Carregando';
import { ErroConexao } from '../src/components/ErroConexao';
import { EstadoVazio } from '../src/components/EstadoVazio';
import { comprovanteService } from '../src/services/comprovanteService';
import { cores } from '../src/theme';
import { formatarMoeda } from '../src/utils/formatacao';
import { formatarMesAno, mesAnterior, mesPosterior } from '../src/utils/mes';
import { calcularPercentual } from '../src/utils/resumoCalculos';
import {
  mensagemErroRequisicao,
  RespostaFormatoInvalidoError,
  resumoValido,
} from '../src/utils/resumoApi';

const MENSAGEM_FORMATO_INVALIDO = 'Recebemos uma resposta inválida do servidor.';

export default function Resumo() {
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
          : mensagemErroRequisicao(erroCapturado)
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

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: cores.primaria, fontWeight: '600' }}>‹ Voltar</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Pressable
          onPress={irParaMesAnterior}
          disabled={!temMes || carregando}
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 22, color: !temMes || carregando ? '#CCCCCC' : cores.primaria }}>
            ‹
          </Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', marginHorizontal: 12, minWidth: 160, textAlign: 'center' }}>
          {temMes ? formatarMesAno(mesExibido) : ' '}
        </Text>
        <Pressable
          onPress={irParaMesPosterior}
          disabled={!temMes || carregando || noMesAtual}
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 22, color: !temMes || carregando || noMesAtual ? '#CCCCCC' : cores.primaria }}>
            ›
          </Text>
        </Pressable>
      </View>

      {erro ? (
        <ErroConexao tentarNovamente={tentarDeNovo} mensagem={erro} />
      ) : carregando ? (
        <Carregando />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: cores.primaria }}>
              {formatarMoeda(resumo?.total ?? 0)}
            </Text>
            <Text style={{ color: '#666666', marginTop: 4 }}>
              {resumo?.quantidade ?? 0} comprovante(s)
            </Text>
          </View>

          {resumo && resumo.quantidade > 0 ? (
            resumo.porCategoria.map((categoria) => {
              const percentual = calcularPercentual(categoria.total, resumo.total);
              return (
                <View key={categoria.categoriaId} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontWeight: '600' }}>{categoria.nome}</Text>
                    <Text style={{ color: '#666666' }}>
                      {formatarMoeda(categoria.total)} ({percentual}%)
                    </Text>
                  </View>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: '#EEEEEE', overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 5,
                        width: `${percentual}%`,
                        backgroundColor: cores.destaque,
                      }}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <EstadoVazio texto="Nenhum gasto neste mês" />
          )}
        </ScrollView>
      )}
    </View>
  );
}
