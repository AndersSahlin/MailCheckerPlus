/// <reference path="jquery-1.4.2.js" />
/// <reference path="chrome-api-vsdoc.js" />

var backgroundPage = chrome.extension.getBackgroundPage();
var mailAccounts = backgroundPage.accounts;
//var mailArray = mailAccount.getMail();
var mailCount = 0;
var mailCache = new Array();
var allMail;
var scrollbar;

var unreadCount = 0;
allMail = new Array();
$.each(mailAccounts, function (i, account) {
   unreadCount += account.getUnreadCount();
});

var previewSetting = localStorage["gc_preview_setting"];

if (previewSetting == "0") {
   // Preview setting set to "Always off" =
   // Go to first mail inbox with unread items
   openInbox(0);
} else if (previewSetting == "1" && unreadCount == 0) {
   // Preview setting set to "Automatic" + no unread mail =
   // Go to first mail inbox
   openInbox(0);
}

function hideElement(id) {
   var element = document.getElementById(id);
   if (element != null) {
      element.style.display = 'none';
   }
}

function showElement(id) {
   var element = document.getElementById(id);
   if (element != null) {
      element.style.display = 'inline';
   }
}

// Opens a mail and closes this window
function openMail(accountId, mailid) {
   mailAccounts[accountId].openThread(mailid);
   window.close();
}

function openInbox(accountId) {
   if (accountId == null) {
      accountId = 0;
      // Open first inbox with unread items
      $.each(mailAccounts, function (i, account) {
         if (account.getUnreadCount() > 0) {
            accountId = account.id;
            return false;
         }
      });
   }
   mailAccounts[accountId].openInbox();
   window.close();
}

function openUnread(accountId) {
   mailAccounts[accountId].openUnread();
   window.close();
}

function composeNew(accountId) {
   mailAccounts[accountId].composeNew();
   window.close();
}

function sendPage(accountId) {
   chrome.tabs.getSelected(null, function (tab) {
      mailAccounts[accountId].sendPage(tab);
      window.close();
   });
}

function readThread(accountId, mailid) {
   hideMail(accountId, mailid);
   mailAccounts[accountId].readThread(mailid);
}

function unreadThread(accountId, mailid) {
   mailAccounts[accountId].unreadThread(mailid);
   var mailElement = document.getElementById(mailid);
   if (mailElement != null) {
      var mailHeaderReadLink = document.getElementById(mailid + "_read-link");
      if (mailHeaderReadLink != null) {
         mailHeaderReadLink.href = "javascript:readThread('" + accountId + "', '" + mailid + "');";
         mailHeaderReadLink.innerHTML = i18n.get('readLink');
         mailHeaderReadLink.title = i18n.get('readLinkTitle');
      }
   }
}

function archiveThread(accountId, mailid) {
   hideMail(accountId, mailid);
   mailAccounts[accountId].archiveThread(mailid);
}

function deleteThread(accountId, mailid) {
   hideMail(accountId, mailid);
   mailAccounts[accountId].deleteThread(mailid);
}

function spamThread(accountId, mailid) {
   hideMail(accountId, mailid);
   mailAccounts[accountId].spamThread(mailid);
}

function starThread(accountId, mailid) {
   mailAccounts[accountId].starThread(mailid);
}

function replyTo(accountId, mailid) {
   mailAccounts[accountId].replyTo(allMail[mailid]);
}

function showReply(mailid) {
   var replyBox = document.getElementById(mailid + "_reply");
   //replyBox.style.display = 'block';
}

function hideReply(mailid) {
   var replyBox = document.getElementById(mailid + "_reply");
   //replyBox.style.display = 'none';
}

function sendReply(mailid) {
   var replyTextArea = document.getElementById(mailid + "_replytext");
   var replyText = replyTextArea.value;
   hideReply(mailid);
   mailAccount.replyToThread({ "id": mailid, "body": replyText });
}

