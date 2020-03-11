import {
  cleanHistory,
  getDefaultPayload,
  handleError,
  isJSON,
  notificationsChannelURLFromHookURL,
} from './utils';
import { CONVERSATION_STARTER, RETRY_TIMEOUT, TemplateTypes } from './constants';
import { postMessage } from './requests';
import CookieManager from './CookieManager';
import ChatHistoryManager from './ChatHistoryManager';

class WidgetCore {
  /**
   * @param {object} configuration
   * @param {string} configuration.apiKey
   * @param {string} configuration.hookURL
   * @param {boolean} configuration.conversationLogging
   */
  constructor(configuration) {
    this.configuration = {
      apiKey: undefined,
      hookURL: undefined,
    };
    this.notificationsChannelURL = undefined;
    this.payload = getDefaultPayload();
    this.promises = {
      init: {
        resolve: undefined,
        reject: undefined,
      },
    };
    this.messageQueue = [];
    this.history = undefined;
    this.connected = false;
    this.onMessageCallback = f => f;
    this.onConnectionChangeCallback = f => f;
    // flag used to retry socket connection only if true
    this.inSession = false;

    const { apiKey, hookURL, conversationLogging, conversationDebug } = configuration;
    this.configuration = { apiKey, hookURL };
    if (conversationLogging === false) {
      this.payload._logging_disabled = true;
    }
    if (conversationDebug === true) {
      this.payload._conversation_debug = true;
    }

    try {
      const {
        notificationsChannelURL,
        workspaceName,
        projectName,
      } = notificationsChannelURLFromHookURL(this.configuration.hookURL);
      this.notificationsChannelURL = notificationsChannelURL;
      this.cookieManager = new CookieManager(workspaceName, projectName);
      this.userId = this.cookieManager.get();

      this.chatHistoryManager = new ChatHistoryManager(workspaceName, projectName);
    } catch (e) {
      handleError('Invalid hook URL', this.configuration);
    }
  }

  _clearInitPromise = () => {
    this.promises.init = {
      resolve: undefined,
      reject: undefined,
    };
  };

  _setUpSocket = () => {
    this.socket = new WebSocket(this.notificationsChannelURL);
    this.socket.onmessage = this._handleIncoming;

    this.socket.addEventListener('open', () => {
      this.connected = true;
      this.onConnectionChangeCallback(true);

      this.socket.send(
        JSON.stringify({
          user_id_cookie: this.userId,
          api_key: this.configuration.apiKey,
        })
      );
    });

    this.socket.addEventListener('close', () => {
      this.connected = false;
      this.onConnectionChangeCallback(false);

      if (!this.inSession) {
        return;
      }

      setTimeout(() => {
        this._setUpSocket();
      }, RETRY_TIMEOUT);
    });
  };

  _handleIncoming = event => {
    const data = JSON.parse(event.data);

    const isInitResponse = data.user_id_cookie;
    const isErrorResponse = data.error;

    if (isInitResponse) {
      if (!this.userId || this.userId !== data.user_id_cookie) {
        this.userId = data.user_id_cookie;
        this.cookieManager.set(this.userId);

        this.chatHistoryManager.clean();

        if (this.promises.getUserId) {
          this.promises.getUserId.resolve(this.userId);
          this.promises.getUserId = undefined;
        }
      }

      if (this.promises.init.resolve) {
        const history = cleanHistory(this.chatHistoryManager.get());

        this.messageQueue.forEach(message => {
          if (message !== CONVERSATION_STARTER) {
            history.push({ made_by: 'user', content: message });
          }
        });

        this.getBotName()
          .then(response => {
            // if clearSession was called before getBotName resolves
            if (!this.promises.init.resolve) {
              return;
            }

            this.promises.init.resolve({
              botName: response.name,
              history,
            });

            this._clearInitPromise();
          })
          .catch(error => {
            handleError('Get metadata error:', error);

            this.promises.init.resolve({
              botName: 'Twyla Bot',
              history,
            });

            this._clearInitPromise();
          });
      }

      if (this.messageQueue.length) {
        const toPost = [...this.messageQueue];

        toPost.forEach(this.send);

        this.messageQueue = [];
      }
    } else if (isErrorResponse) {
      this.userId = null;
    } else {
      const { emission, debug } = data;
      const isMessageJSON = isJSON(emission);
      let textFromBot;

      if (isMessageJSON.result) {
        const template = isMessageJSON.json;

        if (template.template_type === TemplateTypes.FB_MESSENGER_BUTTON) {
          textFromBot = template.payload.text;

          this.onMessageCallback(textFromBot, debug);
        } else if (template.template_type === TemplateTypes.FB_MESSENGER_QUICK_REPLY) {
          textFromBot = template.text;

          this.onMessageCallback(textFromBot, debug);
        }
      }

      textFromBot = emission;

      this.onMessageCallback(textFromBot, debug);
      this.chatHistoryManager.push({ made_by: 'chatbot', content: textFromBot, debug });
    }
  };

