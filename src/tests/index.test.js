import { notificationsChannelURLFromHookURL } from '../utils';

describe('notificationsChannelURLFromHookURL tests', () => {
  test('returns notificationsChannelURL, projectName & workspaceName', () => {
    // rawhide
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.rawhide.canvas.twyla.ai/widget-hook/massive-dynamic/z10'
      )
    ).toEqual({
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
      notificationsChannelURL:
        'wss://notification.canvas.twyla.ai/widget-notifications/massive-dynamic/z10',
      projectName: 'z10',
      workspaceName: 'massive-dynamic',
    });
  });
});
