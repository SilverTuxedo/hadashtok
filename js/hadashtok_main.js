"use strict";


const COMMENT_CONTENT_QUERY = ".postrow";
const QUOTE_CONTENT_QUERY = ".message";

const MESSAGES = {
    IMAGE_HIDDEN_CLICK: "תמונה זו הוסתרה באופן אוטומטי. לחץ כאן כדי להציג אותה.",
    COMMENT_HIDDEN_CLICK: "תגובה זו הוסתרה באופן אוטומטי. לחץ כאן כדי להציג אותה.",
    QUOTE_HIDDEN_CLICK: "ציטוט זה הוסתר באופן אוטומטי. לחץ כאן כדי להציג אותו."
};

/**
 * Handles a single comment
 * @param {Element} commentEl - A comment element
 */
function processComment(commentEl) {
    let signupDate = getSignupDate(commentEl);
    let userInfo = getUserNameAndId(commentEl);

    let dayDelta = calcDayDelta(signupDate);
    let userAdded = false;

    if (preferences.hideImages.enabled) {
        if (dayDelta <= preferences.hideImages.dayDelta) {
            hideCommentImages(commentEl);
            if (!userAdded) {
                addKnownUser(userInfo.id, userInfo.name, signupDate);
                userAdded = true;
            }
        }
    }

    if (preferences.hideComments.enabled) {
        if (dayDelta <= preferences.hideComments.dayDelta) {
            hideCommentContent(commentEl);
            if (!userAdded) {
                addKnownUser(userInfo.id, userInfo.name, signupDate);
                userAdded = true;
            }

        }
    }

    let quoteElList = commentEl.querySelectorAll(".bbcode_quote");
    quoteElList.forEach(qEl => processQuoteInComment(qEl));
}

/**
 * Handles a quote element. This makes use of the knownUsers collection in order to determine the user's signup date.
 * @param {Element} quoteEl - A quote element
 */
function processQuoteInComment(quoteEl) {
    let authorNameEl = quoteEl.querySelector(".bbcode_postedby strong");

    if (authorNameEl !== null) //continue only if the quote has an author
    {
        let authorSignupDate;

        let authorName = authorNameEl.textContent.trim();
        let authorInfo = searchUserByName(authorName); //get the signup date by searching the known users
        if (authorInfo !== null) {
            authorSignupDate = new Date(authorInfo.signupTime);
        }

        if (authorSignupDate !== undefined) {
            let dayDelta = calcDayDelta(authorSignupDate);

            if (preferences.hideImages.enabled) {
                if (dayDelta <= preferences.hideImages.dayDelta) {
                    hideImagesInContainer(quoteEl);
                }
            }

            if (preferences.hideComments.enabled) {
                if (dayDelta <= preferences.hideComments.dayDelta) {
                    hideQuoteContent(quoteEl);
                }
            }
        }
    }
}

/**
 * Checks if the current page is a thread.
 * @returns {boolean} Is the current page a thread
 */
function isThread() {
    return window.location.href.indexOf("showthread.php") > -1;
}

/**
 * Returns the current forum ID. Works inside threads only.
 * @returns {number} A forum ID
 */
function getForumIdInThread() {
    let forumLinkContainers = document.querySelectorAll(".navbit a[href*='forumdisplay.php']");
    if (forumLinkContainers.length === 0)
        return 0;

    let currentForumContainer = forumLinkContainers[forumLinkContainers.length - 1];
    let currentForumHref = currentForumContainer.getAttribute("href");

    return parseInt(currentForumHref.match(/(?<=\?f=)\d+/g));
}

/**
 * Extracts a user's sign up date from their comment.
 * @param {Element} commentEl - A comment element
 * @returns {Date} The sign up date
 */
function getSignupDate(commentEl) {
    let userInfoEl = commentEl.querySelector(".userinfo, .userinfo_noavatar");
    let signupDateStr = userInfoEl.querySelector(".userinfo_extra dd").textContent;
    let dateComp = signupDateStr.split("-").map(str => parseInt(str)); //split the date string to its numerical components

    let signupDate = new Date(2000 + dateComp[2], dateComp[1] - 1, dateComp[0]);
    return signupDate;
}

/**
 * Extracts a user's name and ID from their comment.
 * @param {Element} commentEl - A comment element
 * @returns {object} An object structured {id, name}
 */
function getUserNameAndId(commentEl) {
    let usernameEl = commentEl.querySelector("a.username");
    let id = parseInt(usernameEl.href.match(/(?<=\?u=)\d+/g));
    let name = usernameEl.textContent.trim();
    return {
        id: id,
        name: name
    };
}

/**
 * Hides a comment's content and adds a button that allows the user to restore it.
 * @param {Element} commentEl - A comment element
 */
