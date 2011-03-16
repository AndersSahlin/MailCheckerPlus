var mailUrl = "https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=";
var openInTab = false;

chrome.extension.sendRequest({ command: "getURL" }, function (response) {
   mailUrl = response.URL + "?view=cm&fs=1&tf=1&to=";
   openInTab = response.openTab;
   setTimeout('rewriteMailtosOnPage()', 500);
   setTimeout('rewriteMailtosOnPage()', 5000);
});

function rewriteMailtoToGMailUrl(inUrl) {
   var retUrl = inUrl;
   var subject = retUrl.match(/subject=([^&]*)/i);
   if (subject != null) {
      subject = encodeURIComponent(unescape(subject[1]));
      retUrl = retUrl.replace(/subject=([^&]*)/i, "su=" + subject);
   }
   retUrl = retUrl.replace("?", "&");
   retUrl = retUrl.replace(/CC=/i, "cc=");
   retUrl = retUrl.replace(/BCC=/i, "bcc=");
   retUrl = retUrl.replace(/Body=/i, "body=");
   retUrl = retUrl.replace(/mailto:/i, mailUrl);
   return retUrl;
}

// Content Scripts
function rewriteMailtosOnPage() {
   // Find all the mailto links.
   var xpath = "//a[contains(" +
                  "translate(@href," +
                     "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
                     "'abcdefghijklmnopqrstuvwxyz')," +
               "'mailto:')]";

   var result = document.evaluate(
      xpath,
      document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

   var item;
   var nodes = [];
   // cannot change the NODE_ITERATOR nodes' attributes in this loop itself
   // since iterateNext will invalidate the state; Need to store temporarily.
   while (item = result.iterateNext()) {
      nodes.push(item);
   }

   for (var i = 0; i < nodes.length; i++) {
      var mailto_url = nodes[i].getAttribute('href');
      gmail_url = rewriteMailtoToGMailUrl(mailto_url);
      nodes[i].setAttribute('title', "[GMCP] Compose a new mail to " + nodes[i].innerText);
      if (openInTab) {
         nodes[i].setAttribute('href', gmail_url);
         nodes[i].setAttribute('target', '_blank');
      } else {
         nodes[i].setAttribute('href', mailto_url);
         nodes[i].setAttribute('onclick', "window.open('" + gmail_url + "','Compose new message','width=640,height=480');return false");
      }
      nodes[i].setAttribute('rel', 'noreferrer');
   }
}

if (window == top) {
   //window.addEventListener("focus", rewriteMailtosOnPage);
}