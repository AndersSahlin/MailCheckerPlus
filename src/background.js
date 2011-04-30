/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="jquery-1.4.2.js" />
/// <reference path="mailaccount.class.js" />
/// <reference path="settings.js" />

var img_notLoggedInSrc = "not_logged_in";
var img_noNewSrc = "no_new";
var img_newSrc = "new";
var iconSet = "set1";
var iconFormat = ".png";
var accounts;

var unreadCount;
var accountWithNewestMail;
var profilePhotos;

var canvas;
var canvasContext;
var gfx;
var rotation = 1;
var factor = 1;
var animTimer;
var loopTimer;
var animDelay = 10;

var audioElement = new Audio();

function getSettings() {
   return Settings;
}

reloadSettings();

function startAnimate() {
   if (Settings.read("animate_off") === false) {
      stopAnimateLoop();
      animTimer = setInterval("doAnimate()", animDelay);
      setTimeout("stopAnimate()", 2000);
      loopTimer = setTimeout("startAnimate()", 20000);
   }
}

function stopAnimate() {
   if (animTimer != null)
      clearTimeout(animTimer);
      
   setIcon(currentIcon);
   rotation = 1;
   factor = 1;
}

function stopAnimateLoop() {
   if (loopTimer != null)
      clearTimeout(loopTimer);

   stopAnimate();
}

function doAnimate() {
   canvasContext.save();
   canvasContext.clearRect(0, 0, canvas.width, canvas.height);
   canvasContext.translate(Math.ceil(canvas.width / 2), Math.ceil(canvas.height / 2));
   canvasContext.rotate(rotation * 2 * Math.PI);
   canvasContext.drawImage(gfx, -Math.ceil(canvas.width / 2), -Math.ceil(canvas.height / 2));
   canvasContext.restore();

   rotation += 0.01 * factor;

   if (rotation <= 0.9 && factor < 0)
      factor = 1;
   else if (rotation >= 1.1 && factor > 0)
      factor = -1;

   chrome.browserAction.setIcon({
      imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height)
   });
}

chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {
       var openInTab = Settings.read("open_tabs");
       var disableMailTo = Settings.read("no_mailto");

       if (request.getNewMail) {
          sendResponse({
             mailAccount: accountWithNewestMail,
             newMail: accountWithNewestMail.getNewestMail(),
             mailURL: accountWithNewestMail.getURL(),
             profilePhotos: profilePhotos
          });
       } else if (request.command == "getURL"
            && !disableMailTo
            && accounts != null
            && accounts.length > 0) {
          sendResponse({ URL: accounts[0].getURL(), openTab: openInTab });
       }
    }
);

function init() {
   canvas = document.getElementById('canvas');
   canvasContext = canvas.getContext('2d');
   gfx = document.getElementById('gfx');
}

function showNotification(title, message, callback) {
   localStorage.templateTitle = title;
   localStorage.templateText = message;
   window.templateCallback = callback;

   var notification = webkitNotifications.createHTMLNotification(chrome.extension.getURL("template.html"));
   notification.onclose = function () {
      delete localStorage.templateTitle;
      delete localStorage.templateText;
      window.templateCallback = null;
   };
   notification.show();
}

function reloadSettings() {

   setIcon(img_notLoggedInSrc);
   chrome.browserAction.setBadgeBackgroundColor({ color: [190, 190, 190, 255] });
   chrome.browserAction.setBadgeText({ text: "?" });
   chrome.browserAction.setTitle({ title: "Loading settings..." });

   Settings.load(function () {
      unreadCount = 0;
      reloadLanguage();

      iconSet = Settings.read("icon_set");
      setIcon(img_notLoggedInSrc);
      
      var storedVersion = Settings.read("version");
      if (storedVersion == null || storedVersion != VERSION) {
         Settings.store("version", VERSION);

         var updateTitle = "New version installed";
         var updateMessage = "The extension has been updated to the latest version (" + VERSION + ")." +
         "<br />" + "<br />" +
         "Click to view the change log.";

         showNotification(updateTitle, updateMessage, function () {
            chrome.tabs.create({ url: "about.html" });
         });
      }

      if (accounts != null) {
         $.each(accounts, function (i, account) {
            account.stopScheduler();
            account = null;
            delete account;
         });
      }
      accounts = new Array();
      profilePhotos = {};

      chrome.browserAction.setBadgeText({ text: "..." });
      chrome.browserAction.setTitle({ title: "Polling accounts..." });

      if (Settings.read("check_gmail_off") === false) {
         // Check if user has enabled multiple sessions
         $.ajax({
            url: "https://www.google.com/accounts/AddSession",
            timeout: 10000,
            success: function (data) {
               // Multiple accounts active
               var matches = data.match(/<li>([\S]+?@[\S]+)[<|\S]/ig);
               //console.log(matches);

               if (matches != null && matches.length > 0) {
                  for (var n = 0; n < matches.length; n++) {
                     var acc = new MailAccount({ accountNr: n });
                     acc.onError = mailError;
                     acc.onUpdate = mailUpdate;
                     accounts.push(acc);
                  }
               }

               reloadSettings_complete();
            },
            error: function (objRequest) { },
            complete: function () {
               if (accounts.length == 0) {
                  // No multiple accounts - just check default Gmail
                  var acc = new MailAccount({});
                  acc.onError = mailError;
                  acc.onUpdate = mailUpdate;
                  accounts.push(acc);
                  reloadSettings_complete();
               }
            }
         });
      } else {
         reloadSettings_complete();
      }
   });
}

