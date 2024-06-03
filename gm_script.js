// ==UserScript==
// @name     Twitter Art Collection
// @version  1
// @version  0.1
// @author   poohcom1
// @match    https://x.com/*
// @grant    GM.xmlHttpRequest
// ==/UserScript==

// Environment
const SERVER_URL = 'http://localhost:5757';

// Assets
const TAG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi"><g><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></g></svg>`;

// General

/**
 * @returns {Promise<HTMLElement>}
 */
async function waitForElement(selector, root = document) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = root.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
  });
}

// Menu helper

// API
function addTag(id, tag, imageSrcs) {
  const data = {
    id: id,
    tag: tag,
    imageSrcs: imageSrcs
  };

  GM.xmlHttpRequest({
    method: 'POST',
    url: SERVER_URL + '/api/addTag',
    data: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    },
    onload: function (response) {
      if (response.status === 200) {
        console.log('Tag added successfully:', response.responseText);
      } else {
        console.error('Error adding tag:', response.status, response.responseText);
      }
    },
    onerror: function (response) {
      console.error('Request failed:', response);
    }
  });
}

// Main
(async function () {
  'use strict';
  ``

  await waitForElement('#layers')

  const timelineObserver = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach(async (mutation) => {
      const dropdown = await waitForElement('div[data-testid="Dropdown"]', mutation.addedNodes[0]);
      if (!dropdown) {
        return;
      }

      // Find id
      let id = '';

      const anchors = dropdown.querySelectorAll('a');
      for (const anchor of anchors) {
        if (anchor.href.includes('/status/')) {
          id = anchor.href.split('/')[5];
          break;
        }
      }

      if (!id) {
        return;
      }

      const tagId = id + "_tagButton";

      if (document.getElementById(tagId)) {
        return;
      }

      // Clone a menu item
      const tagContainer = dropdown.childNodes[0].cloneNode(true);

      tagContainer.querySelector('span').innerText = 'Tag';
      tagContainer.querySelector('svg').outerHTML = TAG_SVG;
      tagContainer.id = tagId;
      tagContainer.addEventListener('click', async () => {
        addTag(id, 'test', ['image1', 'image2']);
      });
      dropdown.prepend(tagContainer);
    });
  });

  timelineObserver.observe(document.getElementById('layers'), { childList: true });
})();
