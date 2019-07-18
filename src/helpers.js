import { isJSON } from './utils';
import { CONVERSATION_STARTER, TemplateTypes } from './constants';

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

  history.map(message => {
    if (message.content === CONVERSATION_STARTER) return;

    const isMessageJSON = isJSON(message.content);
    if (isMessageJSON.result) {
      templateTitlesCache = {};

      const template = isMessageJSON.json;

      if (template.template_type === TemplateTypes.FB_MESSENGER_BUTTON) {
        cleanedHistory.push({
          content: template.payload.text,
          made_by: 'chatbot',
        });

        template.payload.buttons.forEach(setTemplateTitleInCache);
      } else if (template.template_type === TemplateTypes.FB_MESSENGER_QUICK_REPLY) {
        template.quick_replies.forEach(setTemplateTitleInCache);

        message.content = template.text;
      } else if (template.template_type === TemplateTypes.FB_MESSENGER_GENERIC) {
        template.payload.elements.forEach(element => {
          if (element.buttons) {
            element.buttons.forEach(setTemplateTitleInCache);
          }
        });
      }
    } else {
      if (message.made_by === 'user' && templateTitlesCache[message.content]) {
        message.content = templateTitlesCache[message.content];
      }
    }

    cleanedHistory.push({ content: message.content, made_by: message.made_by });
  });

  return cleanedHistory;
};
