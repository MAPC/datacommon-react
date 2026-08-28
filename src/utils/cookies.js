
// coppied from https://www.w3schools.com/js/js_cookies.asp
// parses the cookie string and reads the given value from it
export const getCookie = (cname) => {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// loggs out the current user by setting their token to expired in the coookie
export const logoutUser = () => {
  document.cookie = "datacommon_mapc_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}