  /**
   * Returns a Promise that resolves with bot name
   * @param {string} hookURL
   * @param {string} apiKey
   * @returns {Promise<Response | never>}
   */
  getBotName = (hookURL = this.configuration.hookURL, apiKey = this.configuration.apiKey) =>
    fetch(`${hookURL}?key=${apiKey}`, {
      method: 'GET',
    }).then(response => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    });

  /**
   * - Initialises the widget
   * - Resolves promise on connection success with botName and history
   * - Rejects promise if it fails
   * @returns {Promise<object>}
   * where object = {botName: string, history: Array[{content: string, made_by: string}]}
   */
  init = () => {
    this.inSession = true;

    return new Promise((resolve, reject) => {
      // store promise to resolve on establish session success
      this.promises.init = { resolve, reject };
      this._setUpSocket();
    });
  };

  /**
   * Set callback for incoming messages
   * @param {function} callback callback for incoming messages
   */
  onMessage = callback => {
    this.onMessageCallback = callback;
  };

  /**
   * Sends a message if connected, else queues it
   * @param {string} message
   */
  send = message => {
    if (this.connected) {
      postMessage({
        url: this.configuration.hookURL,
        apiKey: this.configuration.apiKey,
        input: message,
        userId: this.userId,
        payload: this.payload,
      });

      this.chatHistoryManager.push({ made_by: 'user', content: message });
    } else {
      if (this.messageQueue.length === 1 && this.messageQueue[0] === CONVERSATION_STARTER) {
        this.messageQueue = [];
      }

      this.messageQueue.push(message);
    }
  };

  /**
   * - To get the bot to say the intro message (if exists)
   * without having the user to send a message first
   * - Must be called after init
   */
  initiateConversation = () => {
    this.send(CONVERSATION_STARTER);
  };

  /**
   * - Closes socket connection for good
   * - Clears callback references
   */
  endSession = () => {
    // toggle session flag first so socket doesn't reconnect
    this.inSession = false;

    if (this.socket) this.socket.close();

    this.onMessage = f => f;
    this.promises.getUserId = null;
    this.messageQueue = [];
    this.onConnectionChangeCallback = f => f;
    this._clearInitPromise();
  };

  /**
   * - Ends session
   * - Clears all data & cookie
   */
  clearSession = () => {
    this.endSession();

    this.userId = null;
    this.configuration = {};
    this.notificationsChannelURL = null;
    this.payload = getDefaultPayload();

    this.cookieManager.remove();
    this.chatHistoryManager.clean();
  };

  /**
   * Sets callback for connection change
   * @param {function} callback(isConnected: bool)
   */
  onConnectionChange = callback => {
    this.onConnectionChangeCallback = callback;
  };

  /**
   * - Adds a property to the payload object
   * - If the property already exists, its value will be overwritten
   * @param {string} key
   * @param {*} value
   */
  attachToPayload = (key, value) => {
    if (key === '' || key === null || key === undefined) {
      console.error('TwylaWidget.attachToPayload: Payload key error');
      return;
    }

    if (key === '_meta') {
      console.error(`TwylaWidget.detachToPayload: Unable to attach system key "${key}"`);
      return;
    }

    this.payload[key] = value;
  };

  /**
   * Removes a property from the payload object
   * @param {string} key
   */
  detachFromPayload = key => {
    if (key === '_meta') {
      console.error(`TwylaWidget.detachToPayload: Unable to detach reserved key "${key}"`);
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(this.payload, key)) {
      console.error(`TwylaWidget.detachFromPayload: Payload key "${key}" not found`);
      return;
    }

    delete this.payload[key];
  };

  /**
   * Turn conversation logging on or off
   * @param {boolean} value true|false
   */
  setConversationLogging = value => {
    if (value === true) {
      delete this.payload._logging_disabled;
    } else if (value === false) {
      this.payload._logging_disabled = true;
    }
  };

  /**
   * Check if conversation logging is on or off
   * @returns {boolean}
   */
  isConversationLogging = () => {
    return !this.payload._logging_disabled;
  };

  /**
   * Returns a promise that resolves if and when user_id_cookie is available
   * @returns {Promise<string>}
   */
  getUserId = () => {
    return new Promise(resolve => {
      if (this.userId !== null && this.userId !== undefined) {
        resolve(this.userId);
      }

      this.promises.getUserId = { resolve };
    });
  };

  /**
   * - Adds a property to the metadata object in payload
   * - If the property already exists, its value will be overwritten
   * @param {string} key
   * @param {*} value
   */
  setMetadata = (key, value) => {
    if (key === '' || key === null || key === undefined) {
      console.error('TwylaWidget.setMetadata: Metadata key error');
      return;
    }

    this.payload._meta[key] = value;
  };
}

export default WidgetCore;
