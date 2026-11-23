import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Botao } from '../../src/components/Botao';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Carregando } from '../../src/components/Carregando';
import { ErroConexao } from '../../src/components/ErroConexao';
import { EstadoVazio } from '../../src/components/EstadoVazio';
import { IconeCategoria } from '../../src/components/IconeCategoria';
import { useAuth } from '../../src/context/AuthContext';
import { categoriaService } from '../../src/services/categoriaService';
import { comprovanteService } from '../../src/services/comprovanteService';
import { useDebounce } from '../../src/hooks/useDebounce';
import { cores } from '../../src/theme';
import { mensagemDeErro } from '../../src/utils/erros';
import { formatarData, formatarMoeda, iniciaisNome } from '../../src/utils/formatacao';
import {
  MENSAGEM_FORMATO_INVALIDO,
  RespostaFormatoInvalidoError,
  resumoValido,
} from '../../src/utils/resumoApi';

const LIMITE_POR_PAGINA = 20;
const ESPERA_BUSCA_MS = 400;
const TAMANHO_MAXIMO_BUSCA = 100;

export function listaDeComprovantesValida(dados) {
  return Array.isArray(dados);
}

// Extraído para ficar testável isoladamente: omite categoriaId quando "Todas"
// está selecionado e busca quando vazia, pois a API retorna 400 nesses casos.
export function montarParametrosListagem({ pagina, categoriaId, busca }) {
  const parametros = { pagina, limite: LIMITE_POR_PAGINA };

  if (categoriaId) {
    parametros.categoriaId = categoriaId;
  }

  const buscaTratada = (busca || '').trim();
  if (buscaTratada) {
    parametros.busca = buscaTratada;
  }

  return parametros;
}

