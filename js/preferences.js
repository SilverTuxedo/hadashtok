"use strict";

/**
 * Saves the preferences to storage.
 */
function savePref() {
    let hideImagesEnabled = document.getElementById("hideImagesEnabled").checked;
    let hideImagesDays = parseInt(document.getElementById("hideImagesDays").value);
    let hideCommentsEnabled = document.getElementById("hideCommentsEnabled").checked;
    let hideCommentsDays = parseInt(document.getElementById("hideCommentsDays").value);

    if (isNaN(hideImagesDays) || hideImagesDays <= 0) {
        document.getElementById("hideImagesDays").value = 1;
        hideImagesDays = 1;
    }

    if (isNaN(hideCommentsDays) || hideCommentsDays <= 0) {
        document.getElementById("hideCommentsDays").value = 1;
        hideCommentsDays = 1;
    }

    let preferences = {
        hideImages: {
            enabled: hideImagesEnabled,
            dayDelta: hideImagesDays
        },
        hideComments: {
            enabled: hideCommentsEnabled,
            dayDelta: hideCommentsDays
        }
    };

    chrome.storage.sync.set({
        "preferences": preferences
    }, function () {
        console.log("saved preferences");
    });
}

let saveTimeout = 0;
/**
 * Saves the preferences to storage, with a cooldown of 0.5s.
 */
function saveWithCooldown() {
    window.clearTimeout(saveTimeout);
    saveTimeout = setTimeout(savePref, 500);
}

/**
 * Reads the preferences from storage and updates the inputs accordingly
 */
function readPref() {
    chrome.storage.sync.get("preferences", function (data) {
        let preferences = data.preferences || {};

        if (preferences.hideImages) {
            document.getElementById("hideImagesEnabled").checked = preferences.hideImages.enabled || false;
            document.getElementById("hideImagesDays").value = preferences.hideImages.dayDelta || 1;
        }
        if (preferences.hideComments) {
            document.getElementById("hideCommentsEnabled").checked = preferences.hideComments.enabled || false;
            document.getElementById("hideCommentsDays").value = preferences.hideComments.dayDelta || 1;
        }
    });
}

readPref();

let inputs = document.getElementsByTagName("input");

//bind every input to save with cooldown once it is updated
for (let element of inputs) {
    if (element.type === "number")
        element.addEventListener("keydown", saveWithCooldown);
    else
        element.addEventListener("change", saveWithCooldown);
}