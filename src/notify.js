var mailAccount;
var backgroundPage = chrome.extension.getBackgroundPage();
var Settings = backgroundPage.getSettings();

$(document).ready(function () {
   mailAccount = backgroundPage.accountWithNewestMail;
   mailAccount.id = backgroundPage.accounts.indexOf(mailAccount);
   var mail = backgroundPage.accountWithNewestMail.getNewestMail();
   var mailURL = backgroundPage.accountWithNewestMail.getURL();
   var profilePhotos = backgroundPage.profilePhotos;

   var fullDateTime = mail.issued.toLocaleString();
   var datetime = formatDateTime(mail.issued, i18n.selected_lang.months);

   var mailHtml = parseTemplate($("#MailTemplate").html(), {
      account: mailAccount,
      mail: mail,
      i18n: i18n
   });

   $('body').append(mailHtml);

   $('body').hover(function () {
      $(this).find('.hiddenSummaryActions').fadeIn('fast');
   }, function () {
      $(this).find('.hiddenSummaryActions').fadeOut('fast');
   });

   $('body').find(".readLink").click(function () { readMail(); });
   $('body').find(".deleteLink").click(function () { deleteMail(); });
   $('body').find(".spamLink").click(function () { spamMail(); });
   $('body').find(".archiveLink").click(function () { archiveMail(); });
   $('body').find(".openLink").click(function () { openMail(); });
   $('body').find(".inboxLink").click(function () { openInbox(); });

   $('body').find(".starLink").click(function () {
      $(this).css('opacity', '1');
      starMail();
   });
});

// Opens a mail and closes this window
function openMail() {
   window.close();
   mailAccount.openNewestMail();
}
// Marks mail as read and closes this window
function readMail() {
   window.close();
   mailAccount.readNewestMail();
}
// Deletes mail and closes this window
function deleteMail() {
   window.close();
   mailAccount.deleteNewestMail();
}
// Marks mail as spam and closes this window
function spamMail() {
   window.close();
   mailAccount.spamNewestMail();
}
// Archives mail and closes this window
function archiveMail() {
   window.close();
   mailAccount.archiveNewestMail();
}
// Star mail
function starMail() {
   mailAccount.starNewestMail();
}
// Star mail
function openInbox() {
   mailAccount.openInbox();
}