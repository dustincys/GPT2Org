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


// Saves options to chrome.storage.sync.
function save_options() {

    var ronProtocol = document.getElementById('ronProtocol').value;
    var ronTemplate = document.getElementById('ronTemplate').value;

    var rnnProtocol = document.getElementById('rnnProtocol').value;
    var rnnTemplate = document.getElementById('rnnTemplate').value;

    var clockedProtocol = document.getElementById('clockedProtocol').value;
    var clockedTemplate = document.getElementById('clockedTemplate').value;

    var journalProtocol = document.getElementById('journalProtocol').value;
    var journalTemplate = document.getElementById('journalTemplate').value;

    var elfeedProtocol = document.getElementById('elfeedProtocol').value;
    var elfeedTemplate = document.getElementById('elfeedTemplate').value;

    var apiKey = document.getElementById('apiKey').value;
    var modelName = document.getElementById('modelName').value;
    var prompt = document.getElementById('prompt').value;

    var apiKeyDS = document.getElementById('apiKeyDS').value;
    var modelNameDS = document.getElementById('modelNameDS').value;

    var toUseModel = document.getElementById('toUseModelForm').checked;

    var NewStyleP = document.getElementById('useNewStyle').checked;
    var debugP = document.getElementById('debug').checked;

    chrome.storage.sync.set({
        "ronProtocol": ronProtocol,
        "ronTemplate": ronTemplate,
        "rnnProtocol": rnnProtocol,
        "rnnTemplate": rnnTemplate,
        "clockedProtocol": clockedProtocol,
        "clockedTemplate": clockedTemplate,
        "journalProtocol": journalProtocol,
        "journalTemplate": journalTemplate,
        "elfeedProtocol": elfeedProtocol,
        "elfeedTemplate": elfeedTemplate,
        "apiKey": apiKey,
        "modelName": modelName,
        "apiKeyDS": apiKeyDS,
        "modelNameDS": modelNameDS,
        "apiKeyKM": apiKeyKM,
        "modelNameKM": modelNameKM,
        "prompt": prompt,
        "useNewStyleLinks": NewStyleP,
        "toUseModel": toUseModel,
        "debug": debugP,
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get(null, function (options) {
        document.getElementById('ronProtocol').value = options.ronProtocol;
        document.getElementById('ronTemplate').value = options.ronTemplate;
        document.getElementById('rnnProtocol').value = options.rnnProtocol;
        document.getElementById('rnnTemplate').value = options.rnnTemplate;
        document.getElementById('clockedProtocol').value = options.clockedProtocol;
        document.getElementById('clockedTemplate').value = options.clockedTemplate;
        document.getElementById('journalProtocol').value = options.journalProtocol;
        document.getElementById('journalTemplate').value = options.journalTemplate;
        document.getElementById('elfeedProtocol').value = options.elfeedProtocol;
        document.getElementById('elfeedTemplate').value = options.elfeedTemplate;
        document.getElementById('apiKey').value = options.apiKey;
        document.getElementById('modelName').value = options.modelName;
        document.getElementById('apiKeyDS').value = options.apiKeyDS;
        document.getElementById('modelNameDS').value = options.modelNameDS;
        document.getElementById('apiKeyKM').value = options.apiKeyKM;
        document.getElementById('modelNameKM').value = options.modelNameKM;
        document.getElementById('prompt').value = options.prompt;
        document.getElementById('useNewStyle').checked = options.useNewStyleLinks;
        document.getElementById('toUseModelForm').checked = options.toUseModel;
        document.getElementById('debug').checked = options.debug;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);