function hideCommentContent(commentEl) {
    let contentEl = commentEl.querySelector(COMMENT_CONTENT_QUERY);
    contentEl.style.display = "none";
    let hiddenNoticeEl = buildHiddenText(MESSAGES.COMMENT_HIDDEN_CLICK);
    hiddenNoticeEl.addEventListener("click", showHiddenContentClick);

    insertAfter(hiddenNoticeEl, contentEl);

    hideCommentAvatar(commentEl);
}

/**
 * Hides a quote's content and adds a button that allows the user to restore it.
 * @param {Element} quoteEl - A quote element
 */
function hideQuoteContent(quoteEl) {
    let contentEl = quoteEl.querySelector(QUOTE_CONTENT_QUERY);
    contentEl.style.display = "none";
    let hiddenNoticeEl = buildHiddenText(MESSAGES.QUOTE_HIDDEN_CLICK);
    hiddenNoticeEl.addEventListener("click", showHiddenQuoteClick);

    insertAfter(hiddenNoticeEl, contentEl);
}

/**
 * Replaces a comment's images with placeholders that allow the user to restore it.
 * @param {Element} commentEl - An element that has the comment's content 
 */
function hideCommentImages(commentEl) {
    let commentBodyEl = commentEl.querySelector(".postbody");
    hideImagesInContainer(commentBodyEl);
    hideCommentAvatar(commentEl);
}

/**
 * Replaces images with placeholders that allow the user to restore them.
 * @param {Element} container - An element that contains images
 */
function hideImagesInContainer(container) {
    container.querySelectorAll(".mainimg, .videogifdiv").forEach(imageContainerEl => {
        let pictureEl = imageContainerEl.querySelector("picture, video");

        let innerImgEl = pictureEl.querySelector("img");
        if (innerImgEl !== null && isImgWhitelisted(innerImgEl))
            return; //do not process whitelisted images

        imageContainerEl.style.position = "relative";
        pictureEl.style.visibility = "hidden";

        let placeholderImageEl = buildImageHiddenElement();
        placeholderImageEl.addEventListener("click", showHiddenImageClick);
        imageContainerEl.appendChild(placeholderImageEl);
    });

    container.querySelectorAll("img").forEach(imgEl => {
        if (imgEl.parentElement.tagName === "PICTURE" || isImgWhitelisted(imgEl))
            return; //do not process already wrapped images, or images that are whitelisted

        let wrapperEl = document.createElement("div");
        wrapperEl.className = "hiddenImageWrapper";
        wrap(imgEl, wrapperEl);
        imgEl.style.visibility = "hidden";

        let placeholderImageEl = buildImageHiddenElement();
        placeholderImageEl.addEventListener("click", e => showHiddenImageClick(e, true));
        wrapperEl.appendChild(placeholderImageEl);
    });
}

/**
 * Replaces a comment's avatar with a placeholder.
 * @param {Element} commentEl - An element that has the comment's content 
 */
function hideCommentAvatar(commentEl) {
    if (commentEl.querySelector(".user-picture-holder .avatarPlaceholder") === null) //do not add the placeholder twice
    {
        let avatarEl = commentEl.querySelector(".user-picture-holder img");
        let altImageEl = document.createElement("img");
        altImageEl.className = "avatarPlaceholder";
        altImageEl.src = chrome.runtime.getURL("images/avatar-placeholder.png");

        insertAfter(altImageEl, avatarEl);

        avatarEl.style.display = "none";
    }
}

/**
 * Handler for clicking on the restore hidden comment button.
 * This removes the button and displays the comment's content.
 * @param {MouseEvent} event - Click event
 */
function showHiddenContentClick(event) {
    let clickedParagraph = event.target;
    let commentContentEl = clickedParagraph.parentElement.querySelector(COMMENT_CONTENT_QUERY);

    commentContentEl.style.display = "";
    clickedParagraph.remove();
}

/**
 * Handler for clicking on the restore hidden quote button.
 * This removes the button and displays the quote's content.
 * @param {MouseEvent} event - Click event
 */
function showHiddenQuoteClick(event) {
    let clickedParagraph = event.target;
    let quoteContentEl = clickedParagraph.parentElement.querySelector(QUOTE_CONTENT_QUERY);

    quoteContentEl.style.display = "";
    clickedParagraph.remove();
}

/**
 * Handler for clicking on the restore image button.
 * @param {MouseEvent} event - Click event
 * @param {boolean} wrapper - True if the element is around a custom wrapper
 */
function showHiddenImageClick(event, wrapper = false) {
    let targetEl = event.target;
    if (targetEl.tagName === "SPAN")
        targetEl = targetEl.parentElement;

    let pictureEl = targetEl.parentElement.querySelector(wrapper ? "img" : "picture, video");

    pictureEl.style.visibility = "";
    targetEl.remove();
}

/**
 * Returns true if an img shouldn't be hidden by filters.
 * @param {Element} imgEl - An img element
 * @returns {boolean} - Is the image whitelisted
 */
