/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="jquery-1.4.2.js" />
/// <reference path="mailaccount.class.js" />

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

function startAnimate() {
   if (localStorage["gc_animate_off"] == null ||
        localStorage["gc_animate_off"] == "false") {
      stopAnimateLoop();
      animTimer = setInterval("doAnimate()", animDelay);
      setTimeout("stopAnimate()", 2000);
      loopTimer = setTimeout("startAnimate()", 20000);
   }
}

function stopAnimate() {
   if (animTimer != null)
      clearTimeout(animTimer);

   if (unreadCount > 0)
      setIcon(img_newSrc);
   else
      setIcon(img_noNewSrc);

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
   canvasContext.clearRect(
        0,
        0,
        canvas.width,
        canvas.height);
   canvasContext.translate(
        Math.ceil(canvas.width / 2),
        Math.ceil(canvas.height / 2));
   canvasContext.rotate(rotation * 2 * Math.PI);
   canvasContext.drawImage(
        gfx,
        -Math.ceil(canvas.width / 2),
        -Math.ceil(canvas.height / 2));
   canvasContext.restore();

   rotation += 0.01 * factor;

   if (rotation <= 0.9 && factor < 0)
      factor = 1;
   else if (rotation >= 1.1 && factor > 0)
      factor = -1;

   chrome.browserAction.setIcon({
      imageData: canvasContext.getImageData(
            0,
            0,
            canvas.width,
            canvas.height)
   });
}

chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {
       var openInTab = (localStorage["gc_open_tabs"] != null && localStorage["gc_open_tabs"] == "true");
       var disableMailTo = (localStorage["gc_no_mailto"] != null && localStorage["gc_no_mailto"] == "true");
       if (request.getNewMail) {
          sendResponse({
             mailAccount: accountWithNewestMail,
             newMail: accountWithNewestMail.getNewestMail(),
             mailURL: accountWithNewestMail.getURL(),
             profilePhotos: profilePhotos
          });
       }
       else if (request.command == "getURL"
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

   reloadSettings();
}

function reloadSettings() {
   unreadCount = 0;

   if (localStorage["gc_poll"] == null)
      localStorage["gc_poll"] = 15000;

   reloadLanguage();

   iconSet = localStorage["gc_icon_set"];
   if (iconSet == null || iconSet == "")
      iconSet = localStorage["gc_icon_set"] = "set1";

   setIcon(img_notLoggedInSrc);
   chrome.browserAction.setBadgeBackgroundColor({ color: [190, 190, 190, 255] });
   chrome.browserAction.setBadgeText({ text: "?" });
   chrome.browserAction.setTitle({ title: "Loading settings..." });

   if (localStorage["gc_preview_setting"] == null ||
        localStorage["gc_preview_setting"] == "") {
      localStorage["gc_preview_setting"] = "2";
   }

   if (localStorage["gc_show_notification"] == null ||
        localStorage["gc_show_notification"] == "") {
      localStorage["gc_show_notification"] = "true";
   }

   if (localStorage["gc_version"] == null ||
        localStorage["gc_version"] != "1.2") {
      localStorage["gc_version"] = "1.2";
      chrome.tabs.create({ url: "about.html" });
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

   if (localStorage["gc_check_gmail_off"] == null ||
        localStorage["gc_check_gmail_off"] == "false") {
      // Check if user has enabled multiple sessions
      $.ajax({
         url: "https://www.google.com/accounts/AddSession",
         success: function (data) {
            // Multiple accounts active
            var matches = data.match(/<li>([\S]+?@[\S]+)[<|\S]/ig);
            console.log(matches);

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
		 complete: function() { 
			if(accounts.length == 0) {
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
}

function reloadSettings_complete() {
   if (localStorage["gc_accounts"] != null) {
      var savedAccounts = eval(localStorage["gc_accounts"]);
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
function setIcon(iconName) {
   var fullPath = "icons/" + iconSet + "/" + iconName + iconFormat;
   try {
      chrome.browserAction.setIcon({ path: fullPath });
   } catch (e) {
      console.error("Could not set browser action icon '" + fullPath + "'.");
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
   var hideCount = localStorage["gc_hide_count"];

   var newUnreadCount = 0;
   $.each(accounts, function (i, account) {
      if (account != null && account.getUnreadCount() > 0) {
         newUnreadCount += account.getUnreadCount();
      }
   });

   if (_account.getNewestMail() != null) {
      accountWithNewestMail = _account;
   }

   if (hideCount == "true" || newUnreadCount < 1)
      chrome.browserAction.setBadgeText({ text: "" });
   else
      chrome.browserAction.setBadgeText({ text: newUnreadCount.toString() });

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

   if (newUnreadCount > unreadCount) {
      playSound();
      startAnimate();
      if (accountWithNewestMail != null) {
         notify(accountWithNewestMail);
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
   if (localStorage["gc_sound_off"] != null && localStorage["gc_sound_off"] == "true")
      return;

   try {
      //        document.getElementById('notify_sound').load();
      document.getElementById('notify_sound').play();
   }
   catch (e) {
      console.error(e);
   }
}

// Displays a notification popup 
function notify(accountWithNewestMail) {
   if (localStorage["gc_show_notification"] != null && localStorage["gc_show_notification"] == "true") {
      try {
         var notification = webkitNotifications.createHTMLNotification(chrome.extension.getURL("notify.html"));
         var timeout = 15;

         notification.show();
         setTimeout(function () {
            notification.cancel();
         },
            timeout * 1000);

         //if (profilePhotos[newestMail] != null) {

         /*} else {		
         $.ajax({
         url: "http://socialgraph.apis.google.com/otherme?q=" + newestMail.authorMail,
         success: function(data) {
         JSON.parse(data.toString(),
         function(key, value) {
         if (value && typeof value === 'string' && key == 'photo') {
         profilePhotos[newestMail.authorMail] = value;
         }
         return value;
         });
         },
         complete: function(request, status) {
         notification.show();
         setTimeout(function() {
         notification.cancel();
         },
         timeout * 1000);
         }
         });
         notification.show();
         setTimeout(function() {
         notification.cancel();
         }, timeout * 1000);
         }*/

      } catch (e) {
         console.error(e);
      }
   }
}

function getLabels(mailURL, callback) {
   var getURL = mailURL + "h/" + Math.ceil(1000000 * Math.random()) + "/?v=prl";
   $.ajax({
      url: getURL,
      success: function (data) {
         var labelArray = new Array();
         var labelPage = $(data);
         var labels = $("div.prf > table > tbody > tr > td > b > a", labelPage);
         labels.each(function (i) {
            labelArray.push($(this)[0].innerText);
         });

         if (callback != null) {
            setTimeout(callback(labelArray), 0);
         }
      }
   });
}