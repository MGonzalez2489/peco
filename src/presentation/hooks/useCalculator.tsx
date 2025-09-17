import { useRef, useState } from 'react';

enum Operator {
  add,
  subtract,
  multiply,
  divide,
}

export const useCalculator = () => {
  const [number, setNumber] = useState('0');
  const [total, setTotal] = useState(0);
  const [prevNuber, setPrevNumber] = useState('0');
  const lastOperation = useRef<Operator>();

  const buildNumber = (numberString: string) => {
    if (number.includes('.') && numberString === '.') {
      return;
    }

    //
    if (number.startsWith('0') || number.startsWith('-0')) {
      if (numberString === '.') {
        return setNumber(number + numberString);
      }

      //if is double cero without decimal point
      if (numberString === '0' && number.includes('.')) {
        return setNumber(number + numberString);
      }

      //
      if (numberString !== '0' && !number.includes('.')) {
        return setNumber(numberString);
      }

      if (numberString === '0' && !number.includes('.')) {
        return;
      }
      return setNumber(number + numberString);
    }

    return setNumber(number + numberString);
  };

  const deleteLastDigit = () => {
    if (number.length > 1) {
      return setNumber(number.substring(0, number.length - 1));
    } else {
      return setNumber('0');
    }
  };
  const toggleSign = () => {
    if (number.includes('-')) {
      return setNumber(number.replace('-', ''));
    }
    setNumber('-' + number);
  };
  const clearAll = () => {
    setNumber('0');
    setTotal(0);
    setPrevNumber('0');
  };

  const setLastNumber = () => {
    if (number.endsWith('.')) {
      setPrevNumber(number.slice(0, -1));
    } else {
      setPrevNumber(number);
    }

    setNumber('0');
  };

  const divideOperation = () => {
    setLastNumber();
    lastOperation.current = Operator.divide;
  };
  const multiplyOperation = () => {
    setLastNumber();
    lastOperation.current = Operator.multiply;
  };

  const subtractOperation = () => {
    setLastNumber();
    lastOperation.current = Operator.subtract;
  };

  const addOperation = () => {
    setLastNumber();
    lastOperation.current = Operator.add;
  };

  const calcResult = () => {
    const num1 = Number(number);
    const num2 = Number(prevNuber);
    switch (lastOperation.current) {
      case Operator.add:
        setNumber(`${num1 + num2}`);
        break;
      case Operator.subtract:
        setNumber(`${num2 - num1}`);
        break;
      case Operator.multiply:
        setNumber(`${num1 * num2}`);
        break;
      case Operator.divide:
        setNumber(`${num2 / num1}`);
        break;

      default:
        throw new Error('Not found operation');
    }
    setPrevNumber('0');
  };

  return {
    //properties
    number,
    total,
    prevNuber,
    //methods
    buildNumber,
    toggleSign,
    clearAll,
    deleteLastDigit,
    divideOperation,
    multiplyOperation,
    subtractOperation,
    addOperation,
    calcResult,
  };
};