function isImgWhitelisted(imgEl) {
    let src = imgEl.getAttribute("src");

    if (src === null || src === "") //src may not be available if images are set to load while scrolling
        src = imgEl.getAttribute("data-src");

    if (src === null || src === "")
        return false;

    if (src === "clear.gif" ||
        src.indexOf("https://static.fcdn.co.il/smilies2") === 0 ||
        src.indexOf("https://images.fxp.co.il/smilies3") === 0)
        return true;

    let imgClassList = imgEl.classList;
    for (let i = 0; i < imgClassList.length; i++) {
        let className = imgClassList[i];
        if (className === "emojifxp" || className === "inlineimg")
            return true;
    }

    return false;
}

/**
 * Builds the element that is displayed when a block of text is hidden
 * @param {string} message - The message that should replace the block of text
 * @returns {Element} An element
 */
function buildHiddenText(message) {
    let paragraph = document.createElement("p");
    paragraph.className = "commentHiddenContent";
    let textNode = document.createTextNode(message);
    paragraph.appendChild(textNode);

    return paragraph;
}

/**
 * Builds the element that is displayed when an image is hidden
 * @returns {Element} An element
 */
function buildImageHiddenElement() {
    let container = document.createElement("div");
    container.className = "commentHiddenImage";
    let span = document.createElement("span");
    let textNode = document.createTextNode(MESSAGES.IMAGE_HIDDEN_CLICK);
    span.appendChild(textNode);
    container.append(span);

    return container;
}

/**
 * Calculates the difference, in days, between the given date and now.
 * @param {Date} date - A date
 * @returns {number} The difference in days
 */
function calcDayDelta(date) {
    let now = new Date();
    return (now - date) / (24 * 60 * 60 * 1000);
}

/**
 * Inserts an element after another.
 * @param {Element} newEl - The element that should be added
 * @param {Element} referenceEl - The element that should have something added after it
 */
function insertAfter(newEl, referenceEl) {
    referenceEl.parentNode.insertBefore(newEl, referenceEl.nextSibling);
}

/**
 * Wraps an element around another.
 * @param {Element} el - The element that should be wrapped
 * @param {Element} wrapperEl - The wrapping element
 */
function wrap(el, wrapperEl) {
    el.parentNode.insertBefore(wrapperEl, el);
    wrapperEl.appendChild(el);
}


var knownUsers = []; // {id, name, signupDate}
const KNOWN_USERS_LENGTH_LIMIT = 128;

/**
 * Reads and updates the known users collection from storage
 * @param {function} callback - Executes once the known users have been updated
 */
function updateKnownUsers(callback) {
    chrome.storage.local.get("knownUsers", data => {
        knownUsers = data.knownUsers || [];
        callback();
    });
}

/**
 * Adds a user to the known users collection
 * @param {number} id The user's ID in FxP
 * @param {string} name The user's name
 * @param {Date} signupDate The date the user signed up
 */

function addKnownUser(id, name, signupDate) {
    //remove duplicates
    let index = knownUsers.length - 1;
    while (index >= 0) {
        let user = knownUsers[index];
        if (user.id === id || user.name === name) {
            knownUsers.splice(index, 1);
        }
        index--;
    }

    let signupTime = signupDate.getTime();

    //add to the start of the array
    knownUsers.unshift({ id: id, name: name, signupTime: signupTime });
    //limit entry count
    while (knownUsers.length > KNOWN_USERS_LENGTH_LIMIT)
        knownUsers.pop();
    chrome.storage.local.set({ knownUsers: knownUsers });
}

/**
 * Searches for a user by name in the known users collection
 * @param {string} name The user's name
 * @returns {object} Object of structure {id, name, signupTime}
 */
function searchUserByName(name) {
    for (let index = 0; index < knownUsers.length; index++) {
        let user = knownUsers[index];
        if (user.name === name)
            return user;
    }
    return null;
}

/**
 * The magic starts here
 */

var preferences = {};
chrome.storage.sync.get("preferences", function (data) {
    //load prefs
    preferences = data.preferences || {};

    //default value handling
    if (preferences.hideImages === undefined) {
        preferences.hideImages = {
            enabled: false,
            dayDelta: 1
        };
    }
    if (preferences.hideComments === undefined) {
        preferences.hideComments = {
            enabled: false,
            dayDelta: 1
        };
    }

    updateKnownUsers(() => {
        if (isThread()) {
            //process every comment in the thread
            let comments = document.querySelectorAll("li.postbit");
            comments.forEach(comment => processComment(comment));

            let commentListObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === "#text") //sometimes, a newline added, and the post is added right after it
                            node = node.nextSibling;
                        processComment(node);
                    });
                });
            });

            //observe new comments added LIVE
            let commentListEl = document.getElementById("posts");
            if (commentListEl !== null)
                commentListObserver.observe(commentListEl, { childList: true });
        }
    });

});
