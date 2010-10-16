/// <reference path="jquery-1.4.2.js" />
/// <reference path="chrome-api-vsdoc.js" />

var backgroundPage = chrome.extension.getBackgroundPage();
var mailAccounts = backgroundPage.accounts;
//var mailArray = mailAccount.getMail();
var mailCount = 0;
var mailCache = new Array();
var allMail;
var scrollbar;

function hideElement(id) {
	var element = document.getElementById(id);
	if(element != null) {
		element.style.display = 'none';
	} 
}

function showElement(id) {
	var element = document.getElementById(id);
	if(element != null) {
		element.style.display = 'inline';
	} 
}

// Opens a mail and closes this window
function openMail(accountId, mailid) {
	window.close();
	mailAccounts[accountId].openThread(mailid);
}

function openInbox(accountId) {
	window.close();
	if(accountId == null) {
		// Open first inbox with unread items
		$.each(mailAccounts, function(i, account) {
			if(account.getUnreadCount() > 0) {
				account.openInbox();
				return false;
			}
		});
		accountId = 0;
	}
	mailAccounts[accountId].openInbox();   
}

function openUnread(accountId) {
	window.close();
	mailAccounts[accountId].openUnread();   
}

function composeNew(accountId) {
	window.close();
	mailAccounts[accountId].composeNew();   
}

function sendPage(accountId) {	
	chrome.tabs.getSelected(null, function(tab) {
		window.close();
		mailAccounts[accountId].sendPage(tab);   		
	});
}

function readThread(accountId, mailid) {
	hideMail(accountId, mailid);
	mailAccounts[accountId].readThread(mailid);
}

