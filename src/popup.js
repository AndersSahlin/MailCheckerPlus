/// <reference path="jquery-1.4.2.js" />
/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="encoder.js" />
/// <reference path="settings.js" />
/// <reference path="mailaccount.class.js" />

var backgroundPage = chrome.extension.getBackgroundPage();
var Settings = backgroundPage.getSettings();
var mailAccounts = backgroundPage.accounts;

//var mailArray = mailAccount.getMail();
var mailCount = 0;
var mailCache = new Array();
var allMailMap;
var allMailArray;
var scrollbar;
var unreadCount = 0;

$.each(mailAccounts, function (i, account) {
   unreadCount += account.getUnreadCount();
});

//// Sort new mail by date
//mailAccounts.sort(function (a, b) {
//   var aNewest = a.getNewestMail();
//   var bNewest = b.getNewestMail();

//   if(bNewest == null)
//      return -1;
//   if(aNewest == null)
//      return 1;

//   if (aNewest.issued > bNewest.issued)
//      return -1;
//   if (bNewest.issued > aNewest.issued)
//      return 1;
//   return 0;
//});

var previewSetting = Settings.read("preview_setting");

if (previewSetting === 0) {
   // Preview setting set to "Always off" =
   // Go to first mail inbox with unread items
   openInbox(0);
} else if (previewSetting === 1 && unreadCount === 0) {
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
   //window.close();
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

   if(mailAccounts == null || mailAccounts[accountId] == null) {
      console.error("No mailaccount(s) found with account id " + accountId);
      return;
   }

   mailAccounts[accountId].openInbox();
   window.close();
}

//function openUnread(accountId) {
//   mailAccounts[accountId].openUnread();
//   window.close();
//}

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

function showLoading(mailid) {
   $("#loadingBox_" + mailid).fadeIn(100);
}

function hideLoading(mailid) {
   $("#loadingBox_" + mailid).hide();
}

function readThread(accountId, mailid, stayOpen) {
   showLoading(mailid);
   mailAccounts[accountId].readThread(mailid, function() { hideMail(accountId, mailid, stayOpen); });
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
   showLoading(mailid);
   mailAccounts[accountId].archiveThread(mailid, function() { hideMail(accountId, mailid); });
}

function deleteThread(accountId, mailid) {
   showLoading(mailid);
   mailAccounts[accountId].deleteThread(mailid, function() { hideMail(accountId, mailid); });
}

function spamThread(accountId, mailid) {
   showLoading(mailid);
   mailAccounts[accountId].spamThread(mailid, function() { hideMail(accountId, mailid); });
}

function starThread(accountId, mailid) {
   mailAccounts[accountId].starThread(mailid);
}

function applyLabelToThread(accountId, mailId, label) {
   mailAccounts[accountId].applyLabel(mailId, label);
}

function replyTo(accountId, mailid) {
   mailAccounts[accountId].replyTo(allMailMap[mailid]);
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

   if (Settings.read("showfull_read")) {
	  readThread(accountId, mailid, true);
   }

   if (mailCache[mailid] != null) {
      // Mail already fetched, read from cache instead
      showBody(accountId, mailid, mailCache[mailid]);
      return false;
   }

   if (accountId != null) {
      showLoading(mailid);
      mailAccounts[accountId].getThread(accountId, mailid, showBody);  
   }
}

