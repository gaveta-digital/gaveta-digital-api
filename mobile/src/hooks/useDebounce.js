import { useEffect, useState } from 'react';

export function useDebounce(valor, espera = 400) {
  const [valorComEspera, setValorComEspera] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorComEspera(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);

  return valorComEspera;
}
