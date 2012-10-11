/**
  * Author: James Mortensen
  * james.mortensen@voicecurve.com
  *
  * This is a wrapper that encapsulates window.localStorage and chrome.storage.local and determines
  * at run time whether or not to use window.localStorage or the Chrome Packaged Apps APIs.
  *
  * If a packaged app is detected, the Chrome wrapper loads local storage and passes the data
  * to the sandboxed pages using postMessage.
  *
  * The purpose of the wrapper is to handle differences in local storage while creating a sandboxed
  * environment to run the sipML5 client inside a packaged app while still maintaining the ability
  * to run the sipML5 code on an HTTP server, without modifications to the code.
  *
  * This is licensed under the GPL3.
  *
  */
    var storageAPI = function() { };

    // determine at runtime whether or not this code is running in an extension/Packaged App
    storageAPI.CHROME_EXTENSION = window.location.protocol == "chrome-extension:" ? true : false;

    // container to store the contents of the chrome app local storage and transfer it back and forth
    storageAPI.storage = [];

    /**
     * This is invoked from the sipML5 client to retrieve a value based on a key.
     */ 
    storageAPI.getItem = function(key) {
        if(storageAPI.CHROME_EXTENSION == false) {
            return window.localStorage.getItem(key);
        } else {
            return storageAPI.storage[key];
        }
    };


    /**
     * This is invoked from the sipML5 client to set a value based on a key. The storage array is
     * passed back from the sandboxed sipML5 client to the wrapper, if running in a chrome app.
     *
     * If sipML5 is NOT running in a chrome app, then the key/value pair is stored in localStorage.
     */
    storageAPI.setItem = function(key, value) {
        if(storageAPI.CHROME_EXTENSION == false) {
            return window.localStorage.setItem(key, value);
        } else {
            storageAPI.storage[key] = value;
            // send back to the wrapper to store
            storageAPI.wrapper.source.postMessage({'command':'writeStorage', 'storage': storageAPI.storage}, storageAPI.wrapper.origin);
            
        }

    };

    /* Register sandbox delegators, Perform the sipML5 init (passed into the callback from sipML5) */
    storageAPI.initSandbox = function(callback) { console.info("initSandbox");
        if(storageAPI.CHROME_EXTENSION == true) {
            console.debug("inner storage contains = " + storageAPI.storage.toString());
            if(callback) { 
                console.info("invoke callback in initSandbox after initializing chrome app...");
                callback();
            }
        } else if(callback) {
            console.info("invoke callback only...");
            callback();
        }
            
    };

    /* Get data out of storage and pass into the sandbox */
    storageAPI.initWrapper = function() {
        if(storageAPI.CHROME_EXTENSION == true) {
            chrome.storage.local.get(null, function(items) {
                storageAPI.storage = items == undefined ? [] : items;
                console.info("invoke message passing to inner sandbox...");
                storageAPI.delegator();
                var message = {
                    command: 'initStorageAPI',
                    storage: storageAPI.storage
                };
                var sandboxFrames = document.querySelectorAll('iframe.sandbox'); 
                for(var i = 0; i < sandboxFrames.length; i++) {
                    sandboxFrames[i].contentWindow.postMessage(message, '*'); 
                }
             
            });
        } 
    };

    // since each sandboxed page exists in an iframe, update sandbox storage on page transition
    storageAPI.updateSandboxStorage = function(id) {
	var message = {
	    command: 'updateSandboxStorage',
	    storage: storageAPI.storage
	};
	document.getElementById(id).contentWindow.postMessage(message, '*'); 
    }; 


    /**
     * This listens for events, both in the wrapper and sandboxes, to handle postMessage requests.
     */ 
    storageAPI.delegator = function(event) {
        window.addEventListener('message', function(event) {
            console.info("Message received from wrapper = " + JSON.stringify(event.data));
            console.info("location = " + window.location.href);
            switch(event.data.command) {

                case 'initStorageAPI':
                    storageAPI.storage = event.data.storage;  result = "It's alive!!!";
                    storageAPI.sandbox.window.onload();
                    console.info("Prepare to postMessage back to the wrapper...");
                    storageAPI.wrapper = event;
                    event.source.postMessage({'command':'initStorageComplete','result': result}, event.origin);
                break;
                case 'updateSandboxStorage':
                    // since each sandboxed page exists in an iframe, update sandbox storage on page transition
                    storageAPI.storage = event.data.storage; 
                break;
                case 'writeStorage': // receive storage from sandbox in wrapper and save
                    console.info("calling write storage event from " + window.location.path + "...");
                    storageAPI.storage = event.data.storage;
                    chrome.storage.local.set(event.data.storage);
                break;
                case 'initStorageComplete':
                    result = "It's alive!!!";
                    console.info("Prepare to postMessage back to the wrapper...");
                    //event.source.postMessage({'command':'writeStorage','result': result}, event.origin);
                break;
                default:
                    console.warn("default:");
                    console.warn("Action " + event.data.command + " not defined in storageAPI.delegator");
                break;
            }
        });
    };

    // stores original onload event for expert.htm and call.htm
    storageAPI.sandbox = { "window" : { "onload" : {} } };

    // this is the event object pointing back to the wrapper
    storageAPI.wrapper;


