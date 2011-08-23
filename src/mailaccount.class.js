/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="jquery-1.4.2.js" />
/// <reference path="encoder.js" />

/* 
*********************************
MailAccount class
by Anders Sahlin a.k.a. destructoBOT (malakeen@gmail.com)
for Mail Checker Plus for Google Mail�
https://chrome.google.com/extensions/detail/gffjhibehnempbkeheiccaincokdjbfe
*********************************
*/

function MailAccount(settingsObj) {
   var requestTimeout = 10000;

   // Check global settings
   var pollInterval = Settings.read("poll");
   var openInTab = Settings.read("open_tabs");
   var archiveAsRead = Settings.read("archive_read");

   // Always use SSL, things become messy otherwise
   var mailURL = "https://mail.google.com";

   if (settingsObj.domain != null) {
      // This is a GAFYD account
      mailURL += "/a/" + settingsObj.domain + "/";
   } else if (settingsObj.accountNr != null) {
      // This is a Google account with multiple sessions activated
      mailURL += "/mail/u/" + settingsObj.accountNr + "/";
   } else {
      // Standard one-session Gmail account
      mailURL += "/mail/";
   }

   var inboxLabel = Settings.read("open_label");
   var atomLabel = Settings.read("check_label");
   
   var mailArray = new Array();
   var newestMail;
   var unreadCount = -1;
   var mailTitle;
   var mailAddress;
   var abortTimerId;
   var gmailAt = null;
   var errorLives = 5;
   var isStopped = false;
   var requestTimer;

   var GLOBALS = null;
   var LABELS = null;

   this.onUpdate;
   this.onError;
   this.isDefault;

   // Debug output (if enabled, might cause memory leaks)
   var verbose = true;

   // Without this/that, no internal calls to onUpdate or onError can be made...
   var that = this;
   
   function onGetInboxSuccess(data, callback) {
      var foundNewMail = false; 
      var parser = new DOMParser();
      xmlDocument = $(parser.parseFromString(data, "text/xml"));
      var fullCount = xmlDocument.find('fullcount').text();

      try {
         mailTitle = $(xmlDocument.find('title')[0]).text().replace("Gmail - ", "");
         mailAddress = mailTitle.match(/([\S]+@[\S]+)/ig)[0];
      } catch (e) {
         console.error(e);
         return;
      }

      //newestMail = null;
      var newMailArray = new Array();

      if (fullCount < unreadCount || unreadCount == -1) {
         // Mail count has been reduced, so we need to reload all mail.
         // TODO: Find the old mail(s) and remove them instead.
         foundNewMail = true;
         mailArray = new Array();
      }

      // Parse xml data for each mail entry
      xmlDocument.find('entry').each(function () {
         var title = $(this).find('title').text();
         var shortTitle = title;
         var summary = $(this).find('summary').text();
         var issued = (new Date()).setISO8601($(this).find('issued').text());
         var link = $(this).find('link').attr('href');
         var id = link.replace(/.*message_id=(\d\w*).*/, "$1");
         var authorName = $(this).find('author').find('name').text();
         var authorMail = $(this).find('author').find('email').text();

         // Data checks
         if (authorName == null || authorName.length < 1)
            authorName = "(unknown sender)";

         if (title == null || title.length < 1) {
            shortTitle = title = "(No subject)";
         } else if (title.length > 55) {
            shortTitle = title.substr(0, 55).trim() + "...";
         }

         // Encode content to prevent XSS attacks
         title = Encoder.XSSEncode(title, true);
         shortTitle = Encoder.XSSEncode(shortTitle, true);
         summary = Encoder.XSSEncode(summary, true);
         authorMail = Encoder.XSSEncode(authorMail, true);
         authorName = Encoder.XSSEncode(authorName, true);

         // Construct a new mail object
         var mailObject = {
            "id": id,
            "title": title,
            "shortTitle": shortTitle,
            "summary": summary,
            "link": link,
            "issued": issued,
            "authorName": authorName,
            "authorMail": authorMail
         };

         var isNewMail = true;
         $.each(mailArray, function (i, oldMail) {
            if (oldMail.id == mailObject.id)
               isNewMail = false; // This mail is not new
         });

         if (isNewMail) {
            foundNewMail = true;
            newMailArray.push(mailObject);
         }
      });
      
      // Sort new mail by date
      newMailArray.sort(function (a, b) {
         if (a.issued > b.issued)
            return -1;
         if (a.issued < b.issued)
            return 1;
         return 0;
      });

      // See if there is a new mail present
      if (newMailArray.length > 0) {
         newestMail = newMailArray[0];
      }

      // Insert new mail into mail array
      $.each(newMailArray, function (i, newMail) {
         mailArray.push(newMail);
      });

      // Sort all mail by date
      mailArray.sort(function (a, b) {
         if (a.issued > b.issued)
            return -1;
         if (a.issued < b.issued)
            return 1;
         return 0;
      });

      // We've found new mail, alert others!
      if (foundNewMail) {
         handleSuccess(fullCount);
      } else {
         logToConsole(mailURL + "feed/atom/" + atomLabel + " - No new mail found.");
      }

      if (callback != null) {
         window.setTimeout(callback, 0);
      }
   }

   function getGLOBALS() {
      $.ajax({
         type: "GET",
         dataType: "text",
         url: mailURL,
         timeout: 25000,
         success: function (data) {
            try {
               var startIndex = data.lastIndexOf('var GLOBALS=') + 12;
               var endIndex = data.lastIndexOf(';GLOBALS[0]');
               var length = endIndex - startIndex;

               GLOBALS = eval(data.substr(startIndex, length));

               // Parse labels from GLOBALS
               LABELS = new Array();
               $.each(GLOBALS[17][1][2], function (i, val) { LABELS.push(val[0]); });
            } catch (e) {
               console.error("An error occured while parsing GLOBALS: " + e);
            }
         },
         error: function (xhr, status, err) {
            console.error("An error occured while fetching GLOBALS: " + xhr + " " + text + " " + err);
            // Try again in 30 seconds
            //window.setTimeout(getGLOBALS, 30 * 1000);
         }
      });
   }

   // Handles a successful getInboxCount call and schedules a new one
   function handleSuccess(count) {
      logToConsole("success!");
      window.clearTimeout(abortTimerId);
      errorLives = 5;
      updateUnreadCount(count);
      //scheduleRequest(); 
   }

   // Handles a unsuccessful getInboxCount call and schedules a new one
   function handleError(xhr, text, err) {
      logToConsole("error! " + xhr + " " + text + " " + err);
      window.clearTimeout(abortTimerId);

      if (errorLives > 0)
         errorLives--;

      if (errorLives == 0) {
         errorLives = -1;
         setLoggedOutState();
      }

      //scheduleRequest();
   }

   // Retreives inbox count and populates mail array
   function getInboxCount(callback) {
      try {
         logToConsole("requesting " + mailURL + "feed/atom/" + atomLabel);

         $.ajax({
            type: "GET",
            dataType: "text",
            url: mailURL + "feed/atom/" + atomLabel + "?timestamp=" + Date.now(),
            timeout: requestTimeout,
            success: function (data) { onGetInboxSuccess(data, callback); },
            error: function (xhr, status, err) { handleError(xhr, status, err); }
         });

         if (gmailAt == null) {
            getAt();
         }

         if (GLOBALS == null) {
            getGLOBALS();
         }
      } catch (e) {
         console.error("exception: " + e);
         handleError();
      }
   }

   // Schedules a new getInboxCount call
   function scheduleRequest(interval) {
      if (isStopped) {
         return;
      }

      logToConsole("scheduling new request");

      if (interval != null) {
         window.setTimeout(getInboxCount, interval);
      } else {
         requestTimer = window.setTimeout(getInboxCount, pollInterval);
         window.setTimeout(scheduleRequest, pollInterval);
      }
   }

   // Updates unread count and calls onUpdate event
   function updateUnreadCount(count) {
      if (unreadCount != count) {
         unreadCount = count;
         logToConsole("unread count: " + unreadCount);

         if (that.onUpdate != null) {
            try {
               logToConsole("trying to call onUpdate...");
               that.onUpdate(that);
            } catch (e) {
               console.error(e);
            }
         }
      }
   }

   // Calls onError and resets data
   function setLoggedOutState() {
      if (that.onError != null) {
         try {
            logToConsole("trying to call onError...");
            that.onError(that);
         }
         catch (e) {
            console.error(e);
         }
      }

      unreadCount = -1;
      mailArray = new Array();
   }

   function logToConsole(text) {
      if (verbose)
         console.log(text);
   }

   // Send a POST action to Gmail
   function postAction(postObj, callback) {
      if (gmailAt == null) {
         getAt(function() { postAction(postObj, callback); });
      } else {
         var threadid = postObj.threadid;
         var action = postObj.action;

         var postURL = mailURL.replace("http:", "https:");
         postURL += "h/" + Math.ceil(1000000 * Math.random()) + "/";
         var postParams = "t=" + threadid + "&at=" + gmailAt + "&act=" + action;

         logToConsole(postURL);
         logToConsole(postParams);

         var postXHR = new XMLHttpRequest();
         postXHR.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
               // Post successful! Refresh once
               getInboxCount();
               if(callback != null)
                  callback();
            } else if (this.readyState == 4 && this.status == 401) {
               if(callback != null)
                  callback("Unauthorized");
            }
         }
         postXHR.onerror = function (error) {
            logToConsole("post action error: " + error);
            
            if(callback != null)
               callback("Error: " + error);
         }

         postXHR.open("POST", postURL, true);
         postXHR.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
         postXHR.send(postParams);
      }
   }

   // Opens the basic HTML version of Gmail and fetches the Gmail_AT value needed for POST's
   function getAt(callback) {
      var getURL = mailURL + "h/" + Math.ceil(1000000 * Math.random()) + "/?ui=html&zy=c";
      var gat_xhr = new XMLHttpRequest();
      gat_xhr.onreadystatechange = function () {
         if (this.readyState == 4 && this.status == 200) {
            //logToConsole(this.responseText);
            var matches = this.responseText.match(/\at=([^"]+)/);
            //logToConsole(matches);
            if (matches != null && matches.length > 0) {
               gmailAt = matches[1];
               //logToConsole(gmailAt);

               if (callback != null) {
                  callback();
               }
            }
         } else if (this.readyState == 4 && this.status == 401) {

         }
      }
      gat_xhr.onerror = function (error) {
         logToConsole("get gmail_at error: " + error);
      }
      gat_xhr.open("GET", getURL, true);
      gat_xhr.send(null);
   }

   /* Public methods */

   // Starts the scheduler
   this.startScheduler = function () {
      logToConsole("starting scheduler...");
      getInboxCount();
      scheduleRequest();
   }

   // Stops the scheduler
   this.stopScheduler = function () {
      logToConsole("stopping scheduler...");
      isStopped = true;

      if (requestTimer != null) {
         window.clearTimeout(requestTimer);
      }

      delete that;
   }
   // Opens the inbox
   this.openInbox = function () {
      // See if there is any Gmail tab open	
      logToConsole('Opening inbox');
      chrome.windows.getAll({ populate: true }, function (windows) {
         for (var w in windows) {
            for (var i in windows[w].tabs) {
               var tab = windows[w].tabs[i];
               if (tab.url.indexOf(mailURL) >= 0) {
                  chrome.tabs.update(tab.id, { selected: true });
                  return;
               } else if (tab.url.indexOf(mailURL.replace("http:", "https:")) >= 0) {
                  chrome.tabs.update(tab.id, { selected: true });
                  return;
               } else if (tab.url.indexOf(mailURL.replace("https:", "http:")) >= 0) {
                  chrome.tabs.update(tab.id, { selected: true });
                  return;
               }
            }
         }
         chrome.tabs.create({ url: mailURL + inboxLabel });
      });
   }

//   // Opens unread label
//   this.openUnread = function () {
//      // See if there is any Gmail tab open		
//      chrome.windows.getAll({ populate: true }, function (windows) {
//         for (var w in windows) {
//            for (var i in windows[w].tabs) {
//               var tab = windows[w].tabs[i];
//               if (tab.url.indexOf(mailURL) >= 0) {
//                  chrome.tabs.update(tab.id, { selected: true });
//                  return;
//               } else if (tab.url.indexOf(mailURL.replace("http:", "https:")) >= 0) {
//                  chrome.tabs.update(tab.id, { selected: true });
//                  return;
//               } else if (tab.url.indexOf(mailURL.replace("https:", "http:")) >= 0) {
//                  chrome.tabs.update(tab.id, { selected: true });
//                  return;
//               }
//            }
//         }
//         chrome.tabs.create({ url: mailURL + unreadLabel });
//      });
//   }

   // Opens a thread
   this.openThread = function (threadid) {
      if (threadid != null) {
         chrome.tabs.create({ url: mailURL + inboxLabel + "/" + threadid });
         postAction({ "threadid": threadid, "action": "rd" });
         scheduleRequest(1000);
      }
   }
   // Fetches content of thread
   this.getThread = function (accountid, threadid, callback) {
      if (threadid != null) {
         var getURL = mailURL.replace('http:', 'https:') + "h/" + Math.ceil(1000000 * Math.random()) + "/?v=pt&th=" + threadid;
         var gt_xhr = new XMLHttpRequest();
         gt_xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
//               var markAsRead = (Settings.read("showfull_read") != null && Settings.read("showfull_read") == "true");

//               if(markAsRead)
//                  that.readThread(threadid);

               var matches = this.responseText.match(/<hr>[\s\S]?<table[^>]*>([\s\S]*?)<\/table>(?=[\s\S]?<hr>)/gi);
               //var matches = matchRecursiveRegExp(this.responseText, "<div class=[\")?msg[\")?>", "</div>", "gi")
               //logToConsole(this.responseText);
               //logToConsole(matches[matches.length - 1]);
               //logToConsole(matches);
               if (matches != null && matches.length > 0) {
                  var threadbody = matches[matches.length - 1];
                  threadbody = threadbody.replace(/<tr>[\s\S]*?<tr>/, "");
                  threadbody = threadbody.replace(/<td colspan="?2"?>[\s\S]*?<td colspan="?2"?>/, "");
                  threadbody = threadbody.replace(/cellpadding="?12"?/g, "");
                  threadbody = threadbody.replace(/font size="?-1"?/g, 'font');
                  threadbody = threadbody.replace(/<hr>/g, "");
                  threadbody = threadbody.replace(/(href="?)\/mail\//g, "$1" + mailURL);
                  threadbody = threadbody.replace(/(src="?)\/mail\//g, "$1" + mailURL);
                  //threadbody += "<span class=\"lowerright\">[<a href=\"javascript:showReply('" + threadid + "');\" title=\"Write quick reply\">reply</a>]&nbsp;[<a href=\"javascript:hideBody('" + threadid + "');\" title=\"Show summary\">less</a>]</span>";
                  logToConsole(threadbody);
                  if (callback != null) {
                     callback(accountid, threadid, threadbody);
                  }
               }
            } else if (this.readyState == 4 && this.status == 401) {

            }
         }
         gt_xhr.onerror = function (error) {
            logToConsole("get thread error: " + error);
         }
         gt_xhr.open("GET", getURL, true);
         gt_xhr.send(null);
      }
   }

   // Posts a reply to a thread
   this.replyToThread = function (replyObj) {
      if (gmailAt == null) {
         getAt(that.replyToThread, replyObj);
      } else {
         var threadid = replyObj.id;
         var reply = escape(replyObj.body);
         var callback = replyObj.callback;

         var postURL = mailURL + "h/" + Math.ceil(1000000 * Math.random()) + "/" + "?v=b&qrt=n&fv=cv&rm=12553ee9085c11ca&at=xn3j33xxbkqkoyej1zgstnt6zkxb1c&pv=cv&th=12553ee9085c11ca&cs=qfnq";
         var postParams = /*"v=b&qrt=n&fv=cv&rm=12553ee9085c11ca&at=xn3j33xxbkqkoyej1zgstnt6zkxb1c&pv=cv&th=12553ee9085c11ca&cs=qfnq" +
					"&th=" + threadid + "&at=" + gmailAt +*/"body=" + reply;

         logToConsole(postParams);

         var postXHR = new XMLHttpRequest();
         postXHR.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
               // Reply successful! Fire callback
               // callback();
            } else if (this.readyState == 4 && this.status == 401) {

            }
         }
         postXHR.onerror = function (error) {
            logToConsole("reply to thread error: " + error);
         }

         postXHR.open("POST", postURL, true);
         postXHR.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
         postXHR.send(postParams);
      }
   }

   // Marks a thread as read
   this.readThread = function (threadid, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "rd" }, callback);
      }
   }

   // Marks a thread as read
   this.unreadThread = function (threadid, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "ur" }, callback);
      }
   }

   // Archives a thread
   this.archiveThread = function (threadid, callback) {
      if (threadid != null) {
         if (archiveAsRead) {
            postAction({ "threadid": threadid, "action": "rd" });
            postAction({ "threadid": threadid, "action": "arch" }, callback);
         } else {
            postAction({ "threadid": threadid, "action": "rd" }, callback);
         }
      }
   }

   // Deletes a thread
   this.deleteThread = function (threadid, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "rd" });
         postAction({ "threadid": threadid, "action": "tr" }, callback);
      }
   }

   // Deletes a thread
   this.spamThread = function (threadid, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "sp" }, callback);
      }
   }

   // Stars a thread
   this.starThread = function (threadid, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "st" }, callback);
      }
   }

   // Applies a label to a thread
   this.applyLabel = function (threadid, label, callback) {
      if (threadid != null) {
         postAction({ "threadid": threadid, "action": "ac_" + label }, callback);
      }
   }

   // Retrieves unread count
   this.getUnreadCount = function () {
      return Number(unreadCount);
   }

   // Returns the "Gmail - Inbox for..." link
   this.getInboxLink = function () {
      if (mailTitle != null && mailTitle != "")
         return mailTitle;
      return mailURL;
   }

   // Returns the email address for the current account
   this.getAddress = function () {
      if (mailAddress != null && mailAddress != "")
         return mailAddress;
      return "(unknown account)";
   }

   // Returns the mail array
   this.getMail = function () {
      return mailArray;
   }

   // Returns the newest mail
   this.getNewestMail = function () {
      return newestMail;
   }

   // Opens the newest thread
   this.openNewestMail = function () {
      if (newestMail != null) {
         that.openThread(newestMail.id);
      }
   }

   // Reads the newest thread
   this.readNewestMail = function () {
      if (newestMail != null) {
         that.readThread(newestMail.id);
      }
   }

   // Spams the newest thread
   this.spamNewestMail = function () {
      if (newestMail != null) {
         that.spamThread(newestMail.id);
      }
   }

   // Deletes the newest thread
   this.deleteNewestMail = function () {
      if (newestMail != null) {
         that.deleteThread(newestMail.id);
      }
   }

   // Archive the newest thread
   this.archiveNewestMail = function () {
      if (newestMail != null) {
         that.archiveThread(newestMail.id);
      }
   }

   // Stars the newest thread
   this.starNewestMail = function () {
      if (newestMail != null) {
         that.starThread(newestMail.id);
      }
   }

   // Returns the mail URL
   this.getURL = function () {
      return mailURL;
   }

   this.getNewAt = function () {
      getAt();
   }

   // Refresh the unread items
   this.refreshInbox = function (callback) {
      getInboxCount(callback);
   }

   // Opens the Compose window
   this.composeNew = function () {
      if (openInTab) {
         chrome.tabs.create({ url: mailURL + "?view=cm&fs=1&tf=1" });
      } else {
         window.open(mailURL + "?view=cm&fs=1&tf=1", 'Compose new message', 'width=640,height=480');
      }
   }

   // Opens the Compose window and embeds the current page title and URL
   this.sendPage = function (tab) {
      var body = encodeURIComponent(unescape(tab.url));
      var subject = encodeURIComponent(unescape(tab.title));
      subject = subject.replace('%AB', '%2D'); // Special case: escape for %AB
      var urlToOpen = mailURL + "?view=cm&fs=1&tf=1" + "&su=" + subject + "&body=" + body;

      if (openInTab) {
         chrome.tabs.create({ url: urlToOpen });
      } else {
         window.open(urlToOpen, 'Compose new message', 'width=640,height=480');
      }
   }

   this.getLabels = function () {
      return LABELS;
   }

   // Opens the Compose window with pre-filled data
   this.replyTo = function (mail) {
      //this.getThread(mail.id, replyToCallback);
      var to = encodeURIComponent(mail.authorMail); // Escape sender email
      var subject = Encoder.htmlDecode(mail.title); // Escape subject string
      subject = (subject.search(/^Re: /i) > -1) ? subject : "Re: " + subject; // Add 'Re: ' if not already there
      subject = encodeURIComponent(subject);
      // threadbody = encodeURIComponent(threadbody);
      var issued = mail.issued;
      var threadbody = "\r\n\r\n" + issued.toString() + " <" + mail.authorMail + ">:\r\n" + Encoder.htmlDecode(mail.summary);
      threadbody = encodeURIComponent(threadbody);
      var replyURL = mailURL.replace('http:', 'https:') + "?view=cm&tf=1&to=" + to + "&su=" + subject + "&body=" + threadbody;
      logToConsole(replyURL);
      if (openInTab) {
         chrome.tabs.create({ url: replyURL });
      } else {
         window.open(replyURL, 'Compose new message', 'width=640,height=480');
         //chrome.windows.create({url: replyURL});
      }
   }

   function replyToCallback(threadid, threadbody) {
      var mail;
      for (var i in mailArray) {
         if (mailArray[i].id == threadid) {
            mail = mailArray[i];
            break;
         }
      }

      if (mail == null)
         return;

      var to = encodeURIComponent(mail.authorMail); // Escape sender email
      var subject = mail.title; // Escape subject string
      subject = (subject.search(/^Re: /i) > -1) ? subject : "Re: " + subject; // Add 'Re: ' if not already there
      subject = encodeURIComponent(subject);
      threadbody = encodeURIComponent(threadbody);
      var replyURL = mailURL + "?view=cm&fs=1&tf=1&to=" + to + "&su=" + subject + "&body=" + mail.summary;
      if (openInTab) {
         chrome.tabs.create({ url: replyURL });
      } else {
         window.open(replyURL, 'Compose new message', 'width=640,height=480');
         //chrome.windows.create({url: replyURL});
      }
   }

   // No idea, actually...
   function NSResolver(prefix) {
      if (prefix == 'gmail') {
         return 'http://purl.org/atom/ns#';
      }
   }

   // Called when the user updates a tab
   chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
      if (changeInfo.status == 'loading' && (tab.url.indexOf(mailURL) == 0 || tab.url.indexOf(mailURL.replace("http:", "https:")) == 0 || tab.url.indexOf(mailURL.replace("https:", "http:")) == 0)) {
         logToConsole("saw gmail! updating...");
         window.setTimeout(getInboxCount, 0);
      }
   });
}