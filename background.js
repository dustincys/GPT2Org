///////////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015-2017 Konstantin Kliakhandler				 //
// 										 //
// Permission is hereby granted, free of charge, to any person obtaining a copy	 //
// of this software and associated documentation files (the "Software"), to deal //
// in the Software without restriction, including without limitation the rights	 //
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell	 //
// copies of the Software, and to permit persons to whom the Software is	 //
// furnished to do so, subject to the following conditions:			 //
// 										 //
// The above copyright notice and this permission notice shall be included in	 //
// all copies or substantial portions of the Software.				 //
// 										 //
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR	 //
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,	 //
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE	 //
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER	 //
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, //
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN	 //
// THE SOFTWARE.								 //
///////////////////////////////////////////////////////////////////////////////////

function onExecuted(result) {
    console.log(`We executed capture.js`);

}

function onExecutedTurndownPlugin(result) {
    console.log(`We executed turndown.js`);
    var turndown_plugin_exec = browser.tabs.executeScript({ file: "lib/turndown-plugin-gfm.js" });
    turndown_plugin_exec.then(onExecutedCapture, onError);
}

function onExecutedCapture(result) {
    console.log(`We executed turndown-plugin-gfm.js`);
    // Add readability.js library
    // Add gpt listener
    // Add org-roam capture listener
    // then execute capture
    var capture_exec = browser.tabs.executeScript({ file: "capture.js" });
    capture_exec.then(onExecuted, onError);
}
function onError(error) {
    console.log(`Error: ${error}`);
}

function runScripts() {
    var turndown_exec = browser.tabs.executeScript({ file: "lib/turndown.js" });
    turndown_exec.then(onExecutedTurndownPlugin, onError);
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install")
        chrome.storage.sync.set({
            selectedProtocol: "roam-ref",
            selectedTemplate: "p",
            unselectedTemplate: "L",
            useNewStyleLinks: true,
            debug: false,
            overlay: true,
        });
    else if (
        details.reason == "update" &&
        details.previousVersion.startsWith("0.1")
    )
        chrome.storage.sync.set({
            selectedProtocol: "roam-ref",
            selectedTemplate: "p",
            unselectedTemplate: "L",
            useNewStyleLinks: false,
            debug: false,
            overlay: true,
        });
});


///////////////////////////////////////////////////////////////////////////////
//                             onClicked Listener                            //
///////////////////////////////////////////////////////////////////////////////
chrome.browserAction.onClicked.addListener(function (tab) {
    // chrome.tabs.executeScript({ file: "lib/turndown.js" });
    // chrome.tabs.executeScript({ file: "lib/turndown-plugin-gfm.js" });
    // chrome.tabs.executeScript({ file: "capture.js" });
    // fix some time turndown.js not load.
    runScripts();
});


browser.menus.create(
    {
        id: "org-capture-selection",
        title: "Capture Selection",
        contexts: ["selection"],
        documentUrlPatterns: ["<all_urls>"],  // "https://*" not works...
        icons: {
            "16": "img/icon16.png",
            "32": "img/icon32.png"
        }
    },
    () => {
        if (browser.runtime.lastError)
            console.log(`Error: ${browser.runtime.lastError}`)
    }
)

browser.menus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "org-capture-selection") {
        // console.log(info.selectionText);
        runScripts();
    }
});



///////////////////////////////////////////////////////////////////////////////
//                            Add summarize funcs                            //
///////////////////////////////////////////////////////////////////////////////


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarizeContent") {
        chrome.storage.sync.get(null, (data) => {
            if (data.apiKey) {
                const apiKey = data.apiKey;
                const apiUrl = "https://api.openai.com/v1/completions";
                // const prompt = `Summarize the following text:\n\n${request.content}\n\nSummary:`;
                const prompt = data.prompt;
                const model = data.modelName;

                fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: model,
                        message: [
                            {
                                role: "system",
                                content: prompt,
                            },
                            {
                                role: "user",
                                content: request.content,
                            }
                        ]
                    }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(
                                `API request failed with status ${response.status}`
                            );
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (data.choices && data.choices.length > 0) {
                            const summary = data.choices[0].text.trim();
                            chrome.runtime.sendMessage({
                                action: "apiRequestCompleted",
                                success: true,
                                summary: summary,
                                url: request.url,
                                title: request.title,

                            });
                        } else {
                            console.error("Error: No summary data received from the API");
                            chrome.runtime.sendMessage({
                                action: "apiRequestCompleted",
                                success: false,
                            });
                        }
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                        chrome.runtime.sendMessage({
                            action: "apiRequestCompleted",
                            success: false,
                        });
                    });
            }
        });
    }
});


// add org or org-roam protocol ///////////////////////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "org") {

    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "org-roam") {
    }
});
