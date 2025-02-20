import xml2js from 'xml2js';

/**
 * Transforms XML node into clean JSON structure
 * @param {Object} node - XML node to transform
 * @returns {Object|Array|string} Transformed node
 */
const transformXmlNode = (node) => {
  // Handle arrays
  if (Array.isArray(node)) {
    return node.length === 1 
      ? transformXmlNode(node[0]) 
      : node.map(transformXmlNode);
  }

  // Handle objects
  if (typeof node === 'object' && node !== null) {
    return transformXmlObject(node);
  }

  // Return primitive values as-is
  return node;
};

/**
 * Transforms XML object properties
 * @param {Object} obj - XML object to transform
 * @returns {Object} Transformed object
 */
const transformXmlObject = (obj) => {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    switch(key) {
      case '$':
        // Merge attributes into parent
        Object.assign(result, value);
        break;
      case '_':
        // Return text content directly
        return value;
      default:
        // Transform nested elements
        result[key] = transformXmlNode(value);
    }
  }

  return result;
};

/**
 * Parses XML string into clean JSON structure
 * @param {string} xml - XML string to parse
 * @returns {Promise<Object>} Parsed and transformed XML
 */
export const parseXml = (xml) => {
  return new Promise((resolve, reject) => {
    if (!xml) {
      reject(new Error('No XML provided'));
      return;
    }

    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(new Error(`Failed to parse XML: ${err.message}`));
        return;
      }
      
      try {
        const transformed = transformXmlNode(result);
        resolve(transformed);
      } catch (error) {
        reject(new Error(`Failed to transform XML: ${error.message}`));
      }
    });
  });
};

/**
 * Extracts metadata fields from XML structure
 * @param {Object} metadata - Parsed metadata object
 * @param {Array<string>} validColumns - List of valid column names
 * @returns {Array<Object>} Extracted and filtered metadata
 */
export const extractMetadataFields = (metadata, validColumns) => {
  if (!metadata?.eainfo?.detailed?.attr) {
    return [];
  }

  return metadata.eainfo.detailed.attr
    .map(attribute => ({
      name: attribute.attrlabl,
      alias: attribute.attalias,
      definition: attribute.attrdef || '',
      type: attribute.attrtype || ''
    }))
    .filter(header => validColumns.includes(header.name))
    .filter(header => header.name.toLowerCase() !== 'shape');
};

/**
 * Gets description from metadata
 * @param {Object} metadata - Parsed metadata object
 * @returns {string} Description or empty string
 */
export const getMetadataDescription = (metadata) => {
  return metadata?.dataIdInfo?.idPurp || '';
};

export default {
  parseXml,
  extractMetadataFields,
  getMetadataDescription
};