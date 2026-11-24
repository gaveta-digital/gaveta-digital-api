import Svg, { Rect } from 'react-native-svg';
import { cores } from '../theme';

// Marca do Gaveta Digital (3 barras arredondadas) conforme o frame "Tela 1 - Login" do Figma.
export function LogoMarca({ tamanho = 64 }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 64 64" accessible={false}>
      <Rect x={14} y={16} width={36} height={6} rx={3} fill="#FFFFFF" />
      <Rect x={14} y={29} width={26} height={6} rx={3} fill={cores.destaque} />
      <Rect x={14} y={42} width={18} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.55} />
    </Svg>
  );
}