function reloadSettings_complete() {
   if (Settings.read("accounts") != null) {
      var savedAccounts = Settings.read("accounts");
      $.each(savedAccounts, function (i, savedAccount) {
         if (savedAccount.domain == null)
            return;

         var acc = new MailAccount({ domain: savedAccount.domain });
         acc.onError = mailError;
         acc.onUpdate = mailUpdate;
         accounts.push(acc);
      });
   }

   //console.log(accounts.length);
   stopAnimateLoop();
   gfx.src = "icons/" + iconSet + "/new" + iconFormat;

   // Start request loop
   window.setTimeout(startRequest, 0);
}

// Sets the browser action icon
var currentIcon;
function setIcon(iconName) {
   currentIcon = iconName;
   var iconPath = "icons/" + iconSet + "/" + iconName + iconFormat;
   try {
      chrome.browserAction.setIcon({ path: iconPath });
   } catch (e) {
      console.error("Could not set browser action icon '" + currentIcon + "'.");
   }
}

// Request loop starter
function startRequest() {
   $.each(accounts, function (i, account) {
      if (account != null) {
         window.setTimeout(account.startScheduler, 500 * i);
      }
   });
}

// Called when an account has received a mail update
function mailUpdate(_account) {
   stopAnimateLoop();
   var hideCount = Settings.read("hide_count");

   var newUnreadCount = 0;
   $.each(accounts, function (i, account) {
      if (account != null && account.getUnreadCount() > 0) {
         newUnreadCount += account.getUnreadCount();
      }
   });

   if (_account.getNewestMail() != null) {
      accountWithNewestMail = _account;
   }

   if (hideCount || newUnreadCount < 1) {
      chrome.browserAction.setBadgeText({ text: "" });
   } else {
      chrome.browserAction.setBadgeText({ text: newUnreadCount.toString() });
   }

   switch (newUnreadCount) {
      case 0:
         setIcon(img_noNewSrc);
         chrome.browserAction.setBadgeBackgroundColor({ color: [110, 140, 180, 255] });
         chrome.browserAction.setTitle({ title: i18n.get('noUnreadText') });
         break;
      case 1:
         setIcon(img_newSrc);
         chrome.browserAction.setBadgeBackgroundColor({ color: [200, 100, 100, 255] });
         chrome.browserAction.setTitle({ title: newUnreadCount + " " + ((i18n.get('oneUnreadText')) ? i18n.get('oneUnreadText') : i18n.get('severalUnreadText')) });
         break;
      default:
         setIcon(img_newSrc);
         chrome.browserAction.setBadgeBackgroundColor({ color: [200, 100, 100, 255] });
         chrome.browserAction.setTitle({ title: newUnreadCount + " " + i18n.get('severalUnreadText') });
         break;
   }

   if (newUnreadCount > unreadCount && accountWithNewestMail != null) {
      var newestMail = accountWithNewestMail.getNewestMail();
      var mailIdHash = $.md5(newestMail.id);
      var addressHash = $.md5(accountWithNewestMail.getAddress());

      if (mailIdHash != localStorage[addressHash + "_newest"]) {
         setTimeout('playSound()', 0);
         setTimeout('startAnimate()', 0);
         setTimeout('notify(accountWithNewestMail)', 0);
         localStorage[addressHash + "_newest"] = mailIdHash;
      }
   }

   unreadCount = newUnreadCount;
}

// Called when an account has experienced an error
function mailError(_account) {
   setIcon(img_notLoggedInSrc);
   chrome.browserAction.setBadgeBackgroundColor({ color: [190, 190, 190, 255] });
   chrome.browserAction.setBadgeText({ text: "X" });
   chrome.browserAction.setTitle({ title: "Not logged in" });
   unreadCount = 0;
}

// Plays a ping sound
function playSound() {
   if (Settings.read("sound_off"))
      return;

   var source = Settings.read("sn_audio");

   if (source == "custom") {
      source = Settings.read("sn_audio_raw");
   }

   try {
      audioElement.src = source;
      audioElement.load();
      audioElement.play();
   } catch (e) {
      console.error(e);
   }
}

// Displays a notification popup
function notify(accountWithNewestMail) {
   if (Settings.read("show_notification")) {
      try {
         var notification = webkitNotifications.createHTMLNotification(chrome.extension.getURL("notify.html"));

         var timeout = Settings.read("dn_timeout");

         notification.show();

         if (timeout != 0) {
            setTimeout(function () {
               notification.cancel();
            }, timeout);
         }

      } catch (e) {
         console.error(e);
      }
   }
}