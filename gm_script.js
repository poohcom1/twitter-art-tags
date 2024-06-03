// ==UserScript==
// @name     Twitter Art Collection
// @version  1
// @grant    none
// @version      0.1
// @author       poohcom1
// @match        https://x.com/*
// @grant        none
// ==/UserScript==

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

async function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sensitive selectors
const ROOT_PARENT_LABEL = '[aria-label="Timeline: Your Home Timeline"]';

/**
 * @returns {Promise<HTMLElement>}
 */
async function getTimelineRoot() {
  const timelineRootParent = await waitForElement(ROOT_PARENT_LABEL);
  return timelineRootParent.childNodes[0];
}

// Tweet helper

/** @param {HTMLElement} tweet */
function isTweet(tweet) {
  return tweet.querySelector('article[data-testid="tweet"]') !== null;
}

/** @param {HTMLElement} tweet */
function getTweetId(tweet) {
  // TODO
  tweet.querySelector('a')
}

/** @param {HTMLElement} tweet */
function getTweetImages(tweet) {
  return Array.from(tweet.querySelectorAll('img'))
    .map((img) => img.src);
}

/** @param {HTMLElement} tweet */
async function getTweetMenuContainer(tweet) {
  const bookmarkButton = await waitForElement('[data-testid="bookmark"]', tweet);
  return bookmarkButton.parentElement.parentElement;
}

// Menu helper

// Main
async function renderTweet(tweet) {
  console.log(tweet)
  const menuContainer = await getTweetMenuContainer(tweet);

  const menuButton = document.createElement('div');
  menuButton.innerHTML = `
<div>
  <label for="tags">Tags</label>
  <select name="tags" id="tags">
    <option>Save</option>
    <option>Report</option>
  </select>
</div>
        `

  menuContainer.appendChild(menuButton)
}

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
        alert("Tagging!");
      });
      dropdown.prepend(tagContainer);
    });
  });

  timelineObserver.observe(document.getElementById('layers'), { childList: true });
})();
