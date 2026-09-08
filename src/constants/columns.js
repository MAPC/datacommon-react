// TODO: maybe this should exist in the metadata? But it would be very manual either way. 
export const unformattedColumns = [
  // year columns:
  "fy_year", "fiscal_yr", "fy", "acs_year", "year", "dec_year", "cal_year", "schoolyear", "adj_year", "years",
  "data_year", "yr_qtr", "ls_date", "quarter", "year_q", "yr_built", "adopt_date", "created_date", "last_edited_date",
  "open_date",
  // muni columns:
  "muni_id",
  // census tract columns:
  "ct10_id", "ct20_id", "geoid", "logrecno", 
  // block group columns:
  "bg10_id", "bg20_id", 
  // blocks columns:
  "blk10_id", "blk20_id",
  // 250m grid columns
  "g250m_id",
  // zip codes:
  "zip", "zipcode", "zip_code", "owner_zip", "addr_zip",
  // addresses:
  "address", "site_addr", "owner_addr",
  // NAICS codes:
  "naicscode", "naics_2d", "naics_3d", "naics_4d", "naics_5_6d",
  // ids 
  "bike_id", "roadseg_id", "schid", "districtid", "zonecode", "zoning_id", "id", "seq_id", "objectid", "locationid",
  "mapc_id", "sharedpath_id", "walk_id", "line_id", "pwsid", "ll_id",
  // other specific columns:
  "map_num", "mappar_id", "fac_stat", "luc_1", "luc_2", "luc_adj_1", "luc_adj_2", 
]