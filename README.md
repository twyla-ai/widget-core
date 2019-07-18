# Widget Core

## Installation

```js
npm i -S @twyla-ai/widget-core
```

## Usage

```js
import {init, send, initiateConversation} from '@twyla-ai/widget-core';

init({ apiKey, hookURL })
  .then(({botName, history}) {
    initiateConversation();
    /* ... */
  }, error => {})
  .catch(error => {});

send('I need to book a ticket');
```

## API

See [API Documentation](API.md).

_Note:_ Try to call `init` only when user has to chat with the bot (typically on chat window open) rather than on website/app load. Once initialised, the connection will be active in background for the lifetime of the website/app and will automatically reconnect on outages such as network loss. Call `endSession` to finish the chat in cases such as navigating to a page that doesn't have the chat feature. If you have to resume the chat on re-navigating to the page(s) with the chat, you need not re initialise the connection, instead you can hold the reference to the onMessage handler to continue to receive new messages. If you cannot then call endSession on chat page leave and re initialise on chat page enter.
<br/><br/>
Use the `clearSession` API to start a fresh chat (conversation history will be deleted) when user revisits the website/app. And also if you have multiple bots, use `clearSession` before talking to a new bot.

## Browser Support

Supports all browsers that support WebSockets API.

You must include a promise polyfill such as `es6-promise` and a fetch polyfill such as `whatwg-fetch` if the following browser support is required:

- Chrome
- Firefox
- Safari 7+
- IE 10+
- Edge

For more info see:

- https://caniuse.com/#search=fetch
- https://caniuse.com/#search=promise
- https://caniuse.com/#search=web%20socket

## License

MIT © Twyla GmbH
