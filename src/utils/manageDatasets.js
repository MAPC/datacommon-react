/**
 * Filters the given list of datasets based on the filtering criteria provided. Returns a new list of filtered data
 * 
 * @param {object} options The argument passed to the function. An object with several fields
 * @param {list} options.datasets The base list of datasets to filter
 * @param {list[string]} options.sources The list of sources. Datasets containing any source from the list will be included
 * @param {list[string]} options.categories The list of categories (menu1s). Datasets with any of the categories will be included
 * @param {list[string]} options.subcategories The list of subcategories (menu2s). Datasets with any of the sub-cats will be included
 * @param {string} options.searchQuery The search query the user searched for. Will be broken into individual terms. matches table_name and dataset name
 * @param {boolean} options.shouldRemoveDupes Whether to remove datasets that share the same table_name from the return list
 * @returns A filtered list of dataset using all the filtering criteria provided
 */
export function filterDatasets({
  datasets = [],
  sources = [],
  categories = [],
  subcategories = [],
  searchQuery = '',
  shouldRemoveDupes = true,
}) {
  let filtered = datasets || [];

  // check if any source in the dataset is a selected source
  // datasets with multiple sources are separated with '; '
  if (sources.length > 0) {
    filtered = filtered.filter(d => {
      return d.source && d.source.split('; ').some(source => sources.includes(source));
    });
  }

  // check if the category or subcategory match for each dataset
  if (categories.length > 0 || subcategories.length > 0) {
    filtered = filtered.filter(d => categories.includes(d.menu1) || subcategories.includes(d.menu2));
  }

  if (searchQuery.trim()) {
    // break query into individual tokens, filter empty tokens, escape special characters
    const query = searchQuery.trim();
    const searchTokens = query.split(" ").filter(st => !!st).map(st => st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    filtered = filtered.filter((dataset) => {
      const tableName = dataset.table_name || '';
      const datasetName = dataset.menu3 || '';

      const tableNameMatch = searchTokens.some(searchTerm => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return searchRegex.test(tableName);
      });

      const datasetNameMatch = searchTokens.some(searchTerm => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return searchRegex.test(datasetName);
      });

      return tableNameMatch || datasetNameMatch;
    });
  }

  // remove the duplicate datasets using table_name to identify duplicates
  // only if the user passes the shouldRemoveDupes flag
  const dupesRemoved = [];
  if (shouldRemoveDupes) {
    const seenDatasets = new Set();
    filtered.forEach(dataset => {
      if (!seenDatasets.has(dataset.table_name)) {
        dupesRemoved.push(dataset);
        seenDatasets.add(dataset.table_name);
      }
    });
  }
  filtered = shouldRemoveDupes ? dupesRemoved : filtered;

  return filtered;
}


/**
 * Creates and returns an object containing a mapping of dataset ids to the highlighted text in each dataset. 
 * 
 * @param {object} options The argument passed to the function. An object with several fields
 * @param {list} options.datasets A list of dataset to set the highlighted text for.
 * @param {string} options.searchQuery The base query string the user is searching for. Used to find matches
 * 
 * @returns A map of dataset ids to the highlighted indices of text for those datasets.
 *          Highlights in the list for a dataset id are tagged with a key of 'table_name' or 'menu3'.
 */
export function highlightDatasets({ datasets = [], searchQuery = '' }) {
  const highlights = {};

  if (searchQuery.trim()) {
    // break query into individual tokens, filter empty tokens, escape special characters
    const query = searchQuery.trim();
    let searchTokens = query.split(" ").filter(st => !!st).map(st => st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    searchTokens = [...new Set(searchTokens)];

    datasets.forEach(dataset => {
      const tableName = dataset.table_name || '';
      const datasetName = dataset.menu3 || '';

      const tableNameMatch = searchTokens.some(searchTerm => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return searchRegex.test(tableName);
      });

      const datasetNameMatch = searchTokens.some(searchTerm => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return searchRegex.test(datasetName);
      });

      // manage the highlights
      if (tableNameMatch || datasetNameMatch) {
        const datasetId = dataset.seq_id || dataset.id;
        highlights[datasetId] = [];
        
        if (tableNameMatch) {
          searchTokens.forEach(searchTerm => {
            const highlightRegex = new RegExp(searchTerm, 'gi');
            tableName.replace(highlightRegex, (matched, offset) => {
              const alreadyMatched = highlights[datasetId].find(hl => hl.key == 'table_name' && hl.indices.find(i => i[0] == offset));
              if (!alreadyMatched) {
                highlights[datasetId].push({
                  key: 'table_name',
                  indices: [[offset, offset + matched.length - 1]]
                });
              }
            });
          });
        }
        
        if (datasetNameMatch) {
          searchTokens.forEach(searchTerm => {
            const highlightRegex = new RegExp(searchTerm, 'gi');
            datasetName.replace(highlightRegex, (matched, offset) => {
              const alreadyMatched = highlights[datasetId].find(hl => hl.key == 'menu3' && hl.indices.find(i => i[0] == offset));
              if (!alreadyMatched) {
                highlights[datasetId].push({
                  key: 'menu3',
                  indices: [[offset, offset + matched.length - 1]]
                });
              }
            });
          });
        }
      }
    });
  }

  return highlights;
}


