import Cookies from 'js-cookie';
import postMessage from './post-message';
import { cleanHistory } from './helpers';
import { handleError, isJSON } from './utils';
import { CONVERSATION_STARTER, COOKIE_NAME, RETRY_TIMEOUT, TemplateTypes } from './constants';
import { version } from '../package.json';

const API = {};

const getDefaultPayload = () => ({
  _meta: {
    origin: window.location.origin || null,
    pathname: window.location.pathname || null,
  },
});

const store = {
  configuration: {
    apiKey: undefined,
    hookURL: undefined,
  },
  notificationsChannelURL: undefined,
  userId: Cookies.get(COOKIE_NAME) || null,
  payload: getDefaultPayload(),
  promises: {
    init: {
      resolve: undefined,
      reject: undefined,
    },
  },

  messageQueue: [],

  connected: false,
  onConnectionChangeCallback: f => f,

  // flag used to retry socket connection only if true
  inSession: false,
};

const clearInitPromise = () => {
  store.promises.init = {
    resolve: undefined,
    reject: undefined,
  };
};

const rejectInitPromise = error => {
  store.promises.init.reject(error);
  clearInitPromise();
};

export const notificationsChannelURLFromHookURL = hookURL => {
  const hookURLTokens = hookURL.split('/');
  const botName = hookURLTokens[5]
    .split('/')
    .pop()
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.substr(1))
    .join(' ');
  let environment;
  let notificationsChannelURL;

  // TODO remove block once migration is complete
  if (hookURL.includes('twyla.io')) {
    environment = /api\.(.*)\.twyla/.exec(hookURL)[1];

    notificationsChannelURL = `wss://notification.${environment}.twyla.io/widget-notifications/${
      hookURLTokens[4]
    }/${hookURLTokens[5]}`;
  } else {
    let environmentSearch = /api\.(.*)\.canvas/.exec(hookURL);

    if (!environmentSearch) environment = 'production';
    else environment = environmentSearch[1];

    notificationsChannelURL = `wss://notification.${
      !environmentSearch ? '' : environment + '.'
    }canvas.twyla.ai/widget-notifications/${hookURLTokens[4]}/${hookURLTokens[5]}`;
  }

  return { botName, notificationsChannelURL };
};

const handleIncoming = event => {
  const data = JSON.parse(event.data);

  // init response
  // identified by presence of user_id_cookie
  if (data.user_id_cookie) {
    if (!store.userId || store.userId !== data.user_id_cookie) {
      store.userId = data.user_id_cookie;
      Cookies.set(COOKIE_NAME, store.userId);

      if (store.promises.getUserId) {
        store.promises.getUserId.resolve(store.userId);
        store.promises.getUserId = undefined;
      }
    }

    // if messages were queued then they need to be appended after history
    if (store.promises.init.resolve) {
      const history = cleanHistory(data.history);

      store.messageQueue.forEach(message => {
        if (message !== CONVERSATION_STARTER) {
          history.push({ made_by: 'user', content: message });
        }
      });

      getBotName()
        .then(response => {
          // before getBotName resolves,
          // if clearSession was called and init will be undefined
          if (store.promises.init.resolve) {
            store.promises.init.resolve({
              botName: response.name,
              history,
            });

            clearInitPromise();
          }
        })
        .catch(error => {
          handleError('Get metadata error:', error);

          store.promises.init.resolve({
            botName: 'Twyla Bot',
            history,
          });

          clearInitPromise();
        });
    }

    if (store.messageQueue.length) {
      const toPost = [...store.messageQueue];
      store.messageQueue = [];

      toPost.forEach(send);
    }
  } else if (data.error) {
    store.userId = null;
  } else {
    const isMessageJSON = isJSON(data.emission);
    if (isMessageJSON.result) {
      const template = isMessageJSON.json;
      if (template.template_type === TemplateTypes.FB_MESSENGER_BUTTON) {
        store.onMessage(template.payload.text);
      } else if (template.template_type === TemplateTypes.FB_MESSENGER_QUICK_REPLY) {
        store.onMessage(template.text);
      }
    }

    store.onMessage(data.emission);
  }
};

const setUpSocket = () => {
  store.socket = new WebSocket(store.notificationsChannelURL);
  store.socket.onmessage = handleIncoming;

  store.socket.addEventListener('open', () => {
    store.connected = true;
    store.onConnectionChangeCallback(true);

    store.socket.send(
      JSON.stringify({
        user_id_cookie: store.userId,
        api_key: store.configuration.apiKey,
      })
    );
  });

  store.socket.addEventListener('close', () => {
    store.connected = false;

    if (!store.inSession) {
      return;
    }
    store.onConnectionChangeCallback(false);

    setTimeout(() => {
      setUpSocket();
    }, RETRY_TIMEOUT);
  });
};

/**
 * - Initialises the widget
 * - Resolves promise on connection success with botName and history
 * - Rejects promise if hookURL is of invalid format
 * @param {object} configuration
 * @param {string} configuration.apiKey
 * @param {string} configuration.hookURL
 * @param {boolean} configuration.logging
 * @param {function} onMessage callback for incoming messages
 * @returns {Promise<object>}
 * where object = {botName: string, history: Array[{content: string, made_by: string}]}
 */