export default function Comprovantes() {
  const { usuario } = useAuth();

  const [busca, setBusca] = useState('');
  const buscaComEspera = useDebounce(busca, ESPERA_BUSCA_MS);
  const buscaAplicada = buscaComEspera.trim();

  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState(null);

  const [comprovantes, setComprovantes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [erroTela, setErroTela] = useState(null);
  const [erroRodape, setErroRodape] = useState(null);

  const [resumo, setResumo] = useState(null);
  const [resumoCarregando, setResumoCarregando] = useState(true);
  const [resumoErro, setResumoErro] = useState(null);

  // Guardam os filtros atuais fora do fechamento de carregarPagina, para que
  // essa função mantenha identidade estável (necessário para o useFocusEffect
  // não recarregar a cada troca de filtro, só ao focar a aba de novo).
  const filtrosAtuaisRef = useRef({ categoriaId: null, busca: '' });
  filtrosAtuaisRef.current = { categoriaId, busca: buscaAplicada };

  // Diz ao catch de carregarPagina se já há itens na tela, para decidir entre
  // erro de tela cheia (lista vazia ou filtro recém-trocado) e aviso discreto
  // no rodapé (lista já populada, ex.: falha ao carregar mais ou num refresh).
  const temItensRef = useRef(false);
  temItensRef.current = comprovantes.length > 0;

  // Mesma razão do filtrosAtuaisRef: permite reler "categorias ainda vazias"
  // dentro de callbacks estáveis (useFocusEffect, aoAtualizar) sem quebrar a
  // identidade dessas funções a cada carregamento de categorias.
  const categoriasVaziasRef = useRef(true);
  categoriasVaziasRef.current = categorias.length === 0;

  // Descarta respostas de requisições antigas (filtro/busca trocado enquanto
  // uma chamada anterior ainda estava no ar).
  const idRequisicaoRef = useRef(0);
  const resumoIdRef = useRef(0);
  const primeiroFocoRef = useRef(true);
  const ultimaTentativaRef = useRef({ paginaAlvo: 1, reiniciar: true, limparAntes: true });

  const categoriasPorId = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria.nome])),
    [categorias]
  );

  const carregarCategorias = useCallback(async () => {
    try {
      const resposta = await categoriaService.listar();
      setCategorias(Array.isArray(resposta.data) ? resposta.data : []);
    } catch {
      // Filtro degrada para "Todas"; não bloqueia a lista de comprovantes.
    }
  }, []);

  const carregarResumo = useCallback(async () => {
    resumoIdRef.current += 1;
    const idRequisicao = resumoIdRef.current;
    setResumoCarregando(true);
    setResumoErro(null);

    try {
      const resposta = await comprovanteService.resumo();
      if (idRequisicao !== resumoIdRef.current) return;

      const dados = resposta.data?.data;
      if (!resumoValido(dados)) {
        throw new RespostaFormatoInvalidoError();
      }

      setResumo(dados);
    } catch (erro) {
      if (idRequisicao !== resumoIdRef.current) return;
      setResumoErro(
        erro instanceof RespostaFormatoInvalidoError
          ? MENSAGEM_FORMATO_INVALIDO
          : mensagemDeErro(erro)
      );
    } finally {
      if (idRequisicao === resumoIdRef.current) setResumoCarregando(false);
    }
  }, []);

  const carregarPagina = useCallback(async (paginaAlvo, { reiniciar = false, limparAntes = false } = {}) => {
    if (reiniciar) idRequisicaoRef.current += 1;
    const idRequisicao = idRequisicaoRef.current;
    ultimaTentativaRef.current = { paginaAlvo, reiniciar, limparAntes };

    if (reiniciar) {
      setCarregandoInicial(true);
      setErroTela(null);
      // Troca de filtro/busca (e a carga inicial): limpa a lista antes de
      // buscar, para nunca mostrar itens do filtro anterior com o novo
      // filtro já marcado (critério 5). Refresh e foco da aba não limpam.
      if (limparAntes) setComprovantes([]);
    } else {
      setCarregandoMais(true);
    }

    try {
      const parametros = montarParametrosListagem({
        pagina: paginaAlvo,
        ...filtrosAtuaisRef.current,
      });
      const resposta = await comprovanteService.listar(parametros);
      if (idRequisicao !== idRequisicaoRef.current) return;

      const itens = resposta.data?.data;
      if (!listaDeComprovantesValida(itens)) {
        throw new RespostaFormatoInvalidoError();
      }

      setComprovantes((atuais) => (reiniciar ? itens : [...atuais, ...itens]));
      setTemMais(itens.length === LIMITE_POR_PAGINA);
      setPagina(paginaAlvo);
      setErroTela(null);
      setErroRodape(null);
    } catch (erro) {
      if (idRequisicao !== idRequisicaoRef.current) return;

      const mensagem = erro instanceof RespostaFormatoInvalidoError
        ? MENSAGEM_FORMATO_INVALIDO
        : mensagemDeErro(erro);

      // Vai para o erro de tela cheia quando a lista foi limpa (troca de
      // filtro/busca ou carga inicial) ou quando não há nada já exibido.
      // Com itens na tela (carregar mais, refresh ou foco da aba), mantém a
      // lista e avisa só no rodapé.
      if (limparAntes || !temItensRef.current) {
        setErroTela(mensagem);
        setErroRodape(null);
      } else {
        setErroTela(null);
        setErroRodape(mensagem);
      }
    } finally {
      if (idRequisicao === idRequisicaoRef.current) {
        setCarregandoInicial(false);
        setCarregandoMais(false);
        setAtualizando(false);
      }
    }
  }, []);

  useEffect(() => { carregarCategorias(); }, [carregarCategorias]);
  useEffect(() => { carregarResumo(); }, [carregarResumo]);

  // Filtro ou busca mudou: reinicia a paginação, limpando a lista antes de
  // buscar (critério 5; trata como primeira carga).
  useEffect(() => {
    carregarPagina(1, { reiniciar: true, limparAntes: true });
  }, [categoriaId, buscaAplicada, carregarPagina]);

  // Recarrega ao voltar para a aba, após criar/editar/excluir um comprovante
  // (critério 6). Ignora o foco inicial, já tratado pelo efeito acima. Não
  // limpa a lista (critério 5: foco mantém a lista exibida até a resposta).
  useFocusEffect(
    useCallback(() => {
      if (primeiroFocoRef.current) {
        primeiroFocoRef.current = false;
        return;
      }
      // Tenta recarregar categorias só se o mapa ainda estiver vazio, para
      // não refazer a chamada a cada foco quando ela já teve sucesso.
      if (categoriasVaziasRef.current) carregarCategorias();
      carregarResumo();
      carregarPagina(1, { reiniciar: true });
    }, [carregarPagina, carregarResumo, carregarCategorias])
  );

  const carregarMais = useCallback(() => {
    if (carregandoInicial || carregandoMais || atualizando || erroTela || !temMais) return;
    carregarPagina(pagina + 1);
  }, [carregarPagina, pagina, temMais, carregandoInicial, carregandoMais, atualizando, erroTela]);

  const tentarDeNovoRodape = useCallback(() => {
    const { paginaAlvo, reiniciar, limparAntes } = ultimaTentativaRef.current;
    carregarPagina(paginaAlvo, { reiniciar, limparAntes });
  }, [carregarPagina]);

  const tentarDeNovoTela = useCallback(() => {
    carregarPagina(1, { reiniciar: true, limparAntes: true });
  }, [carregarPagina]);

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    // Mesma regra do foco: só tenta categorias de novo se ainda não tiver
    // conseguido carregá-las (critério 6).
    if (categoriasVaziasRef.current) carregarCategorias();
    carregarResumo();
    carregarPagina(1, { reiniciar: true });
  }, [carregarCategorias, carregarResumo, carregarPagina]);

  const renderItem = useCallback(({ item }) => {
    const estabelecimento = item.estabelecimento || 'Não identificado';
    const data = item.data ? formatarData(item.data) : 'Não identificado';
    const valor = item.valor !== null && item.valor !== undefined
      ? formatarMoeda(item.valor)
      : 'Não identificado';
    const nomeCategoria = categoriasPorId[item.categoriaId] || 'Não identificado';

    return (
      <Pressable
        onPress={() => router.push(`/comprovante/${item.id}`)}
        style={{
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#EEEEEE',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <IconeCategoria nome={categoriasPorId[item.categoriaId]} tamanho={52} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>
              {estabelecimento}
            </Text>
            <Text style={{ fontWeight: '700' }}>{valor}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: '#666666' }}>{data}</Text>
            <Text style={{ color: '#666666' }}>{nomeCategoria}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [categoriasPorId]);

  const cabecalho = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: cores.primaria,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {iniciaisNome(usuario?.nome)}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{usuario?.nome}</Text>
      </View>

      <Pressable
        onPress={() => router.push('/resumo')}
        style={{
          margin: 16,
          marginTop: 0,
          padding: 16,
          borderRadius: 10,
          backgroundColor: cores.primaria,
        }}
      >
        {resumoCarregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : resumoErro ? (
          <View>
            <Text style={{ color: '#FFFFFF' }}>{resumoErro}</Text>
            <Pressable onPress={carregarResumo} style={{ marginTop: 8 }}>
              <Text style={{ color: cores.destaque, fontWeight: '700' }}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={{ color: cores.destaque, fontWeight: '600' }}>Resumo do mês</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 4 }}>
              {formatarMoeda(resumo?.total ?? 0)}
            </Text>
            <Text style={{ color: '#FFFFFF', marginTop: 2 }}>
              {resumo?.quantidade ?? 0} comprovante(s)
            </Text>
          </>
        )}
      </Pressable>

      <View style={{ paddingHorizontal: 16 }}>
        <CampoTexto
          label="Buscar"
          placeholder="Estabelecimento ou observações"
          value={busca}
          onChangeText={setBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ paddingLeft: 16, marginBottom: 12 }}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <Chip
          titulo="Todas"
          selecionado={!categoriaId}
          onPress={() => setCategoriaId(null)}
        />
        {categorias.map((categoria) => (
          <Chip
            key={categoria.id}
            titulo={categoria.nome}
            selecionado={categoriaId === categoria.id}
            onPress={() => setCategoriaId(categoria.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const listaVazia = buscaAplicada || categoriaId
    ? <EstadoVazio texto="Nenhum comprovante encontrado." />
    : (
      <View style={{ alignItems: 'center' }}>
        <EstadoVazio texto="Você ainda não tem comprovantes." />
        <View style={{ paddingHorizontal: 24, width: '100%' }}>
          <Botao titulo="Adicionar comprovante" onPress={() => router.push('/captura')} />
        </View>
      </View>
    );

  // Carregando e erro aparecem no lugar dos itens, sem desmontar a FlatList:
  // assim o campo de busca e os chips (no cabeçalho) continuam na tela, com o
  // foco e a rolagem preservados, e dá para trocar o filtro depois de um erro.
  // No pull to refresh o próprio RefreshControl já indica o carregamento.
  let conteudoSemItens = listaVazia;
  if (carregandoInicial) {
    conteudoSemItens = atualizando ? null : <Carregando />;
  } else if (erroTela) {
    conteudoSemItens = <ErroConexao tentarNovamente={tentarDeNovoTela} mensagem={erroTela} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <FlatList
        data={comprovantes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={conteudoSemItens}
        ListFooterComponent={
          carregandoMais ? (
            <Carregando />
          ) : erroRodape ? (
            <Pressable onPress={tentarDeNovoRodape} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: cores.erro }}>
                {erroRodape} Tocar para tentar de novo.
              </Text>
            </Pressable>
          ) : null
        }
        onEndReached={carregarMais}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />
        }
      />

      <Pressable
        onPress={() => router.push('/captura')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: cores.primaria,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 24 }}>📷</Text>
      </Pressable>
    </View>
  );
}

function Chip({ titulo, selecionado, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: selecionado ? cores.primaria : '#EEEEEE',
        marginRight: 8,
      }}
    >
      <Text style={{ color: selecionado ? '#FFFFFF' : cores.texto }}>{titulo}</Text>
    </Pressable>
  );
}
