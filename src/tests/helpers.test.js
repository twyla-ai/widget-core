import { cleanHistory } from '../helpers';
import { CONVERSATION_STARTER } from '../constants';

describe('Clean history tests', () => {
  const sampleButtonTemplate = {
    payload: {
      buttons: [
        {
          payload: 'x_button1_BJzx8gmwrQ_x',
          title: 'buttons button1',
          type: 'postback',
        },
        {
          payload: 'x_button2_H1zBUg7DS7_x',
          title: 'buttons button2',
          type: 'postback',
        },
        {
          title: 'buttons button3',
          type: 'web_url',
          url: 'https://unsplash.com/',
        },
      ],
      template_type: 'button',
      text: 'text emission - button template',
    },
    template_type: 'fbmessenger.button_sub_template',
    type: 'template',
  };

  const sampleButtonTemplateMessage = JSON.stringify(sampleButtonTemplate);

  const sampleQuickRepliesTemplate = {
    quick_replies: [
      {
        content_type: 'text',
        payload: 'x_quickreply1_SyfShl7PS7_x',
        title: 'quickreply1',
      },
      {
        content_type: 'text',
        payload: 'x_quickreply2_BkznnxQvHQ_x',
        title: 'quickreply2',
      },
      { title: 'quickreply3' },
      { title: 'quickreply4' },
      { title: 'quickreply5' },
      { title: 'quickreply6' },
      { title: 'quickreply7' },
      { title: 'quickreply8' },
      { title: 'quickreply9' },
      { title: 'quickreply10' },
    ],
    template_type: 'fbmessenger.quick_reply',
    text: 'text emission - quick replies template',
  };

  const sampleQuickRepliesTemplateMessage = JSON.stringify(
    sampleQuickRepliesTemplate
  );

  const sampleGenericTemplate = {
    template_type: 'fbmessenger.generic',
    type: 'template',
    payload: {
      template_type: 'generic',
      elements: [
        {
          title: 'card1',
          image_url:
            'https://images.unsplash.com/photo-1536698988377-ecd14e62f884?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=b3d5d730bb2d4be5541ed516c7dc6520&auto=format&fit=crop&w=1282&q=80',
          subtitle: 'Sydney Published on September 11, 2018',
          buttons: [
            {
              payload: 'x_button1_SyzeKgQwBX_x',
              title: 'card1 button1',
              type: 'postback',
            },
            {
              payload: 'x_button2_BJMOKlXwH7_x',
              title: 'card1 button2',
              type: 'postback',
            },
          ],
        },
        {
          title: 'card2',
          image_url:
            'https://images.unsplash.com/photo-1536689493251-7605f318530b?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=b25316cbaef0047ef736fd6138ed6396&auto=format&fit=crop&w=668&q=80',
          subtitle: 'Sydney Published on September 11, 2018',
          buttons: [
            {
              payload: 'x_button1_HJzCtgQDH7_x',
              title: 'card2 button1',
              type: 'postback',
            },
            {
              title: 'card2 button2',
              type: 'web_url',
              url:
                'https://images.unsplash.com/photo-1536689493251-7605f318530b?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=b25316cbaef0047ef736fd6138ed6396&auto=format&fit=crop&w=668&q=80',
            },
          ],
        },
        {
          title: 'card3',
          buttons: [
            {
              payload: 'x_button1_r1MNH6Cv_X_x',
              title: 'card3 button1',
              type: 'postback',
            },
            {
              payload: 'x_button2_BJMYHTAvdX_x',
              title: 'card3 button2',
              type: 'postback',
            },
          ],
        },
        { title: 'card4' },
      ],
    },
  };

  const sampleGenericTemplateMessage = JSON.stringify(sampleGenericTemplate);

  test('Empty history', () => {
    const history = [];
    const expected = [];

    expect(cleanHistory(history)).toEqual(expected);
  });

  test('Removes CONVERSATION_STARTER', () => {
    const history = [
      {
        content: CONVERSATION_STARTER,
        made_by: 'user',
      },
    ];
    const expected = [];

    expect(cleanHistory(history)).toEqual(expected);
  });

  // ===============================================================================
  // Quick replies template
  // ===============================================================================

  test('Removes quick replies but keeps the text as a separate message', () => {
    const history = [
      {
        content: sampleQuickRepliesTemplateMessage,
        made_by: 'chatbot',
      },
    ];

    const expected = [
      {
        content: sampleQuickRepliesTemplate.text,
        made_by: 'chatbot',
      },
    ];

    expect(cleanHistory(history)).toEqual(expected);
  });

  test('Maps quick reply template payload messages to button title', () => {
    const history = [
      {
        content: sampleQuickRepliesTemplateMessage,
        made_by: 'chatbot',
      },
      {
        content: sampleQuickRepliesTemplate.quick_replies[0].payload,
        made_by: 'user',
      },
    ];

    const expected = [
      {
        content: 'text emission - quick replies template',
        made_by: 'chatbot',
      },
      {
        content: sampleQuickRepliesTemplate.quick_replies[0].title,
        made_by: 'user',
      },
    ];

    expect(cleanHistory(history)).toEqual(expected);
  });

  // ===============================================================================
  // Generic template
  // ===============================================================================

  test('Maps generic template payload message to button title', () => {
    const history = [
      {
        content: sampleGenericTemplateMessage,
        made_by: 'chatbot',
      },
      {
        content: sampleGenericTemplate.payload.elements[1].buttons[0].payload,
        made_by: 'user',
      },
    ];

    const expected = [
      {
        content: sampleGenericTemplateMessage,
        made_by: 'chatbot',
      },
      {
        content: sampleGenericTemplate.payload.elements[1].buttons[0].title,
        made_by: 'user',
      },
    ];

    expect(cleanHistory(history)).toEqual(expected);
  });

  // ===============================================================================
  // Button template
  // ===============================================================================

  test('Extracts button template text as separate message', () => {
    const history = [
      {
        content: sampleButtonTemplateMessage,
        made_by: 'chatbot',
      },
    ];

    const expected = [
      {
        content: sampleButtonTemplate.payload.text,
        made_by: 'chatbot',
      },
      {
        content: sampleButtonTemplateMessage,
        made_by: 'chatbot',
      },
    ];

    expect(cleanHistory(history)).toEqual(expected);
  });

  test('Maps button template payload messages to button title', () => {
    const history = [
      {
        content: sampleButtonTemplateMessage,
        made_by: 'chatbot',
      },
      {
        content: sampleButtonTemplate.payload.buttons[1].payload,
        made_by: 'user',
      },
    ];

    const expected = [
      {
        content: sampleButtonTemplate.payload.text,
        made_by: 'chatbot',
      },
      {
        content: sampleButtonTemplateMessage,
        made_by: 'chatbot',
      },
      {
        content: sampleButtonTemplate.payload.buttons[1].title,
        made_by: 'user',
      },
    ];

    expect(cleanHistory(history)).toEqual(expected);
  });
});