API.init = (configuration, onMessage) => {
  store.inSession = true;
  store.onMessage = onMessage;

  return new Promise((resolve, reject) => {
    // store promise to resolve on establish session success
    store.promises.init = { resolve, reject };

    store.configuration = {
      apiKey: configuration.apiKey,
      hookURL: configuration.hookURL,
    };

    if (configuration.logging === false) {
      store.payload._logging_disabled = true;
    }

    try {
      const { notificationsChannelURL, botName } = notificationsChannelURLFromHookURL(
        configuration.hookURL
      );
      store.notificationsChannelURL = notificationsChannelURL;
      store.botName = botName;
    } catch (e) {
      rejectInitPromise('Invalid hook URL');
      handleError('Invalid hook URL', configuration);
      return;
    }

    setUpSocket();
  });
};

/**
 * Sends a message if connected, else queues it
 * @param {string} message
 */
API.send = message => {
  if (store.connected) {
    postMessage({
      url: store.configuration.hookURL,
      apiKey: store.configuration.apiKey,
      input: message,
      userId: store.userId,
      payload: store.payload,
    });
  } else {
    if (store.messageQueue.length === 1 && store.messageQueue[0] === CONVERSATION_STARTER) {
      store.messageQueue = [];
    }

    store.messageQueue.push(message);
  }
};

/**
 * - To get the bot to say the intro message (if exists)
 * without having the user to send a message first
 * - Must be called after init
 */
API.initiateConversation = () => {
  API.send(CONVERSATION_STARTER);
};

/**
 * Sets callback for connection change
 * @param {function} callback(isConnected: bool)
 */
API.onConnectionChange = callback => {
  store.onConnectionChangeCallback = callback;
};

/**
 * - Adds a property to the payload object
 * - If the property already exists, its value will be overwritten
 * @param {string} key
 * @param {*} value
 */
API.attachToPayload = (key, value) => {
  if (key === '' || key === null || key === undefined) {
    console.error('TwylaWidget.attachToPayload: Payload key error');
    return;
  }

  if (key === '_meta') {
    console.error(`TwylaWidget.detachToPayload: Unable to attach system key "${key}"`);
    return;
  }

  store.payload[key] = value;
};

/**
 * - Adds a property to the metadata object in payload
 * - If the property already exists, its value will be overwritten
 * @param {string} key
 * @param {*} value
 */
API.setMetadata = (key, value) => {
  if (key === '' || key === null || key === undefined) {
    console.error('TwylaWidget.setMetadata: Metadata key error');
    return;
  }

  store.payload._meta[key] = value;
};

/**
 * Removes a property from the payload object
 * @param {string} key
 */
API.detachFromPayload = key => {
  if (key === '_meta') {
    console.error(`TwylaWidget.detachToPayload: Unable to detach reserved key "${key}"`);
    return;
  }

  if (!store.payload.hasOwnProperty(key)) {
    console.error(`TwylaWidget.detachFromPayload: Payload key "${key}" not found`);
    return;
  }

  delete store.payload[key];
};

/**
 * Turn logging on or off
 * @param {boolean} value true|false
 */
API.toggleLogging = value => {
  if (value === true) {
    delete store.payload._logging_disabled;
  } else if (value === false) {
    store.payload._logging_disabled = true;
  }
};

/**
 * Check if logging is on or off
 * @returns {boolean}
 */
API.isLogging = () => {
  return !!store.payload._logging_disabled;
};

/**
 * Returns a promise that resolves if and when user_id_cookie is available
 * @returns {Promise<string>}
 */
API.getUserId = () => {
  return new Promise(resolve => {
    if (store.userId !== null && store.userId !== undefined) {
      resolve(store.userId);
    }

    store.promises.getUserId = { resolve };
  });
};

/**
 * Returns a Promise that resolves with bot name
 * @param {string} hookURL
 * @param {string} apiKey
 * @returns {Promise<Response | never>}
 */
API.getBotName = (hookURL = store.configuration.hookURL, apiKey = store.configuration.apiKey) => {
  return fetch(`${hookURL}?key=${apiKey}`, {
    method: 'GET',
  }).then(response => {
    if (!response.ok) {
      throw response;
    }
    return response.json();
  });
};

/**
 * - Closes socket connection for good
 * - Clears callback references
 */
API.endSession = () => {
  // toggle session flag first so socket doesn't reconnect
  store.inSession = false;
  if (store.socket) store.socket.close();

  store.onMessage = f => f;
  store.promises.getUserId = null;
  store.messageQueue = [];
  store.onConnectionChangeCallback = f => f;
  clearInitPromise();
};

/**
 * - Ends session
 * - Clears all data & cookie
 */
API.clearSession = () => {
  API.endSession();
  store.userId = null;
  store.configuration = {};
  store.notificationsChannelURL = null;
  store.payload = getDefaultPayload();
  Cookies.remove(COOKIE_NAME);
};

export { version } from '../package.json';

export const {
  init,
  send,
  initiateConversation,
  onConnectionChange,
  attachToPayload,
  detachFromPayload,
  setMetadata,
  getUserId,
  getBotName,
  clearSession,
  endSession,
} = API;
