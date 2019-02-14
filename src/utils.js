export const getType = item => Object.prototype.toString.call(item).slice(8, -1);

export const isJSON = string => {
  let json;
  try {
    json = JSON.parse(string);
    if (getType(json) !== 'Object') {
      return { result: false };
    }
  } catch (e) {
    return { result: false };
  }
  return { result: true, json };
};

export const handleError = (...args) => console.error.apply(console, args);
