export const objToQueryString = (obj: Record<string, any>): string => {
  const keyValuePairs: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Exclude undefined and null values
      if (value !== undefined && value !== null) {
        keyValuePairs.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        );
      }
    }
  }

  return keyValuePairs.join("&");
};

// export const objToQueryString = (obj) => {
//   const keyValuePairs = [];
//   for (const key in obj) {
//     keyValuePairs.push(
//       encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]),
//     );
//   }
//   return keyValuePairs.join("&");
// };
