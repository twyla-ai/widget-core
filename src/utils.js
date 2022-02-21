import { CONVERSATION_STARTER, TemplateTypes } from './constants';

/**
 * @private
 */
export const getDefaultPayload = () => ({
  _meta: {
    origin: window.location.origin || null,
    pathname: window.location.pathname || null,
  },
});

/**
 * @private
 */
export const notificationsChannelURLFromHookURL = hookURL => {
  const hookURLTokens = hookURL.split('/');
  const hookURLParsed = new URL(hookURL);
  let environment;
  let notificationsChannelURL;

  if (['localhost', '127.0.0.1'].includes(hookURLParsed.hostname)) {
    notificationsChannelURL = `${hookURLParsed.protocol === 'http:' ? 'ws' : 'wss'}://${hookURLParsed.hostname}`;
    if (hookURLParsed.port) {
      notificationsChannelURL += `:${hookURLParsed.port}`
    }
  } else {
    const environmentSearch = /api\.(.*)\.canvas/.exec(hookURL);

    if (!environmentSearch) environment = 'production';
    else [, environment] = environmentSearch;

    notificationsChannelURL = `wss://notification.${
      !environmentSearch ? '' : `${environment}.`
    }canvas.twyla.ai`;
  }

  return {
    notificationsChannelURL: `${notificationsChannelURL}/widget-notifications/${hookURLTokens[4]}/${hookURLTokens[5]}`,
    workspaceName: hookURLTokens[4],
    projectName: hookURLTokens[5],
  };
};

/**
 * @private
 */
export const handleError = (...args) => console.error(...args);

/**
 * @private
 */
export const getType = item => Object.prototype.toString.call(item).slice(8, -1);

/**
 * @private
 */
export const isJSON = string => {
  let json;
  try {
    json = JSON.parse(string);
    if (getType(json) !== 'Object') {
      return { result: false };
    }
  } catch (e) {
    return { result: false };
  }
  return { result: true, json };
};

/**
 * @private
 * Removes CONVERSATION_STARTER
 * removes quick replies
 * maps template button payload message to template button title
 * @param history {Array}
 * @returns {Array}
 */
export const cleanHistory = history => {
  const cleanedHistory = [];
  let templateTitlesCache = {};

  const setTemplateTitleInCache = templateItem => {
    if (templateItem.payload) templateTitlesCache[templateItem.payload] = templateItem.title;
  };

  history.forEach(message => {
    const updatedMessage = message;
    if (updatedMessage.content === CONVERSATION_STARTER) return;

    const isMessageJSON = isJSON(updatedMessage.content);
    if (isMessageJSON.result) {
      templateTitlesCache = {};

      const template = isMessageJSON.json;

      if (template.template_type === TemplateTypes.FB_MESSENGER_BUTTON) {
        cleanedHistory.push({
          content: template.payload.text,
          made_by: 'chatbot',
          debug: message.debug,
        });

        template.payload.buttons.forEach(setTemplateTitleInCache);
      } else if (template.template_type === TemplateTypes.FB_MESSENGER_QUICK_REPLY) {
        template.quick_replies.forEach(setTemplateTitleInCache);

        updatedMessage.content = template.text;
      } else if (template.template_type === TemplateTypes.FB_MESSENGER_GENERIC) {
        template.payload.elements.forEach(element => {
          if (element.buttons) {
            element.buttons.forEach(setTemplateTitleInCache);
          }
        });
      }
    } else if (updatedMessage.made_by === 'user' && templateTitlesCache[updatedMessage.content]) {
      updatedMessage.content = templateTitlesCache[updatedMessage.content];
    }

    cleanedHistory.push({
      content: updatedMessage.content,
      made_by: updatedMessage.made_by,
      debug: message.debug,
    });
  });

  return cleanedHistory;
};
