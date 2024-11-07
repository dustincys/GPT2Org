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
    // console.log(`We executed capture.js`);
}


function onExecutedCapture(result) {
    // console.log(`We executed Readability.js`);
    var capture_exec = browser.tabs.executeScript({ file: "capture.js" });
    capture_exec.then(onExecuted, onError);
}
function onError(error) {
    // console.log(`Error: ${error}`);
}

function runScripts() {
    var readability_exec = browser.tabs.executeScript({ file: "lib/Readability.js" });
    readability_exec.then(onExecutedCapture, onError);
}

chrome.runtime.onInstalled.addListener(function (details) {
    chrome.storage.sync.set({
        "ronProtocol": "capture",
        "ronTemplate": "orp",
        "rnnProtocol": "roam-ref",
        "rnnTemplate": "p",
        "clockedProtocol": "capture",
        "clockedTemplate": "orc",
        "journalProtocol": "capture",
        "journalTemplate": "orj",
        "apiKey": '',
        "modelName": 'gpt-4o-mini',
        "prompt": 'I will provide you a web page content. You should ignore the noise text in it. if it is a tumor biology or medicine related paper, please summarize in 4 sections: how the biology experiment design, how the data generated, what is the innovative points the paper proposed, what is the conclusion. If it is a software or algorithm or tool paper, please summarize in 5 sections: what is the input, what is the output, what is model or algorithm, what is the innovative points, and what is the conclusion.Please summarize each section in no more than 10 bullets in simple Chinese. If it is not a tumor biology or medicine related paper, please just summarze it in no more than 10 bullets in simple Chinese in total.',
        "useNewStyleLinks": true,
        "debug": false,
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        // alert('Icon clicked!');
        // console.log('Icon clicked!');
        runScripts();
    }
});

//                            Add summarize funcs                            //

async function hashString(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hashHex;
    });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarizeContent") {
        // console.log("request");
        // console.log(request);
        chrome.storage.sync.get(null, async(data) => {
            const apiKey = data.apiKey;
            const prompt = data.prompt;
            const model = data.modelName;
            const requestUrl = request.url;

            const hashedKey = await hashString(`${apiKey}${prompt}${model}${requestUrl}`);

            browser.storage.local.get(hashedKey).then((result) => {
                if (result.hasOwnProperty(hashedKey)) {
                    // Data exists for this URL hash
                    // console.log(`Data for URL hash ${hashedKey}:`, result[hashedKey]);

                    const summary = result[hashedKey];
                    const decodedTitle = decodeURIComponent(request.title);
                    const decodedURL = decodeURIComponent(request.url);

                    navigator.clipboard.writeText(`Title: ${decodedTitle}\nURL: ${decodedURL}\nSummary:\n${summary}`);
                    chrome.runtime.sendMessage({
                        "action": "apiRequestCompleted",
                        "success": true,
                        "summary": summary,
                        "url": request.url,
                        "title": request.title,
                    });
                } else {
                    // No data exists for this URL hash
                    // console.log(`No cached data found for URL hash ${hashedKey}`);

                    if (data.apiKey) {
                        const apiUrl = "https://api.openai.com/v1/chat/completions";

                        fetch(apiUrl, {
                            "method": "POST",
                            "headers": {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${apiKey}`,
                            },
                            body: JSON.stringify({
                                "model": model,
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": prompt,
                                    },
                                    {
                                        "role": "user",
                                        "content": request.content,
                                    },
                                ],
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
                                    const summary = data.choices[0].message.content.trim();
                                    const decodedTitle = decodeURIComponent(request.title);
                                    const decodedURL = decodeURIComponent(request.url);

                                    navigator.clipboard.writeText(`Title: ${decodedTitle}\nURL: ${decodedURL}\nSummary:\n${summary}`);

                                    browser.storage.local.set({ [hashedKey]: summary }).then(() => {
                                        // console.log('Data has been stored in cache');
                                    }).catch((error) => {
                                        console.error('Error saving data:', error);
                                    });

                                    chrome.runtime.sendMessage({
                                        "action": "apiRequestCompleted",
                                        "success": true,
                                        "summary": summary,
                                        "url": request.url,
                                        "title": request.title,
                                    });
                                } else {
                                    // console.error("Error: No summary data received from the API");
                                    chrome.runtime.sendMessage({
                                        "action": "apiRequestCompleted",
                                        "success": false,
                                    });
                                }
                            })
                            .catch((error) => {
                                // console.error("Error:", error);
                                chrome.runtime.sendMessage({
                                    "action": "apiRequestCompleted",
                                    "success": false,
                                });
                            });
                    }
                }
            });
        });
    }
});


// add org or org-roam protocol ///////////////////////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveOrg") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.ronProtocol +
                    "?template=" +
                    data.ronTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.ronProtocol +
                    ":/" +
                    data.ronTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            // console.log(uri); // Log the URI for debugging
            location.href = uri;
        });
    }
    if (request.action === "saveRoam") {
        chrome.storage.sync.get(null, (data) => {
            let uri = "org-protocol://" +
                data.rnnProtocol +
                "?template=" +
                data.rnnTemplate +
                "&ref=" +
                request.url +
                "&title=" +
                request.title +
                "&body=" +
                request.content;
            // console.log(uri); // Log the URI for debugging
            location.href = uri;
        });
    }
    if (request.action === "saveClocked") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.clockedProtocol +
                    "?template=" +
                    data.clockedTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.clockedProtocol +
                    ":/" +
                    data.clockedTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            // console.log(uri); // Log the URI for debugging
            location.href = uri;
        });
    }

    if (request.action === "saveJournal") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.journalProtocol +
                    "?template=" +
                    data.journalTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.journalProtocol +
                    ":/" +
                    data.journalTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            // console.log(uri); // Log the URI for debugging
            location.href = uri;
        });
    }
});
