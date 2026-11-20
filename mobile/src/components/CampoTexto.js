import {
  Text,
  TextInput,
  View,
} from 'react-native';
import { cores } from '../theme';

export function CampoTexto({ label, erro, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        {...props}
        style={{
          borderWidth: 1,
          borderColor: erro ? cores.erro : '#AAAAAA',
          borderRadius: 6,
          padding: 12,
        }}
      />
      {erro ? (
        <Text style={{ color: cores.erro, marginTop: 4 }}>
          {erro}
        </Text>
      ) : null}
    </View>
  );
}
