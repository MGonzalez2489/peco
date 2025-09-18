import { COLORS } from '@styles/colors';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  errorMsg?: string;
  LeftIcon?: LucideIcon;
  RightIcon?: LucideIcon;
}

export const InputText = ({
  label,
  errorMsg,
  LeftIcon,
  RightIcon,
  style: externalStyle,
  ...rest
}: Props) => {
  const inputPaddingStyle = {
    paddingLeft: LeftIcon ? 45 : 15, // 15 (padding base) + 30 (espacio para ícono)
    paddingRight: RightIcon ? 45 : 15,
  };
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, errorMsg && styles.inputError]}>
        {/* Ícono Izquierdo */}
        {LeftIcon && (
          <View style={styles.leftIconContainer}>
            {/* Clonamos el ícono para asegurar que se puede renderizar y que tenga un tamaño/color por defecto */}
            <LeftIcon size={20} color="#999" />
            {/* {React.cloneElement(LeftIcon, { */}
            {/*   size: LeftIcon.props.size || 20, */}
            {/*   color: LeftIcon.props.color || '#999', */}
            {/* })} */}
          </View>
        )}

        {/* Input Principal */}
        <TextInput
          style={[
            styles.input,
            inputPaddingStyle, // Aplicamos el padding dinámico
            externalStyle, // Aplicamos el estilo que venga de fuera (si existe)
          ]}
          placeholderTextColor="#A0A0A0"
          {...rest}
        />

        {/* Ícono Derecho */}
        {RightIcon && (
          <View style={styles.rightIconContainer}>
            <RightIcon size={20} color="#999" />
            {/* {React.cloneElement(rightIcon, { */}
            {/*   size: rightIcon.props.size || 20, */}
            {/*   color: rightIcon.props.color || '#999', */}
            {/* })} */}
          </View>
        )}
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 5,
  },
  label: {
    marginBottom: 5,
    // Asegúrate de definir COLORS.text
    // color: COLORS.text,
    color: '#333', // Usamos un color por defecto si COLORS no está definido aquí
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    // Asegúrate de definir COLORS.background
    backgroundColor: COLORS.background,
    // backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden', // Mantiene los elementos dentro de los bordes
  },
  input: {
    flex: 1, // Permite que el TextInput ocupe el espacio restante
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    // Quitamos el border y el backgroundColor, ya están en inputWrapper
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: 'red',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 10,
    zIndex: 1, // Asegura que el ícono esté sobre el input
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // Opcional: Añado un poco de margen para separación visual si es necesario
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
