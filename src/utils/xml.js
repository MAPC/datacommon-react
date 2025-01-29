import xml2js from 'xml2js';

export const transformXmlResult = (obj) => {
    if (Array.isArray(obj)) {
      // If array has only one element, return that element transformed
      if (obj.length === 1) {
        return transformXmlResult(obj[0]);
      }
      // Otherwise transform each element
      return obj.map(item => transformXmlResult(item));
    } else if (typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (key === '$') {
          // Handle attributes
          Object.assign(result, obj[key]);
        } else if (key === '_') {
          // Handle text content
          return obj[key];
        } else {
          result[key] = transformXmlResult(obj[key]);
        }
      }
      return result;
    }
    return obj;
  }

export const parseXml = (xml) => {
  function transformXmlResult(obj) {
    if (Array.isArray(obj)) {
      // If array has only one element, return that element transformed
      if (obj.length === 1) {
        return transformXmlResult(obj[0]);
      }
      // Otherwise transform each element
      return obj.map(item => transformXmlResult(item));
    } else if (typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (key === '$') {
          // Handle attributes
          Object.assign(result, obj[key]);
        } else if (key === '_') {
          // Handle text content
          return obj[key];
        } else {
          result[key] = transformXmlResult(obj[key]);
        }
      }
      return result;
    }
    return obj;
  }

  // Parse XML string using xml2js first
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(transformXmlResult(result));
    });
  });
};