function unreadThread(accountId, mailid) {
	mailAccounts[accountId].unreadThread(mailid);
	var mailElement = document.getElementById(mailid);
	if(mailElement != null) {
		var mailHeaderReadLink = document.getElementById(mailid + "_read-link");
		if(mailHeaderReadLink != null) {
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
	mailAccount.replyToThread({"id":mailid, "body":replyText});
}

function getThread(accountId, mailid) {
	if(mailCache[mailid] != null) {
	   // Mail already fetched, read from cache instead
		showBody(accountId, mailid, mailCache[mailid]);
		return false;
	}
	
	if(accountId != null) {
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
      var fullscreenContainer = $("#fullscreenContainer");
      var fullscreenControl = $("#fullscreenControls");
      fullscreenControl.find('.readLink').text(i18n.get('readLink'));
      fullscreenControl.find('.deleteLink').text(i18n.get('deleteLink'));
      fullscreenControl.find('.spamLink').text(i18n.get('spamLink'));
      fullscreenControl.find('.archiveLink').text(i18n.get('archiveLink'));
      fullscreenControl.find('.readLink').attr('title', i18n.get('readLinkTitle'));
      fullscreenControl.find('.deleteLink').attr('title', i18n.get('deleteLinkTitle'));
      fullscreenControl.find('.spamLink').attr('title', i18n.get('spamLinkTitle'));
      fullscreenControl.find('.archiveLink').attr('title', i18n.get('archiveLinkTitle'));

      // Insert the full mail body and full screen controls
      fullscreenContainer.html("");
      fullscreenContainer.append(fullscreenControl);
      fullscreenContainer.append(mailbody);

      // Remove previous click event handlers
      fullscreenControl.find('.closeLink').unbind();
      fullscreenControl.find('.closeLink').click(function () {
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.readLink').unbind();
      fullscreenControl.find('.readLink').click(function () {
         readThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.deleteLink').unbind();
      fullscreenControl.find('.deleteLink').click(function () {
         deleteThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.spamLink').unbind();
      fullscreenControl.find('.spamLink').click(function () {
         spamThread(accountid, mailid);
         setTimeout(hideBody(), 0);
      });
      fullscreenControl.find('.archiveLink').unbind();
      fullscreenControl.find('.archiveLink').click(function () {
         archiveThread(accountid, mailid);
         setTimeout(hideBody(), 0);
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

// Parses mail into HTML elements
function parseMail(accountId) {
	//document.getElementById('mailBox_' + accountId).innerHTML = "";
	var mailArray = mailAccounts[accountId].getMail();
	$.each(mailArray, function(i, mail) {
		allMail[mail.id] = mail;
		mailCount++;
				   
		if(mail.title.length > 70)
			mail.title = mail.title.substr(0, 65) + "...";
            
		var i = mailArray.indexOf(mail);			
		var issued = (new Date()).setISO8601(mail.issued);
		var today = new Date();
		var datetime;
		var fullDateTime = issued.toLocaleString();
						
		if(issued.getFullYear() == today.getFullYear() &&
			issued.getMonth() == today.getMonth() &&
			issued.getDate() == today.getDate()) {
			// Mail was issued today, display time
			var hour = issued.getHours();
			var min = issued.getMinutes();
			var datetime = ((hour < 10) ? "0" : "") + hour + ":" + ((min < 10) ? "0" : "") + min;
		} else {
			// Old mail, only display date
			//datetime = dateFormat(issued, "d mmm");
			datetime = issued.getDate() + ' ' + i18n.selected_lang.months[issued.getMonth()];
		}
		
//		var mailElement = 
//			"<div class=\"mailEntry vbox\" id=\"" + mail.id + "\">" +
//				"<div class=\"mailHeader hbox\">" +                    
//					"<span class=\"authorName\">&bull;&nbsp;<a class=\"tooltip nohover\" title=\"" + mail.authorMail + "\">" + mail.authorName + "</a></span>" +  
//					"<span class=\"actions\">" + 
//						"<span class=\"read\"><a id=\"" + mail.id + "_read-link\" href=\"javascript:readThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('readLinkTitle') + "\">" + i18n.get('readLink') + "</a></span>" +
//						"<span class=\"delete\"><a href=\"javascript:deleteThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('deleteLinkTitle') + "\">" + i18n.get('deleteLink') + "</a></span>" + 
//						"<span class=\"spam\"><a href=\"javascript:spamThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('spamLinkTitle') + "\">" + i18n.get('spamLink') + "</a></span>" +
//						"<span class=\"archive\"><a href=\"javascript:archiveThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('archiveLinkTitle') + "\">" + i18n.get('archiveLink') + "</a></span>" +
//					"</span>" +         
//					"<span class=\"issued\" title=\"" + fullDateTime + "\">" + datetime + "&nbsp;&nbsp;<img src=\"img/datetime.gif\" /></span>" +
//				"</div>" +
//				"<div class=\"mailContainer vbox\">" +
//					"<div class=\"mailBody vbox\">";
//						if(mail.summary != null && mail.summary.length > 0) {
//							mailElement +=
//							"<div class=\"title hbox\">" + 
//								"<span><a href=\"javascript:starThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('starLinkTitle') + "\" class=\"star-link\" id=\"" + mail.id + "_star-link\"><img src=\"img/star_hover.png\" alt=\"" + i18n.get('starLinkTitle') + "\" class=\"hidden\"/></a><a href=\"javascript:openMail('" + accountId + "','" + mail.id + "');\" class=\"title-link\" title=\"" + i18n.get('openLinkTitle') + "\">" + mail.title + "</a></span>" +
//								"<span class=\"lowerright\"><a href=\"javascript:replyTo('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('replyLinkTitle') + "\" class=\"reply-link\"><img src=\"img/reply.png\" alt=\"" + i18n.get('replyLinkTitle') + "\" class=\"hidden\" /></a></span>" +
//								"<span class=\"lowerright hidden\" id=\"" + mail.id + "_less-link\"><a href=\"javascript:hideBody('" + mail.id + "');\" title=\"" + i18n.get('summaryLinkTitle') + "\" class=\"less-link\"><img src=\"img/less_hover.png\" class=\"hidden\" /></a></span>" +
//								"<span class=\"lowerright\" id=\"" + mail.id + "_more-link\"><a href=\"javascript:getThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('fullLinkTitle') + "\" class=\"more-link\"><img src=\"img/more_hover.png\" class=\"hidden\" /></a></span>" +
//							"</div>" +
//							"<div class=\"summary collapsed" + ((mail.summary == null || mail.summary.length == 0)?" hidden":"") + "\"><div id=\"" + mail.id + "_summary\" style=\"cursor: default\" onclick=\"getThread('" + accountId + "','" + mail.id + "')\">" + mail.summary + "</div></div>";
//						} else {
//							mailElement +=
//							"<div class=\"title hbox\">" + 
//								"<span><a href=\"javascript:starThread('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('starLinkTitle') + "\" class=\"star-link\" id=\"" + mail.id + "_star-link\"><img src=\"img/star_hover.png\" alt=\"" + i18n.get('starLinkTitle') + "\" class=\"hidden\"/></a><a href=\"javascript:openMail('" + accountId + "','" + mail.id + "');\" class=\"title-link\" title=\"" + i18n.get('openLinkTitle') + "\">" + mail.title + "</a></span>" +
//								"<span class=\"lowerright\"><a href=\"javascript:replyTo('" + accountId + "','" + mail.id + "');\" title=\"" + i18n.get('replyLinkTitle') + "\" class=\"reply-link\"><img src=\"img/reply.png\" alt=\"" + i18n.get('replyLinkTitle') + "\" class=\"hidden\" /></a></span>" +
//							"</div>";
//						}
//						/*"<span class=\"lowerright hidden\" id=\"" + mail.id + "_reply-link\">[<a href=\"javascript:showReply('" + mail.id + "');\" title=\"Write quick reply\">reply</a>]</span>" + */
//						/*"<div class=\"mailReply hidden\" id=\"" + mail.id + "_reply\">" +
//							"<textarea id=\"" + mail.id + "_replytext\" rows=\"5\" onKeyPress=\"replyTextKeyPress(event, '" + mail.id + "')\"></textarea>" +
//							"<span class=\"lowerright\"><a href=\"javascript:sendReply('" + mail.id + "');\" title=\"Send quick reply\">&raquo;&nbsp;Send (shift-enter)</a></span>" + 
//						"</div>" +*/
//					mailElement +=
//					"</div>" +
//				"</div>" +
//			"</div>";
//		
//		document.getElementById('mailBox_' + accountId).innerHTML += mailElement;
	});
}

// Hides a mail in the mailbox
function hideMail(accountId, mailid) {
   var accountElement = $('#inbox_' + accountId);
   $('#' + mailid).slideUp('fast');
   $('#' + mailid).removeClass('mail');

   if (accountElement.find('.mail').length == 0)
      accountElement.find('.toggleLink').hide('fast'); ;
}

// Shows a hidden mail in the mailbox
function showMail(mailid) {
	var mailElement = document.getElementById(mailid);
	if(mailElement != null) {
		mailElement.style.display = 'block';
	}
	
}

function replyTextKeyPress(event, mailid) {
	if(event.shiftKey == 1 && event.keyCode == 13) {
		// User pressed shift-enter inside textarea
		sendReply(mailid);
	}
}

function refreshMail() {
	 $.each(mailAccounts, function(i, account) {
		account.refreshInbox();
	});
	
	//window.location.reload();
	//history.go(0);
	init();
}

function openOptions() {
	chrome.tabs.create({url: "options.html"});
}

function resizeWindow() {
    var isExpanded = $('body').width() != 500;

    if (isExpanded)
        contractWindow(); 
    else
        expandWindow();  
}


var animationSpeed = 350;
var previousHeight;
function expandWindow() {
   previousHeight = $('body').height();

   $('body').animate({
      width: [750, 'swing'],
      height: [500, 'swing']
   }, animationSpeed);
}

function contractWindow() {
   $('body').animate({
      width: [500, 'swing'],
      height: [previousHeight, 'swing']
   }, animationSpeed, function () {
      $(this).height('auto');
   });

    previousHeight = 0;
}

$(document).ready(function () {
   var unreadCount = 0;
   allMail = new Array();
   $.each(mailAccounts, function (i, account) {
      unreadCount += account.getUnreadCount();
   });

   var previewSetting = localStorage["gc_preview_setting"];

   if (previewSetting == "0") {
      // Preview setting set to "Always off" =
      // Go to first mail inbox with unread items
      openInbox();
   }
   if (previewSetting == "1" && unreadCount == 0) {
      // Preview setting set to "Automatic" + no unread mail =
      // Go to first mail inbox
      openInbox(0);
   } else if (previewSetting == "2" && unreadCount == -1) {
      // Preview setting set to "Always on" + no mail found =
      // Display an error text
      $('#content').html("<br /><h3>Error</h3><p>No active account was found</p>" +
		    "<p><a href='https://mail.google.com/' target='_blank' title='Log in to Gmail'>Log in to Gmail</a></p>");
      $('#content').width(300);
      $('#content').css({ "textAlign": "center", "fontSize": "80%" });
   } else {
      backgroundPage.stopAnimateLoop();

      // Loop through each account and render it on the page
      $.each(mailAccounts, function (i, account) {
         account.getNewAt();
         account.id = i;

         // Render account
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
         inboxElement.find(".replyLink").click(function () { replyTo(account.id, $(this).attr('mailId')); });
         inboxElement.find(".openLink").click(function () { openMail(account.id, $(this).attr('mailId')); });


         inboxElement.find(".starLink").click(function () {
            $(this).find('img').css('visibility', 'hidden');
            starThread(account.id, $(this).attr('mailId'));
         });

      });

      // Add event handlers
      $(".inboxLink").click(function () { openInbox($(this).attr('accountId')); });
      $(".composeLink").click(function () { composeNew($(this).attr('accountId')); });
      $(".sendpageLink").click(function () { sendPage($(this).attr('accountId')); });

      // Should probably use jQuery for this
      document.getElementById('refresh').setAttribute('title', i18n.get('refreshLinkTitle'));
      document.getElementById('options').setAttribute('title', i18n.get('optionsLinkTitle'));
   }

   $(".summary.collapsed").hover(
        function () {
           if ($(this).hasClass('collapsed')) {
              $(this).addClass('highlight');
           }
        },
	    function () {
	       $(this).removeClass('highlight');
	    }
	);
});