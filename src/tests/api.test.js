import {
  attachToPayload,
  clearSession,
  detachFromPayload,
  setMetadata,
  getUserId,
  init,
  initiateConversation,
  onConnectionChange,
  send,
  endSession,
} from '../index';
import { WebSocket, Server } from 'mock-socket';
import { CONVERSATION_STARTER } from '../constants';

global.fetch = jest.fn().mockImplementation(url => {
  let responseJSON = f => f;
  if (url === 'https://api.demo.twyla.io/widget-hook/massive-dynamics/templates?key=fakeApiKey') {
    responseJSON = () => ({ name: 'Templates' });
  }
  return new Promise(resolve => {
    resolve({ ok: true, json: responseJSON });
  });
});

global.WebSocket = WebSocket;

describe('API error test', () => {
  const consoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = consoleError;
  });

  test('Rejects init for invalid Hook URL', done => {
    const errorConfiguration = {
      apiKey: 'fakeApiKey',
      hookURL: '',
    };

    init(errorConfiguration).then(
      f => f,
      error => {
        expect(error).toEqual('Invalid hook URL');
        expect(console.error).toHaveBeenCalled();
        done();
      }
    );
  });
});

describe('API test', () => {
  let mockServer;
  let socketRef;
  let onMessage;
  let connectionChangeListener;

  const origin = 'https://jest-test.com';
  const pathname = '/widget.html';
  const fakeCookie = 'fakeUserIdCookie';
  const fakeWsURL = `wss://notification.demo.twyla.io/widget-notifications/massive-dynamics/templates`;
  const configuration = {
    apiKey: 'fakeApiKey',
    hookURL: 'https://api.demo.twyla.io/widget-hook/massive-dynamics/templates',
  };

  const mockFetch = url => {
    let json = f => f;
    const fakeUrl = `https://api.demo.twyla.io/widget-hook/massive-dynamics/templates?key=${configuration.apiKey}`;

    if (url === fakeUrl) {
      json = () => ({ name: 'Templates' });
    }

    return new Promise(resolve => {
      resolve({
        ok: true,
        json,
      });
    });
  };

  const postMsg = (input, extraData, extraMeta) => {
    const obj = {
      method: 'POST',
      body: {
        data: {
          _meta: {
            origin: origin,
            pathname: pathname,
          },
        },
        api_key: configuration.apiKey,
        input: input,
        user_id_cookie: fakeCookie,
      },
    };

    obj.body.data = { ...obj.body.data, ...extraData };
    obj.body.data._meta = { ...obj.body.data._meta, ...extraMeta };

    obj.body = JSON.stringify(obj.body);

    return obj;
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(mockFetch);

    connectionChangeListener = jest.fn();
    onConnectionChange(connectionChangeListener);

    mockServer = new Server(fakeWsURL);
    mockServer.on('connection', socket => {
      socketRef = socket;

      socket.on('message', data => {
        expect(data).toEqual(
          JSON.stringify({
            user_id_cookie: null,
            api_key: configuration.apiKey,
          })
        );

        socket.send(
          JSON.stringify({
            user_id_cookie: fakeCookie,
            history: [{ made_by: 'user', content: 'a' }, { made_by: 'chatbot', content: 'b' }],
          })
        );
      });
    });
  });

  afterEach(() => {
    mockServer.stop();

    clearSession(1000);
  });

  test('promise params', done => {
    const queuedMsg = 'queuedMessage';

    init(configuration, onMessage).then(({ botName, history }) => {
      expect(botName).toEqual('Templates');
      expect(history).toEqual([
        { made_by: 'user', content: 'a' },
        { made_by: 'chatbot', content: 'b' },
        { content: 'queuedMessage', made_by: 'user' },
      ]);

      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(configuration.hookURL);
      expect(global.fetch.mock.calls[1][1]).toEqual(postMsg(queuedMsg));

      done();
    });

    send(queuedMsg);
  });

  test('onConnectionChangeCallback', done => {
    init(configuration, onMessage).then(() => {
      expect(connectionChangeListener.mock.calls.length).toBeTruthy();

      done();
    });
  });

  test('getUserId', done => {
    init(configuration, onMessage).then(() => {
      getUserId().then(userId => {
        expect(userId).toEqual(fakeCookie);
        done();
      });
    });
  });

  test('socketRef onSend', done => {
    const onMessage = jest.fn();

    init(configuration, onMessage).then(() => {
      const WELCOME_MESSAGE = 'hi Im a bot that can do X';

      socketRef.send(JSON.stringify({ emission: WELCOME_MESSAGE }));
      expect(onMessage.mock.calls.length).toEqual(1);
      expect(onMessage.mock.calls[0][0]).toEqual(WELCOME_MESSAGE);

      socketRef.send(JSON.stringify({ emission: 'wazza' }));
      expect(onMessage.mock.calls.length).toEqual(2);
      expect(onMessage.mock.calls[1][0]).toEqual('wazza');

      done();
    });
  });

  test('send', done => {
    init(configuration, onMessage).then(() => {
      expect(global.fetch.mock.calls.length).toEqual(1);

      initiateConversation();

      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(configuration.hookURL);
      expect(global.fetch.mock.calls[1][1]).toEqual(postMsg(CONVERSATION_STARTER));

      send('hi');

      expect(global.fetch.mock.calls.length).toEqual(3);
      expect(global.fetch.mock.calls[2][0]).toEqual(configuration.hookURL);
      expect(global.fetch.mock.calls[2][1]).toEqual(postMsg('hi'));

      done();
    });
  });

  test('payload', done => {
    init(configuration, onMessage).then(() => {
      expect(global.fetch.mock.calls.length).toEqual(1);

      attachToPayload('fruit', 'apple');
      send('blue');

      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(configuration.hookURL);

      let requestPayload = global.fetch.mock.calls[1][1];
      expect(requestPayload.method).toEqual('POST');
      expect(JSON.parse(requestPayload.body)).toEqual({
        api_key: 'fakeApiKey',
        data: {
          _meta: {
            origin: 'https://jest-test.com',
            pathname: '/widget.html',
          },
          fruit: 'apple',
        },
        input: 'blue',
        user_id_cookie: 'fakeUserIdCookie',
      });

      detachFromPayload('fruit');
      send('green');

      expect(global.fetch.mock.calls.length).toEqual(3);
      expect(global.fetch.mock.calls[2][0]).toEqual(configuration.hookURL);

      requestPayload = global.fetch.mock.calls[2][1];
      expect(requestPayload.method).toEqual('POST');
      expect(JSON.parse(requestPayload.body)).toEqual({
        api_key: 'fakeApiKey',
        data: {
          _meta: {
            origin: 'https://jest-test.com',
            pathname: '/widget.html',
          },
        },
        input: 'green',
        user_id_cookie: 'fakeUserIdCookie',
      });

      done();
    });
  });

  test('turn off logging', done => {
    init({ ...configuration, logging: false }, onMessage).then(() => {
      expect(global.fetch.mock.calls.length).toEqual(1);

      send('blue');

      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(configuration.hookURL);

      let requestPayload = global.fetch.mock.calls[1][1];
      expect(requestPayload.method).toEqual('POST');
      expect(JSON.parse(requestPayload.body)).toEqual({
        api_key: 'fakeApiKey',
        data: {
          _meta: {
            origin: 'https://jest-test.com',
            pathname: '/widget.html',
          },
          _logging_disabled: true,
        },
        input: 'blue',
        user_id_cookie: 'fakeUserIdCookie',
      });

      done();
    });
  });

  test('metadata', done => {
    init(configuration, onMessage).then(() => {
      expect(global.fetch.mock.calls.length).toEqual(1);

      setMetadata('metakey', 'metavalue');
      send('yellow');

      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(configuration.hookURL);
      expect(global.fetch.mock.calls[1][1]).toEqual(
        postMsg('yellow', {}, { metakey: 'metavalue' })
      );

      done();
    });
  });

  test('endSession', done => {
    const onMessage = jest.fn();
    init(configuration, onMessage).then(() => {
      socketRef.send(JSON.stringify({ emission: 'hallelujah' }));
      expect(onMessage.mock.calls.length).toEqual(1);

      endSession();

      socketRef.send(JSON.stringify({ emission: 'wubba lubba dub dub' }));
      expect(onMessage.mock.calls.length).toEqual(1);

      done();
    });
  });
});
