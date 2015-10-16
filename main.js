/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/trunk/apps/app.runtime.html
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */

// Chrome v24
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('mainpage.html',
    {width: 1190, height: 709});
});

