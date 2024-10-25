(function () {
    class Capture {
        constructor() {
            this.window = window;
            this.document = document;
            this.location = location;

            this.selection_text = escapeIt(window.getSelection().toString());
            if (!this.selection_text) {
                this.selection_text = this.getMainText();
            }

            if (this.debug) {
                logTEXT(this.selection_text);
            }

            this.encoded_url = encodeURIComponent(location.href);
            this.escaped_title = escapeIt(document.title);
        }
        capture() {
            chrome.runtime.sendMessage({
                "action": "summarizeContent",
                "content": this.selection_text,
                "url": this.encoded_url,
                "title": this.escaped_title,
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

            for (var k in options) this[k] = options[k];
            this.capture();
        }

        getMainText() {
            var documentClone = this.document.cloneNode(true);
            var article = new Readability(documentClone).parse();
            return article.textContent;
        }
    }

    function escapeIt(text) {
        return encodeURIComponent(text)
            .replace(/\(/g, "%28")  // Escape '('
            .replace(/\)/g, "%29")  // Escape ')'
            .replace(/'/g, "%27");   // Escape "'"
    }

    function logTEXT(text) {
        window.console.log(
            "Capturing the following URI with new org-protocol: ",
            text
        );
        return text;
    }

    var capture = new Capture();
    var f = function (options) {
        capture.captureIt(options);
    };

    chrome.storage.sync.get(null, f);
})();
