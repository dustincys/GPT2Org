(function () {
    class Capture {
        constructor() {
            this.window = window;
            this.document = document;
            this.location = location;

            this.selection_text = escapeIt(window.getSelection().toString());
            if (!this.selection_text) {
                // get readability output here /////////////////////////////////////
                this.selection_text = getMainText();
            }

            if (this.debug) {
                logTEXT(this.selection_text);
            }

            this.encoded_url = encodeURIComponent(location.href);
            this.escaped_title = escapeIt(document.title);
        }
        capture() {
            chrome.runtime.sendMessage({
                action: "summarizeContent",
                content: this.selection_text,
                url: this.encoded_url,
                title: this.escaped_title,
            });
        }
        captureIt(options) {
            if (chrome.runtime.lastError) {
                alert(
                    "Could not capture url. Error loading options: " +
                    chrome.runtime.lastError.message
                );
                return;
            }
            // here, needs to check if options matters in this file ///////////
            for (var k in options) this[k] = options[k];

            this.capture();
        }

        getMainText() {
            var article = new Readability(this.document).parse();
            return article.textContent;
        }
    }

    function replace_all(str, find, replace) {
        return str.replace(new RegExp(find, "g"), replace);
    }

    function escapeIt(text) {
        return replace_all(
            replace_all(
                replace_all(encodeURIComponent(text), "[(]", escape("(")),
                "[)]",
                escape(")")
            ),
            "[']",
            escape("'")
        );
    }

    function logText(text) {
        window.console.log(
            "Capturing the following URI with new org-protocol: ",
            text
        );
        return text;
    }

    function getSelectionAsCleanHtml() {
        let selection = document.getSelection();
        if (!selection) {
            console.error("[To Developer] document.getSelection() is null???");
            return "ERROR";
        }

        // no text selected ///////////////////////////////////////////////////
        if (selection.rangeCount === 0) {
            let frames = document.getElementsByTagName("iframe");
            if (frames) {
                for (let i = 0; i < frames.length; i++) {
                    const frame = frames[i];
                    const contentDocument = frame.contentDocument;
                    if (!contentDocument) {
                        continue;
                    }
                    const tmpSel = contentDocument.getSelection();
                    if (!tmpSel) {
                        continue;
                    }
                    if (tmpSel.rangeCount > 0) {
                        selection = tmpSel;
                        break; // NOTE: Right?
                    }
                }
            }
        }

        if (selection.rangeCount === 0) {
            console.log(
                "[INFO] document.getSelection().rangeCount is 0. Return empty string."
            );
            return "";
        }

        const container = document.createElement("div");

        for (let i = 0; i < selection.rangeCount; ++i) {
            container.appendChild(selection.getRangeAt(i).cloneContents());
        }

        for (let a of container.getElementsByTagName("a")) {
            const href = a.getAttribute("href");
            if (!href) {
                continue;
            }
            if (href.startsWith("http")) {
                continue;
            }
            // const fixedHref = url.resolve(document.URL, href);
            // a.setAttribute("href", fixedHref);
            // url.resolve 已废弃
            const fixedHref = new URL(href, document.URL);
            a.setAttribute("href", fixedHref);
        }

        for (let img of container.getElementsByTagName("img")) {
            const src = img.getAttribute("src");
            if (!src) {
                continue;
            }
            if (src.startsWith("http")) {
                continue;
            }
            if (src.startsWith("data:")) {
                continue;
            }
            // const fixedSrc = url.resolve(document.URL, src);
            // img.setAttribute("src", fixedSrc);
            const fixedSrc = new URL("src", document.URL);
            img.setAttribute("src", fixedSrc);
        }

        const cleanHTML = container.innerHTML;
        return cleanHTML;
    }


    // Step1 create capture area to clean main text
    // Step2 gpt summarize
    // Step3 show the summarized text
    // Step4 return the summarize text or not

    //this.selection_markdown = turndownService.turndown('<h1>Hello world!</h1>');
    var capture = new Capture();
    var f = function (options) {
        capture.captureIt(options);
    };

    // what are options needed here? //////////////////////////////////////////
    // The debug option, need to show info in console /////////////////////////
    chrome.storage.sync.get(null, f);
})();


///////////////////////////////////////////////////////////////////////////////
//                            add summarize funcs                            //
///////////////////////////////////////////////////////////////////////////////

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarize") {
        const pageContent = document.body.innerText;
        chrome.runtime.sendMessage({
            action: "summarizeContent",
            content: pageContent,
        });
    }
});
