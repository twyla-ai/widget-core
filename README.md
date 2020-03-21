# Widget Core

## Installation

```js
npm i -S @twyla-ai/widget-core
```

## Usage

```js
import * as TwylaWidgetCore from '@twyla-ai/widget-core';

// create an instance
// this doesn't initialise a connection with the bot
const twylaWidgetCore = new TwylaWidgetCore({
  hookURL,
  apiKey,
});

const onMessage = message => {
  // append new message to the state or UI
};

// set callback for incoming messages
twylaWidgetCore.onMessage(onMessage);

// initialise a connection with the bot
twylaWidgetCore
  .init()
  .then(({ history }) => {
    // insert chat history into the state or UI
    twylaWidgetCore.initiateConversation();
  })
  .catch(error => {});

// send a message
twylaWidgetCore.send('I need to book a ticket');

// clean up
// end chat session
twylaWidgetCore.endSession();
// clear reference to instance if required
twylaWidgetCore = null;
```

**Note:** Try to call `init` only when user has to chat with the bot (typically on chat window open) rather than on website/app load. Once initialised, the connection will be active in background for the lifetime of the website/app and will automatically reconnect on outages such as network loss. Call `endSession` to finish the chat in cases such as navigating to a page that doesn't have the chat feature. If you have to resume the chat on re-navigating to the page(s) with the chat, you can create a new instance and the chat will resume where it was left off.

You can chat with multiple bots by creating different instances of the library.<br/><br/>

## API

See [API Documentation](API.md).

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
