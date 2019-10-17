import { notificationsChannelURLFromHookURL } from '../utils';

describe('notificationsChannelURLFromHookURL tests', () => {
  test('Old domains tests', () => {
    // production
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.production.twyla.io/widget-hook/massive-dynamic/z10'
      )
    ).toEqual({
      botName: 'Z10',
      notificationsChannelURL:
        'wss://notification.production.twyla.io/widget-notifications/massive-dynamic/z10',
      projectName: 'z10',
      workspaceName: 'massive-dynamic',
    });

    // demo
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.demo.twyla.io/widget-hook/massive-dynamic/z10'
      )
    ).toEqual({
      botName: 'Z10',
      notificationsChannelURL:
        'wss://notification.demo.twyla.io/widget-notifications/massive-dynamic/z10',
      projectName: 'z10',
      workspaceName: 'massive-dynamic',
    });
  });

  test('New domains', () => {
    // rawhide
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.rawhide.canvas.twyla.ai/widget-hook/massive-dynamic/z10'
      )
    ).toEqual({
      botName: 'Z10',
      notificationsChannelURL:
        'wss://notification.rawhide.canvas.twyla.ai/widget-notifications/massive-dynamic/z10',
      projectName: 'z10',
      workspaceName: 'massive-dynamic',
    });

    // production
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.canvas.twyla.ai/widget-hook/massive-dynamic/z10'
      )
    ).toEqual({
      botName: 'Z10',
      notificationsChannelURL:
        'wss://notification.canvas.twyla.ai/widget-notifications/massive-dynamic/z10',
      projectName: 'z10',
      workspaceName: 'massive-dynamic',
    });
  });
});
