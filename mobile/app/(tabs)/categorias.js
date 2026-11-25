import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { CabecalhoTela } from '../../src/components/CabecalhoTela';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Carregando } from '../../src/components/Carregando';
import { ErroConexao } from '../../src/components/ErroConexao';
import { EstadoVazio } from '../../src/components/EstadoVazio';
import { IconeCategoria } from '../../src/components/IconeCategoria';
import { Mensagem } from '../../src/components/Mensagem';
import { categoriaService } from '../../src/services/categoriaService';
import { cores, espacamentos, raios, sombras } from '../../src/theme';
import { normalizarNomeCategoria } from '../../src/theme/categorias';
import { fontes } from '../../src/theme/fontes';
import { mensagemDeErro } from '../../src/utils/erros';
import { validarCategoria } from '../../src/utils/validacoes';

export function isCategoriaPadrao(nome) {
  return normalizarNomeCategoria(nome) === 'outros';
}

function ItemCategoria({ item, onEditar, onExcluir }) {
  const padrao = isCategoriaPadrao(item.nome);

  return (
    <View style={estilos.cartaoItem}>
      <View style={estilos.infoCategoria}>
        <IconeCategoria nome={item.nome} tamanho={38} />
        <Text style={estilos.nomeCategoria} numberOfLines={1}>
          {item.nome}
        </Text>
      </View>

      {padrao ? (
        <View style={estilos.tagPadrao}>
          <Ionicons name="lock-closed-outline" size={16} color={cores.textoSecundario} />
          <Text style={estilos.textoPadrao}>Padrão</Text>
        </View>
      ) : (
        <View style={estilos.acoes}>
          <Pressable
            onPress={() => onEditar(item)}
            accessibilityRole="button"
            accessibilityLabel={`Editar categoria ${item.nome}`}
            hitSlop={6}
            style={({ pressed }) => [estilos.botaoAcao, estilos.botaoEditar, pressed && estilos.botaoPressionado]}
          >
            <Ionicons name="create-outline" size={18} color="#1565C0" />
          </Pressable>

          <Pressable
            onPress={() => onExcluir(item)}
            accessibilityRole="button"
            accessibilityLabel={`Excluir categoria ${item.nome}`}
            hitSlop={6}
            style={({ pressed }) => [estilos.botaoAcao, estilos.botaoExcluir, pressed && estilos.botaoPressionado]}
          >
            <Ionicons name="trash-outline" size={18} color={cores.perigo} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroConexao, setErroConexao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  // Modal "+ Nova categoria"
  const [modalCriarVisivel, setModalCriarVisivel] = useState(false);
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('');
  const [erroNovaCategoria, setErroNovaCategoria] = useState(null);
  const [carregandoCriar, setCarregandoCriar] = useState(false);

  // Modal "Editar categoria"
  const [categoriaParaEditar, setCategoriaParaEditar] = useState(null);
  const [nomeCategoriaEditada, setNomeCategoriaEditada] = useState('');
  const [erroEditarCategoria, setErroEditarCategoria] = useState(null);
  const [carregandoEditar, setCarregandoEditar] = useState(false);

  // Modal "Excluir categoria" (Confirmação)
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);
  const [carregandoExcluir, setCarregandoExcluir] = useState(false);

  // Modal "Não é possível excluir" (Erro 400 ao excluir)
  const [modalErroExcluirVisivel, setModalErroExcluirVisivel] = useState(false);

  // Auto-limpeza do toast de sucesso
  useEffect(() => {
    if (!mensagemSucesso) return;
    const timer = setTimeout(() => {
      setMensagemSucesso(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [mensagemSucesso]);

  const carregarCategorias = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }
    setErroConexao(false);

    try {
      const resposta = await categoriaService.listar();
      setCategorias(Array.isArray(resposta.data) ? resposta.data : []);
    } catch {
      setErroConexao(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarCategorias();
    }, [carregarCategorias])
  );

  const abrirModalCriar = () => {
    setNomeNovaCategoria('');
    setErroNovaCategoria(null);
    setModalCriarVisivel(true);
  };

  const fecharModalCriar = () => {
    if (carregandoCriar) return;
    setModalCriarVisivel(false);
    setNomeNovaCategoria('');
    setErroNovaCategoria(null);
  };

  const handleCriarCategoria = async () => {
    const erroValida = validarCategoria(nomeNovaCategoria);
    if (erroValida) {
      setErroNovaCategoria(erroValida);
      return;
    }

    setErroNovaCategoria(null);
    setCarregandoCriar(true);

    try {
      await categoriaService.criar({ nome: nomeNovaCategoria.trim() });
      fecharModalCriar();
      setMensagemSucesso('Categoria criada com sucesso!');
      await carregarCategorias();
    } catch (erro) {
      setErroNovaCategoria(mensagemDeErro(erro));
    } finally {
      setCarregandoCriar(false);
    }
  };

  const abrirModalEditar = (categoria) => {
    setCategoriaParaEditar(categoria);
    setNomeCategoriaEditada(categoria.nome);
    setErroEditarCategoria(null);
  };

  const fecharModalEditar = () => {
    if (carregandoEditar) return;
    setCategoriaParaEditar(null);
    setNomeCategoriaEditada('');
    setErroEditarCategoria(null);
  };

  const handleEditarCategoria = async () => {
    if (!categoriaParaEditar) return;

    const erroValida = validarCategoria(nomeCategoriaEditada);
    if (erroValida) {
      setErroEditarCategoria(erroValida);
      return;
    }

    setErroEditarCategoria(null);
    setCarregandoEditar(true);

    try {
      await categoriaService.atualizar(categoriaParaEditar.id, {
        nome: nomeCategoriaEditada.trim(),
      });
      fecharModalEditar();
      setMensagemSucesso('Categoria renomeada com sucesso!');
      await carregarCategorias();
    } catch (erro) {
      setErroEditarCategoria(mensagemDeErro(erro));
    } finally {
      setCarregandoEditar(false);
    }
  };

  const abrirModalExcluir = (categoria) => {
    setCategoriaParaExcluir(categoria);
  };

  const fecharModalExcluir = () => {
    if (carregandoExcluir) return;
    setCategoriaParaExcluir(null);
  };

  const handleExcluirCategoria = async () => {
    if (!categoriaParaExcluir) return;

    setCarregandoExcluir(true);

    try {
      await categoriaService.remover(categoriaParaExcluir.id);
      fecharModalExcluir();
      setMensagemSucesso('Categoria excluída com sucesso!');
      await carregarCategorias();
    } catch (erro) {
      fecharModalExcluir();
      const status = erro?.response?.status;
      if (status === 400) {
        setModalErroExcluirVisivel(true);
      } else {
        setMensagemSucesso(null);
      }
    } finally {
      setCarregandoExcluir(false);
    }
  };

  const fecharModalErroExcluir = () => {
    setModalErroExcluirVisivel(false);
  };

  return (
    <View style={estilos.container}>
      <CabecalhoTela
        titulo="Categorias"
        subtitulo="Organize seus tipos de despesa"
        variante="simples"
        acao={
          <Pressable
            onPress={abrirModalCriar}
            accessibilityRole="button"
            accessibilityLabel="Nova categoria"
            style={({ pressed }) => [estilos.botaoNovaCategoria, pressed && estilos.botaoPressionado]}
          >
            <Text style={estilos.textoNovaCategoria}>
              + Nova{'\n'}categoria
            </Text>
          </Pressable>
        }
      />

      <View style={estilos.conteudo}>
        {mensagemSucesso ? (
          <Mensagem texto={mensagemSucesso} tipo="sucesso" estilo={estilos.mensagemToast} />
        ) : null}

        {carregando ? (
          <Carregando />
        ) : erroConexao ? (
          <ErroConexao
            mensagem="Não foi possível carregar as categorias."
            tentarNovamente={() => carregarCategorias()}
          />
        ) : (
          <FlatList
            data={categorias}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemCategoria
                item={item}
                onEditar={abrirModalEditar}
                onExcluir={abrirModalExcluir}
              />
            )}
            contentContainerStyle={estilos.listaConteudo}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={() => carregarCategorias(true)}
                tintColor={cores.primaria}
                colors={[cores.primaria]}
              />
            }
            ListEmptyComponent={
              <EstadoVazio texto="Nenhuma categoria encontrada." />
            }
          />
        )}
      </View>

      {/* Modal: Nova Categoria */}
      <Modal
        visible={modalCriarVisivel}
        transparent
        animationType="fade"
        onRequestClose={fecharModalCriar}
      >
        <View style={estilos.overlay}>
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Nova categoria</Text>
            <CampoTexto
              label="NOME DA CATEGORIA"
              placeholder="Ex.: Saúde, Lazer..."
              value={nomeNovaCategoria}
              onChangeText={(texto) => {
                setNomeNovaCategoria(texto);
                if (erroNovaCategoria) setErroNovaCategoria(null);
              }}
              erro={erroNovaCategoria}
              autoCapitalize="words"
              maxLength={50}
              autoFocus
            />
            <View style={estilos.modalBotoes}>
              <Pressable
                onPress={fecharModalCriar}
                disabled={carregandoCriar}
                style={({ pressed }) => [
                  estilos.botaoModalSecundario,
                  pressed && estilos.botaoPressionado,
                ]}
              >
                <Text style={estilos.textoModalSecundario}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleCriarCategoria}
                disabled={carregandoCriar}
                style={({ pressed }) => [
                  estilos.botaoModalPrimario,
                  pressed && estilos.botaoPressionado,
                  carregandoCriar && estilos.botaoDesabilitado,
                ]}
              >
                {carregandoCriar ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={estilos.textoModalPrimario}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Editar Categoria */}
      <Modal
        visible={Boolean(categoriaParaEditar)}
        transparent
        animationType="fade"
        onRequestClose={fecharModalEditar}
      >
        <View style={estilos.overlay}>
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Editar categoria</Text>
            <CampoTexto
              label="NOME DA CATEGORIA"
              value={nomeCategoriaEditada}
              onChangeText={(texto) => {
                setNomeCategoriaEditada(texto);
                if (erroEditarCategoria) setErroEditarCategoria(null);
              }}
              erro={erroEditarCategoria}
              autoCapitalize="words"
              maxLength={50}
              autoFocus
            />
            <View style={estilos.modalBotoes}>
              <Pressable
                onPress={fecharModalEditar}
                disabled={carregandoEditar}
                style={({ pressed }) => [
                  estilos.botaoModalSecundario,
                  pressed && estilos.botaoPressionado,
                ]}
              >
                <Text style={estilos.textoModalSecundario}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleEditarCategoria}
                disabled={carregandoEditar}
                style={({ pressed }) => [
                  estilos.botaoModalPrimario,
                  pressed && estilos.botaoPressionado,
                  carregandoEditar && estilos.botaoDesabilitado,
                ]}
              >
                {carregandoEditar ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={estilos.textoModalPrimario}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Excluir Categoria (Confirmação) */}
      <Modal
        visible={Boolean(categoriaParaExcluir)}
        transparent
        animationType="fade"
        onRequestClose={fecharModalExcluir}
      >
        <View style={estilos.overlay}>
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTituloDestruir}>
              Excluir categoria &quot;{categoriaParaExcluir?.nome}&quot;?
            </Text>
            <Text style={estilos.modalSubtituloDestruir}>
              Esta ação não poderá ser desfeita.
            </Text>
            <View style={estilos.modalBotoes}>
              <Pressable
                onPress={fecharModalExcluir}
                disabled={carregandoExcluir}
                style={({ pressed }) => [
                  estilos.botaoModalSecundario,
                  pressed && estilos.botaoPressionado,
                ]}
              >
                <Text style={estilos.textoModalSecundario}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleExcluirCategoria}
                disabled={carregandoExcluir}
                style={({ pressed }) => [
                  estilos.botaoModalPerigo,
                  pressed && estilos.botaoPressionado,
                  carregandoExcluir && estilos.botaoDesabilitado,
                ]}
              >
                {carregandoExcluir ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={estilos.textoModalPrimario}>Excluir</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Não é possível excluir (Erro 400) */}
      <Modal
        visible={modalErroExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={fecharModalErroExcluir}
      >
        <View style={estilos.overlay}>
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTituloNaoPossivel}>Não é possível excluir</Text>
            <View style={estilos.caixaErroExcluir}>
              <Text style={estilos.textoErroExcluir}>
                Não é possível excluir: existem comprovantes nesta categoria.
              </Text>
            </View>
            <Pressable
              onPress={fecharModalErroExcluir}
              style={({ pressed }) => [
                estilos.botaoModalEntendi,
                pressed && estilos.botaoPressionado,
              ]}
            >
              <Text style={estilos.textoModalPrimario}>Entendi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundoTela,
  },
  conteudo: {
    flex: 1,
  },
  mensagemToast: {
    marginHorizontal: espacamentos.lg,
    marginTop: espacamentos.sm,
  },
  listaConteudo: {
    paddingHorizontal: espacamentos.lg,
    paddingTop: espacamentos.lg,
    paddingBottom: espacamentos.xxl,
  },
  botaoNovaCategoria: {
    backgroundColor: cores.sucesso,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: raios.botaoIcone,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombras.leve,
  },
  textoNovaCategoria: {
    fontFamily: fontes.titulo,
    fontSize: 13,
    lineHeight: 17,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cartaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cores.cartao,
    borderRadius: raios.cartaoItem,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
    ...sombras.item,
  },
  infoCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  nomeCategoria: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    lineHeight: 24,
    color: cores.textoPrincipal,
    flex: 1,
  },
  tagPadrao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoPadrao: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.textoSecundario,
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botaoAcao: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  botaoEditar: {
    backgroundColor: cores.campoFundo,
    borderColor: cores.borda,
  },
  botaoExcluir: {
    backgroundColor: cores.perigoFundo,
    borderColor: cores.perigoBorda,
  },
  botaoPressionado: {
    opacity: 0.8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: cores.cartao,
    borderRadius: 20,
    padding: 24,
    ...sombras.destaque,
  },
  modalTitulo: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    lineHeight: 30,
    color: cores.primaria,
    marginBottom: 18,
  },
  modalTituloDestruir: {
    fontFamily: fontes.titulo,
    fontSize: 19,
    lineHeight: 28,
    color: cores.textoPrincipal,
    marginBottom: 8,
  },
  modalSubtituloDestruir: {
    fontFamily: fontes.texto,
    fontSize: 14,
    lineHeight: 21,
    color: cores.textoFiltro,
    marginBottom: 20,
  },
  modalTituloNaoPossivel: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    lineHeight: 30,
    color: cores.perigo,
    marginBottom: 16,
  },
  caixaErroExcluir: {
    backgroundColor: cores.perigoFundo,
    borderWidth: 1,
    borderColor: cores.perigoBorda,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  textoErroExcluir: {
    fontFamily: fontes.textoNegrito,
    fontSize: 14,
    lineHeight: 20,
    color: cores.erroTexto,
  },
  modalBotoes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  botaoModalSecundario: {
    flex: 1,
    minHeight: 48,
    borderRadius: raios.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoModalSecundario: {
    fontFamily: fontes.titulo,
    fontSize: 15,
    color: cores.textoCorpo,
  },
  botaoModalPrimario: {
    flex: 1,
    minHeight: 48,
    borderRadius: raios.pilula,
    backgroundColor: cores.sucesso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoModalPerigo: {
    flex: 1,
    minHeight: 48,
    borderRadius: raios.pilula,
    backgroundColor: cores.perigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoModalEntendi: {
    width: '100%',
    minHeight: 48,
    borderRadius: raios.pilula,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoModalPrimario: {
    fontFamily: fontes.titulo,
    fontSize: 15,
    color: '#FFFFFF',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
});
