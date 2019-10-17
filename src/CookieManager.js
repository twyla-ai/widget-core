import Cookies from 'js-cookie';

class CookieManager {
  constructor(workspaceName, projectName) {
    this.COOKIE_NAME = `TwylaWidgetSessionId_${workspaceName}_${projectName}`;
  }

  get() {
    return Cookies.get(this.COOKIE_NAME) || null;
  }

  set(value) {
    Cookies.set(this.COOKIE_NAME, value);
  }

  remove() {
    Cookies.remove(this.COOKIE_NAME);
  }
}

export default CookieManager;