/**
 * Sorts the given datasets based on the criteria provided. Returns a new list, doesn't mutate the given datasets. 
 * 
 * @param {object} options The argument passed to the function. An object with several fields
 * @param {list} options.datasets The list of datasets to sort
 * @param {string} options.sortOrder The way to sort the datasets. One of: 'Relevance', 'A to Z', 'Z to A', 'Oldest First', or 'Newest First'
 * @param {string} options.searchQuery The base query the user has searched for. Only used when sortOrder is 'Relevance'
 * @returns A sorted list of datasets based on the sort criteria provided
 */
export function sortDatasets({ datasets = [], sortOrder = 'Relevance', searchQuery = ''}) {
  const sorted = [...datasets]; // create copy since sorting mutates
  
  let sortType = sortOrder;
  // default from relevance to A -> Z if no search
  const trimmedSearch = searchQuery.trim();
  if (!trimmedSearch && sortType === 'Relevance') {
    sortType = 'A to Z';
  }
  
  switch (sortType) {
    case 'Relevance':
      const searchTokens = trimmedSearch.split(" ").filter(st => !!st).map(st => st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      // Count number to table_name and dataset name (menu3) matches
      // prioritize higher number of matches and earlier avg index of terms
      return sorted.sort((a, b) => {
        const datasetNameA = a.menu3 || '';
        const tableNameA = a.table_name || '';
        let nameMatchesA = 0;
        let totalNameIdxA = 0;
        let tableMatchesA = 0;

        const datasetNameB = b.menu3 || '';
        const tableNameB = b.table_name || '';
        let nameMatchesB = 0;
        let totalNameIdxB = 0;
        let tableMatchesB = 0;
        searchTokens.forEach(searchTerm => {
          const searchRegex = new RegExp(searchTerm, 'i');
          const nameMatchA = searchRegex.exec(datasetNameA);
          if (nameMatchA) {
            nameMatchesA++;
            totalNameIdxA += nameMatchA.index;
          }
          const tableMatchA = searchRegex.exec(tableNameA);
          if (tableMatchA) {
            tableMatchesA++;
          }
          const nameMatchB = searchRegex.exec(datasetNameB);
          if (nameMatchB) {
            nameMatchesB++;
            totalNameIdxB += nameMatchB.index;
          }
          const tableMatchB = searchRegex.exec(tableNameB);
          if (tableMatchB) {
            tableMatchesB++;
          }
        });
        const avgNameIdxA = nameMatchesA ? (totalNameIdxA / nameMatchesA) : datasetNameA.length;
        const avgNameIdxB = nameMatchesB ? (totalNameIdxB / nameMatchesB) : datasetNameB.length;

        if (nameMatchesA != nameMatchesB) {
          return nameMatchesB - nameMatchesA;
        } else if (tableMatchesA != tableMatchesB) {
          return tableMatchesB - tableMatchesA;
        } else {
          return avgNameIdxA - avgNameIdxB; // earlier avg index is better
        }
      });
    case 'A to Z':
      return sorted.sort((a, b) => (a.menu3 || '').localeCompare(b.menu3 || ''));
    case 'Z to A':
      return sorted.sort((a, b) => (b.menu3 || '').localeCompare(a.menu3 || ''));
    case 'Newest First':
      return sorted.sort((a, b) => {
        const keyA = parseUpdatedForSort(a.updated);
        const keyB = parseUpdatedForSort(b.updated);
        return keyB.localeCompare(keyA);
      });
    case 'Oldest First':
      return sorted.sort((a, b) => {
        const keyA = parseUpdatedForSort(a.updated);
        const keyB = parseUpdatedForSort(b.updated);
        return keyA.localeCompare(keyB);
      });
    default:
      return sorted;
  }
}