function showBody(accountid, mailid, mailbody) {
   hideLoading(mailid);
   //   showElement(mailid + "_less-link");
   //   hideElement(mailid + "_more-link");

   if (mailbody != null) {

      var previousMail = null;
      var nextMail = null;
      var currentMail = allMailMap[mailid];
      var currentMailIndex = 0;
      
      $.each(allMailArray, function(index, _mail) {
         if(_mail.id === mailid) {
            currentMailIndex = index + 1;
            if(index > 0) {
               previousMail = allMailArray[index - 1];
            }
            if(index + 1 < allMailArray.length) {
               nextMail = allMailArray[index + 1];
            }
            // Break loop
            return false;
         }
      });

      var nextPreviousOrHide = function() {
         if(nextMail) {            
            getThread(nextMail.accountId, nextMail.id);
         } else if(previousMail) {         
            getThread(previousMail.accountId, previousMail.id);
         } else {
            hideBody();
         }
      }

      var fullscreenContainer = $("#fullscreenContainer");
      var fullscreenContent = $("#fullscreenContent");
      var fullscreenControl = $("#fullscreenControls");

      fullscreenControl.find('.openLink').html(currentMail.shortTitle);
      fullscreenControl.find('.openLink').attr('title', Encoder.htmlDecode(currentMail.title));
      fullscreenControl.find('.authorLink').html(currentMail.authorName);
      fullscreenControl.find('.authorLink').attr('title', Encoder.htmlDecode(currentMail.authorMail));
      fullscreenControl.find('.issuedLink').html(formatDateTime(currentMail.issued, i18n.selected_lang.months, true));
      fullscreenControl.find('.issuedLink').attr('title', currentMail.issued);

      fullscreenControl.find('.readLink').text(i18n.get('readLink'));
      fullscreenControl.find('.deleteLink').text(i18n.get('deleteLink'));
      fullscreenControl.find('.spamLink').text(i18n.get('spamLink'));
      fullscreenControl.find('.archiveLink').text(i18n.get('archiveLink'));
      fullscreenControl.find('.countLabel').text(currentMailIndex + ' of ' + allMailArray.length);
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

      if(previousMail) {
         fullscreenControl.find('.previousLink').css('visibility','visible');
         fullscreenControl.find('.previousLink').click(function () {
            getThread(previousMail.accountId, previousMail.id);
         });
      } else {
         fullscreenControl.find('.previousLink').css('visibility','hidden');
      }

      if(nextMail) {
         fullscreenControl.find('.nextLink').css('visibility','visible');
         fullscreenControl.find('.nextLink').click(function () {
            getThread(nextMail.accountId, nextMail.id);
         });
      } else {
         fullscreenControl.find('.nextLink').css('visibility','hidden');
      }

      fullscreenControl.find('.closeLink').click(function () {
         window.close();
      });
      fullscreenControl.find('.hideLink').click(function () {
         hideBody();
      });

      fullscreenControl.find('.readLink').click(function () {
         readThread(accountid, mailid);
         nextPreviousOrHide();
      });
      fullscreenControl.find('.replyLink').click(function () {
         replyTo(accountid, mailid);
         nextPreviousOrHide();
      });
      fullscreenControl.find('.deleteLink').click(function () {
         deleteThread(accountid, mailid);
         nextPreviousOrHide();
      });
      fullscreenControl.find('.spamLink').click(function () {
         spamThread(accountid, mailid);
         nextPreviousOrHide();
      });
      fullscreenControl.find('.archiveLink').click(function () {
         archiveThread(accountid, mailid);
         nextPreviousOrHide();
      });

      fullscreenControl.find('.openLink').click(function () {
         openMail(accountid, mailid);
         hideBody();
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
function hideMail(accountId, mailid, stayOpen) {
   var accountElement = $('#inbox_' + accountId);
//   $('#' + mailid).slideUp('fast');
//   $('#' + mailid).removeClass('mail');
   $('#' + mailid).remove();

   delete allMailMap[mailid];
   //var allMailArray = window.allMailArray;

   $.each(allMailArray, function(_index, _mail) {
      if(_mail.id === mailid) {
         delete allMailArray[_index];
         allMailArray.splice(_index,1);
         return false;
      }
   });

   var unreadCount = allMailArray.length;

   if (unreadCount == 0) {
      accountElement.find('.toggleLink').hide('fast');
      accountElement.find('.unreadCount').fadeOut('fast');
	
	  if(!stayOpen) { 
         window.close();
	  }
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
   $.each(mailAccounts, function (i, account) {
      account.refreshInbox(function () {
         renderAccount(account);         
      });
   });
}

function openOptions() {
   chrome.tabs.create({ url: "options.html" });
}

function resizeWindow() {
   var isExpanded = $('html').width() != 500;

   if (isExpanded)
      contractWindow();
   else
      expandWindow();
}


var animationSpeed = 250;
var previousHeight;
function expandWindow() {
   previousHeight = $('body').height();

   $('html').animate({
      width: [750, 'swing'],
      //height: [500, 'swing']
   }, animationSpeed);

   $('.account').slideUp();
}

function contractWindow() {
   $('html').animate({
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
      account.id = i;
      renderAccount(account);
   });

   // Add event handlers
   $(".inboxLink").click(function () { openInbox($(this).attr('accountId')); });
   $(".composeLink").click(function () { composeNew($(this).attr('accountId')); });
   $(".sendpageLink").click(function () { sendPage($(this).attr('accountId')); });
}

function renderAccount(account) {
   $('#content_' + account.id).remove();
   account.getNewAt();

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
   var labels = account.getLabels();

   if (account.getMail() != null) {
      $.each(account.getMail(), function (j, mail) {

         mail.accountId = account.id;

         allMailMap[mail.id] = mail;
         allMailArray.push(mail);
            
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

//   if(account.getLabels() != null) {
//      var labels = account.getLabels();
//      var labelPopout = $('#labels_' + account.id);

//      $.each(labels, function(_index, _label) {
//         var labelElement = $('<li>');

//         labelElement.text(_label);
//         labelElement.click(function() {
//            //alert(_label);
//         });

//         labelElement.appendTo(labelPopout);
//      });
//   }

   $.each(inboxElement.find(".mailLabels"), function(_index, _mailLabels) {
      var labelContainer = $(_mailLabels);
      var mailId = labelContainer.attr('mailId');

      if(labels != null) {
         var labelPopout = $('<ul>');
         labelPopout.addClass('labels');

         $.each(labels, function(_index, _label) {
            var labelElement = $('<li>');

            labelElement.text(_label);
            labelElement.attr("title", "Apply label '" + _label + "'");

            labelElement.click(function() {
               $(this).toggleClass("applied");               
               labelContainer.slideUp(100);
               applyLabelToThread(account.id, mailId, _label);
            });

            labelElement.appendTo(labelPopout);
         });

         labelPopout.appendTo(labelContainer);
      }
   });

   // Hook up event handlers
   inboxElement.find(".readLink").click(function () { readThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".deleteLink").click(function () { deleteThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".spamLink").click(function () { spamThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".archiveLink").click(function () { archiveThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".fullLink").click(function () { getThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".summary").click(function () { getThread(account.id, $(this).attr('mailId')); });
   inboxElement.find(".replyLink").click(function () { replyTo(account.id, $(this).attr('mailId')); });
   inboxElement.find(".openLink").click(function () { openMail(account.id, $(this).attr('mailId')); });

   
   inboxElement.find(".labelLink").click(function () { 
      var mailId = $(this).attr('mailId');
      $("#labelBox_" + mailId).slideToggle(100);
   });
      
   inboxElement.find(".starLink").click(function () {
      $(this).css('opacity', '1');
      starThread(account.id, $(this).attr('mailId'));
   });
}

$(document).ready(function () {
   var unreadCount = 0;
   allMailMap = {};
   allMailArray = new Array();

   $.each(mailAccounts, function (i, account) {
      unreadCount += account.getUnreadCount();
   });

   backgroundPage.stopAnimateLoop();

   renderMail();

   // Should probably use jQuery for this
   document.getElementById('refresh').setAttribute('title', i18n.get('refreshLinkTitle'));
   document.getElementById('options').setAttribute('title', i18n.get('optionsLinkTitle'));
});