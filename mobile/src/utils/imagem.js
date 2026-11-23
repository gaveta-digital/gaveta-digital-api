import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { QUALIDADE_JPEG, calcularRedimensionamento } from './envioComprovante';

function lerDimensoes(uri) {
  return new Promise((resolver, rejeitar) => {
    Image.getSize(uri, (width, height) => resolver({ width, height }), rejeitar);
  });
}

// Reduz e converte para JPEG. Além de economizar envio, a conversão resolve as
// fotos HEIC do iPhone, que a API recusaria (ela aceita só JPEG, PNG e WebP).
export async function prepararImagemParaEnvio({ uri, width, height }) {
  const dimensoes = width > 0 && height > 0 ? { width, height } : await lerDimensoes(uri);
  const tamanho = calcularRedimensionamento(dimensoes.width, dimensoes.height);

  const contexto = ImageManipulator.manipulate(uri);
  if (tamanho) contexto.resize(tamanho);

  const imagem = await contexto.renderAsync();
  const resultado = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: QUALIDADE_JPEG });

  return { uri: resultado.uri, width: resultado.width, height: resultado.height };
}
