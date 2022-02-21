import { notificationsChannelURLFromHookURL } from '../utils';

describe('notificationsChannelURLFromHookURL tests', () => {
  test('returns notificationsChannelURL, projectName & workspaceName', () => {
    // localhost
    const localhosts = ["127.0.0.1", "127.0.0.1:9001", "localhost", "localhost:9001"];

    for (const hostname of localhosts) {
      expect(
        notificationsChannelURLFromHookURL(
          `http://${hostname}/widget-hook/massive-dynamic/z10`
        )
      ).toEqual({
        notificationsChannelURL:
          `ws://${hostname}/widget-notifications/massive-dynamic/z10`,
        projectName: 'z10',
        workspaceName: 'massive-dynamic',
      });

      expect(
        notificationsChannelURLFromHookURL(
          `https://${hostname}/widget-hook/massive-dynamic/z10`
        )
      ).toEqual({
        notificationsChannelURL:
          `wss://${hostname}/widget-notifications/massive-dynamic/z10`,
        projectName: 'z10',
        workspaceName: 'massive-dynamic',
      });
    }

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
