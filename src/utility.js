function sortlist(lb) {
   var arrTexts = new Array();
   for (i = 0; i < lb.length; i++) {
      arrTexts[i] = lb.options[i].text + ':' + lb.options[i].value + ':' + lb.options[i].selected;
   }
   arrTexts.sort(charOrdA);
   for (i = 0; i < lb.length; i++) {
      var el = arrTexts[i].split(':');
      lb.options[i].text = el[0];
      lb.options[i].value = el[1];
      lb.options[i].selected = (el[2] == "true") ? true : false;
   }
}

function charOrdA(a, b) {
   a = a.toLowerCase();
   b = b.toLowerCase();
   if (a > b) return 1;
   if (a < b) return -1;
   return 0;
}