import { handleError } from './utils';

/**
 * @private
 */
// eslint-disable-next-line import/prefer-default-export
export const postMessage = ({ url, apiKey, input, userId, payload }) => {
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      data: payload,
      api_key: apiKey,
      input,
      user_id_cookie: userId,
    }),
  })
    .then(response => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .catch(error => {
      if (error.text && typeof error.text === 'function') {
        error.text().then(errorMessage => {
          handleError('Error:', errorMessage);
        });
      } else {
        handleError('Error:', error);
      }
    });
};
