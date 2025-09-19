import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { COLORS } from '@styles/colors';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  value: number | null | undefined;
  errorMsg?: string;
  LeftIcon?: LucideIcon;
  RightIcon?: LucideIcon;
  onChangeText: (value: number | null) => void;
}

/**
 * Limpia el texto de entrada, permitiendo solo números, un punto decimal y un signo negativo
 * en la posición inicial. Retorna la cadena limpia para la visualización.
 */
const cleanNumericInput = (text: string): string => {
  // Si la entrada es nula o indefinida, devolvemos cadena vacía.
  if (!text) return '';

  let cleanedText = text.replace(',', '.'); // Permite comas como decimales

  // 1. Verificar el signo negativo inicial y aislarlo.
  const hasInitialMinus = cleanedText.startsWith('-');
  if (hasInitialMinus) {
    // Removemos el '-' inicial para la limpieza general
    cleanedText = cleanedText.substring(1);
  }

  // 2. Eliminar todos los caracteres que NO sean números ni el punto decimal.
  cleanedText = cleanedText.replace(/[^0-9.]/g, '');

  // 3. Limitar a un solo punto decimal.
  const parts = cleanedText.split('.');
  if (parts.length > 2) {
    // Mantenemos el número, el punto, y la segunda parte (sin otros puntos)
    cleanedText = parts[0] + '.' + parts.slice(1).join('');
  }

  // 4. PRESERVAR EL SIGNO NEGATIVO: Reinsertar el '-' si existía.
  if (hasInitialMinus) {
    // EXCEPCIÓN: Si el usuario escribe solo '-' y luego cualquier cosa que se limpia a '',
    // queremos que el input siga siendo '-'.
    if (cleanedText === '' && text.includes('-')) {
      return '-';
    }
    return '-' + cleanedText;
  }

  return cleanedText;
};

export const InputNumber = ({
  label,
  value,
  errorMsg,
  LeftIcon,
  RightIcon,
  style: externalStyle,
  onChangeText,
  ...rest
}: Props) => {
  // Valor de la prop convertido a string (lo que Formik tiene)
  const stringValue = value !== null && value !== undefined ? String(value) : '';

  // Estado local para la edición del usuario (el texto que está escribiendo)
  const [tempValue, setTempValue] = useState(stringValue);

  // Sincronización inteligente: Solo si la prop externa cambia y no coincide con la edición actual
  useEffect(() => {
    if (stringValue !== tempValue) {
      setTempValue(stringValue);
    }
  }, [stringValue]);

  const stableHandleOnChange = (text: string) => {
    const cleanedText = cleanNumericInput(text);

    // 1. Actualiza el estado local (Lo que el usuario ve)
    setTempValue(cleanedText);

    // 2. Lógica para enviar el valor al componente padre (Formik)

    // Caso A: Si el input está vacío, enviamos null
    if (cleanedText === '') {
      onChangeText(null);
      return;
    }

    // 🚨 Caso B: Si es un número INCOMPLETO ('-' o termina en '.'),
    // NO actualizamos el padre (return). Dejamos que el estado local maneje la visualización.
    if (cleanedText === '-' || cleanedText.endsWith('.')) {
      return;
    }

    // Caso C: Es un número completo (ej: -10, 5.5, 0)
    const numericValue = parseFloat(cleanedText);

    // Si es un número válido
    if (!isNaN(numericValue)) {
      onChangeText(numericValue);
    } else {
      onChangeText(null);
    }
  };

  const inputPaddingStyle = {
    paddingLeft: LeftIcon ? 45 : 15,
    paddingRight: RightIcon ? 45 : 15,
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, errorMsg && styles.inputError]}>
        {LeftIcon && (
          <View style={styles.leftIconContainer}>
            <LeftIcon size={20} color="#999" />
          </View>
        )}

        <TextInput
          style={[styles.input, inputPaddingStyle, externalStyle]}
          value={tempValue}
          onChangeText={stableHandleOnChange}
          // Clave para permitir el signo negativo
          keyboardType="numbers-and-punctuation"
          placeholderTextColor="#A0A0A0"
          {...rest}
        />

        {RightIcon && (
          <View style={styles.rightIconContainer}>
            <RightIcon size={20} color="#999" />
          </View>
        )}
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

// --- Estilos (Sin Cambios Relevantes) ---
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 5,
  },
  label: {
    marginBottom: 5,
    color: '#333',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: 'red',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    position: 'absolute',
    right: 10,
    zIndex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    marginTop: -8,
    marginBottom: 10,
    fontSize: 13,
  },
});
