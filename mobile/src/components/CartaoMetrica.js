import { Text } from 'react-native';
import { Cartao } from './Cartao';
import { cores, raios } from '../theme';
import { fontes } from '../theme/fontes';

// Cartão de métrica do Resumo do mês: rótulo em maiúsculas cinza e valor em
// destaque, em fonte monoespaçada (ex.: "TOTAL GASTO" / "R$ 274,80").
// Para dois cartões lado a lado, passe estilo={{ flex: 1 }} em cada um.
export function CartaoMetrica({ rotulo, valor, estilo }) {
  return (
    <Cartao raio={raios.cartao} preenchimento={18} estilo={estilo}>
      <Text
        style={{
          fontFamily: fontes.textoNegrito,
          fontSize: 12,
          lineHeight: 18,
          color: cores.textoSecundario,
        }}
      >
        {String(rotulo).toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: fontes.numero,
          fontSize: 20,
          lineHeight: 30,
          color: cores.primaria,
          marginTop: 6,
        }}
      >
        {valor}
      </Text>
    </Cartao>
  );
}
