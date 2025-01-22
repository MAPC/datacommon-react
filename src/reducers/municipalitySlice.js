import { createSlice } from "@reduxjs/toolkit";
import colors from "../constants/colors";
import municipalities from "../assets/data/ma-munis.json";
console.log(municipalities)
const initialState = {
  cache: municipalities.features.reduce(
    (cache, feature) =>
      Object.assign({}, cache, {
        [feature.properties.town.toLowerCase().replace(" ", "-")]: feature,
      }),
    {}
  ),
  searchable: municipalities.features.reduce(
    (a, b) => a.concat(b.properties.town.toLowerCase()),
    []
  ),
  geojson: municipalities,
}
const municipalitySlice = createSlice({
  name: "municipality",
  initialState,
  reducers: {
    fillPoly: (state,action) =>{
        const newGeojson =  JSON.parse(JSON.stringify(state.geojson))
        newGeojson.features.some((feature) => {
            if (feature.properties.town.toLowerCase() === action.payload) {
              return (feature.properties.fillColor = colors.BRAND.PRIMARY) || true;
            }
          });
        state.geojson = newGeojson;
    },
    emptyPoly: (state) =>{
        state.geojson = initialState.geojson
    }
  }
})

export const { fillPoly, emptyPoly } = municipalitySlice.actions;
export default municipalitySlice.reducer;