function getThread(accountId, mailid) {

   var markAsRead = (localStorage["gc_showfull_read"] != null && localStorage["gc_showfull_read"] == "true");
   if (markAsRead) {
      readThread(accountId, mailid);
   }

   if (mailCache[mailid] != null) {
      // Mail already fetched, read from cache instead
      showBody(accountId, mailid, mailCache[mailid]);
      return false;
   }

   if (accountId != null) {
      window.setTimeout(mailAccounts[accountId].getThread(accountId, mailid, showBody), 0);
      //		
      //		var mailElement = document.getElementById(mailid);
      //		if(mailElement != null) {
      //			var mailHeaderReadLink = document.getElementById(mailid + "_read-link");
      //			if(mailHeaderReadLink != null) {
      //				mailHeaderReadLink.href = "javascript:unreadThread('" + accountId + "', '" + mailid + "');";
      //				mailHeaderReadLink.innerHTML = i18n.get('unreadLink');
      //				mailHeaderReadLink.title = i18n.get('unreadLinkTitle');
      //			}
      //		}    
   }
}

function showBody(accountid, mailid, mailbody) {
   //   showElement(mailid + "_less-link");
   //   hideElement(mailid + "_more-link");

   if (mailbody != null) {
      var mail = allMail[mailid];

      var fullscreenContainer = $("#fullscreenContainer");
      var fullscreenContent = $("#fullscreenContent");
      var fullscreenControl = $("#fullscreenControls");


      fullscreenControl.find('.openLink').text(mail.title);
      fullscreenControl.find('.openLink').attr('title', i18n.get('openLinkTitle'));
      fullscreenControl.find('.authorLink').text(mail.authorName);
      fullscreenControl.find('.authorLink').attr('title', mail.authorMail);
      fullscreenControl.find('.issuedLink').text(formatDateTime(mail.issued, i18n.selected_lang.months, true));
      fullscreenControl.find('.issuedLink').attr('title', mail.issued);

      fullscreenControl.find('.readLink').text(i18n.get('readLink'));
      fullscreenControl.find('.deleteLink').text(i18n.get('deleteLink'));
      fullscreenControl.find('.spamLink').text(i18n.get('spamLink'));
      fullscreenControl.find('.archiveLink').text(i18n.get('archiveLink'));
      fullscreenControl.find('.starLink').attr('title', i18n.get('starLinkTitle'));
      fullscreenControl.find('.replyLink').attr('title', i18n.get('replyLinkTitle'));
      fullscreenControl.find('.readLink').attr('title', i18n.get('readLinkTitle'));
      fullscreenControl.find('.deleteLink').attr('title', i18n.get('deleteLinkTitle'));
      fullscreenControl.find('.spamLink').attr('title', i18n.get('spamLinkTitle'));
      fullscreenControl.find('.archiveLink').attr('title', i18n.get('archiveLinkTitle'));

      // Insert the full mail body and full screen controls
      fullscreenContent.empty();
      fullscreenContent.html(mailbody);

      fullscreenContainer.empty();
      fullscreenContainer.append(fullscreenControl);
      fullscreenContainer.append(fullscreenContent);

      // Set event handlers
      fullscreenControl.find('.closeLink').click(function () {
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.readLink').click(function () {
         readThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.replyLink').click(function () {
         replyTo(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.deleteLink').click(function () {
         deleteThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.spamLink').click(function () {
         spamThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.archiveLink').click(function () {
         archiveThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.openLink').click(function () {
         openMail(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.starLink').click(function () {
         $(this).css('opacity', '1');
         starThread(accountid, mailid);
      });

      // Display full screen container
      fullscreenContainer.css("display", "block");

      // Save this mail in the cache
      mailCache[mailid] = mailbody;

      // Toggle the size of the window
      expandWindow();
   }
}

function hideBody() {
   //   var mailSummaryElement = $('#' + mailid + "_summary");
   //   var mail = allMail[mailid];

   //   //hideElement(mailid + "_reply-link");
   //   hideElement(mailid + "_less-link");
   //   showElement(mailid + "_more-link");

   // Hide full screen
   $("#fullscreenContainer").css("display", "none");

   // Toggle the size of the window
   contractWindow();
}

// Hides a mail in the mailbox
function hideMail(accountId, mailid) {
   var accountElement = $('#inbox_' + accountId);
   $('#' + mailid).slideUp('fast');
   $('#' + mailid).removeClass('mail');

   var unreadCount = accountElement.find('.mail').length;

   if (unreadCount == 0) {
      accountElement.find('.toggleLink').hide('fast');
      accountElement.find('.unreadCount').fadeOut('fast');
   } else {
      accountElement.find('.unreadCount').text('(' + unreadCount + ')');
   }
}

// Shows a hidden mail in the mailbox
function showMail(mailid) {
   var mailElement = document.getElementById(mailid);
   if (mailElement != null) {
      mailElement.style.display = 'block';
   }

}

function replyTextKeyPress(event, mailid) {
   if (event.shiftKey == 1 && event.keyCode == 13) {
      // User pressed shift-enter inside textarea
      sendReply(mailid);
   }
}

function refreshMail() {
   renderMail();
}

function openOptions() {
   chrome.tabs.create({ url: "options.html" });
}

function resizeWindow() {
   var isExpanded = $('body').width() != 500;

   if (isExpanded)
      contractWindow();
   else
      expandWindow();
}


var animationSpeed = 250;
var previousHeight;
function expandWindow() {
   previousHeight = $('body').height();

   $('body').animate({
      width: [750, 'swing'],
      //height: [500, 'swing']
   }, animationSpeed);

   $('.account').slideUp();
}

function contractWindow() {
   $('body').animate({
      width: [500, 'swing'],
      //height: [previousHeight, 'swing']
   }, animationSpeed);

   $('.account').slideDown();
   previousHeight = 0;
}

function renderMail() {
   // Clear previous content
   $('#content').empty();

   // Loop through each account and render it on the page
   $.each(mailAccounts, function (i, account) {
      account.getNewAt();
      account.id = i;

      // Render account
      if (account.getMail() != null) {
         account.unreadCount = account.getMail().length;
      }

      var accountHtml = parseTemplate($("#AccountTemplate").html(), {
         account: account,
         i18n: i18n
      });

      // Add to page
      $(accountHtml).fadeIn("fast").appendTo("#content");
      var inboxElement = $('#inbox_' + account.id);

      if (account.getMail() != null) {
         $.each(account.getMail(), function (j, mail) {
            allMail[mail.id] = mail;

            mail.fullTitle = mail.title;
            if (mail.title.length > 63)
               mail.title = mail.title.substr(0, 60) + "...";

            // Render mail
            var mailHtml = parseTemplate($("#MailTemplate").html(), {
               account: account,
               mail: mail,
               i18n: i18n
            });

            // Add to account element
            $(mailHtml).fadeIn("fast").appendTo(inboxElement);
         });

         if (account.getMail().length == 0)
            inboxElement.find(".toggleLink").hide();

         inboxElement.find(".toggleLink").click(function () {
            inboxElement.find('.mail').slideToggle('fast');

            if ($(this).find('img').attr('src') == 'img/arrow_right.png') {
               $(this).find('img').attr('src', 'img/arrow_down.png')
            } else {
               $(this).find('img').attr('src', 'img/arrow_right.png')
            }
         });
      }

      // Hook up event handlers
      inboxElement.find(".readLink").click(function () { readThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".deleteLink").click(function () { deleteThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".spamLink").click(function () { spamThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".archiveLink").click(function () { archiveThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".fullLink").click(function () { getThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".summary").click(function () { getThread(account.id, $(this).attr('mailId')); });
      inboxElement.find(".replyLink").click(function () { replyTo(account.id, $(this).attr('mailId')); });
      inboxElement.find(".openLink").click(function () { openMail(account.id, $(this).attr('mailId')); });
      
      inboxElement.find(".starLink").click(function () {
         $(this).css('opacity', '1');
         starThread(account.id, $(this).attr('mailId'));
      });

   });

   // Add event handlers
   $(".inboxLink").click(function () { openInbox($(this).attr('accountId')); });
   $(".composeLink").click(function () { composeNew($(this).attr('accountId')); });
   $(".sendpageLink").click(function () { sendPage($(this).attr('accountId')); });
}

$(document).ready(function () {
   var unreadCount = 0;
   allMail = new Array();
   $.each(mailAccounts, function (i, account) {
      unreadCount += account.getUnreadCount();
   });

   backgroundPage.stopAnimateLoop();

   renderMail();

   // Should probably use jQuery for this
   document.getElementById('refresh').setAttribute('title', i18n.get('refreshLinkTitle'));
   document.getElementById('options').setAttribute('title', i18n.get('optionsLinkTitle'));
});