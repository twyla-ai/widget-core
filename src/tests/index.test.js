import { notificationsChannelURLFromHookURL } from '../index';

describe('notificationsChannelURLFromHookURL tests', () => {
  test('New domains', () => {
    // localhost
    expect(
      notificationsChannelURLFromHookURL('http://127.0.0.1:8080/widget-hook/massive-dynamic/z10')
    ).toEqual('ws://127.0.0.1:8080/widget-notifications/massive-dynamic/z10');

    // rawhide
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.rawhide.canvas.twyla.ai/widget-hook/massive-dynamic/z10'
      )
    ).toEqual('wss://api.rawhide.canvas.twyla.ai/widget-notifications/massive-dynamic/z10');

    // production
    expect(
      notificationsChannelURLFromHookURL(
        'https://api.canvas.twyla.ai/widget-hook/massive-dynamic/z10'
      )
    ).toEqual('wss://api.canvas.twyla.ai/widget-notifications/massive-dynamic/z10');
  });
});
