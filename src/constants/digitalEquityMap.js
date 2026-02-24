/** ArcGIS Digital Equity Vector Tile Server. Token required. */
export const DIGITAL_EQUITY_VECTOR_TILE_SERVER =
  'https://vectortileservices.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/digital_equity/VectorTileServer';

/** ArcGIS Digital Equity Feature Server (for GeoJSON query when using Leaflet). Same service as vector tiles. */
export const DIGITAL_EQUITY_FEATURE_SERVER =
  'https://vectortileservices.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/digital_equity/FeatureServer/0';

export const ARCGIS_TOKEN =
  'AAPTxy8BH1VEsoebNVZXo8HurFEryhzMUuo6HFsZYNxtvAILm5qQYklTujgW8rejiSVEA_kTru4Y7QuNe5-QWMtEpK-_L9TLSHlHV4h_oeYUONaR40fn8mVNBCPvWBSuheHtx9FPMu5xWNxz4gqnZ-TPnErmJVpoN7thS4Zj2QiLg12SqmtHyaMnnYJH5AwdRA1VAFZLZrfwWTLw4zLogHqqonCw58CKKRJS4rqd-UgsAO8.AT1_U0702ST1';

/** Map variable display name -> vector tile attribute name (percentage fields). */
export const VARIABLE_TO_FIELD = {
  'Percent Internet Subscription with Broadband such as cable - fiber optic - or DSL': 'bbfib_p',
  'Percent Internet Subscription with Broadband of any type': 'bbint_p',
  'Percent Internet Subscription with Broadband of any type & Cellular data plan': 'cdpint_p',
  'Percent Internet Subscription with Cellular data plan only': 'cdpinto_p',
  'Percent Has one or more types of computing devices': 'cmp_p',
  'Percent Internet Subscription with dial-up only': 'dialo_p',
  'Percent Has one or more types of computing devices: Desktop or Laptop': 'dplp_p',
  'Percent Has one or more types of computing devices: Desktop or Laptop only': 'dplpo_p',
  'Percent Households with Internet Subscription of any type': 'int_p',
  'Percent Has one or more types of computing devices: Smartphone': 'mobl_p',
  'Percent Has one or more types of computing devices: Smartphone Only': 'moblo_p',
  'Percent Household has no computer devices': 'nocmp_p',
  'Percent Household has no internet': 'noint_p',
  'Percent Household has other kind of computer devices': 'othcmp_p',
  'Percent Household has other kind of computer devices only': 'othcmpo_p',
  'Percent Internet Subscription with other type': 'satint_p',
};

/** Field name -> margin of error (percent) field name in tiles. Some use *_mp, some *_moe. */
export const FIELD_TO_MOE = {
  bbfib_p: 'bbfib_moe',
  bbint_p: 'bbint_moe',
  cdpint_p: 'cdpint_moe',
  cdpinto_p: 'cdpinto_moe',
  cmp_p: 'cmp_moe',
  dialo_p: 'dialo_moe',
  dplp_p: 'dplp_moe',
  dplpo_p: 'dplpo_moe',
  int_p: 'int_moe',
  mobl_p: 'mobl_moe',
  moblo_p: 'moblo_mp',   // Smartphone Only - margin of error percent
  nocmp_p: 'nocmp_mp',   // Household has no computer devices - margin of error percent
  noint_p: 'noint_mp',   // Household has no internet - margin of error percent
  othcmp_p: 'othcmp_moe',
  othcmpo_p: 'othcmpo_moe',
  satint_p: 'satint_moe',
};
